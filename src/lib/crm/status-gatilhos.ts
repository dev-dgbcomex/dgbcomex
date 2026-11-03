import { db } from "@/lib/db"
import { status, statusAcoes } from "@/lib/db/schema"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { notificacoes } from "@/lib/db/schema/notificacoes"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"
import { and, eq } from "drizzle-orm"
import { registrarLog } from "@/lib/log"
import { acaoPorValor } from "./status-acoes"

export type ContextoGatilho = {
  tipo: "OPORTUNIDADE" | "PROPOSTA"
  statusNome: string
  statusAnterior?: string | null
  oportunidadeId?: number | null
  propostaId?: number | null
  empresaId?: number | null
  responsavelId?: number | null
  titulo?: string | null
  usuarioNome?: string | null
}

export type ResultadoGatilhos = {
  executadas: string[]
  erros: string[]
}

export async function vincularEmpresaComoCliente(empresaId: number): Promise<boolean> {
  const [empresa] = await db.select().from(crmPessoas).where(eq(crmPessoas.id, empresaId)).limit(1)

  if (!empresa || !empresa.cnpj) return false
  if (empresa.clienteId) return true

  const [existente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.cnpj, empresa.cnpj))
    .limit(1)

  if (existente) {
    await db
      .update(crmPessoas)
      .set({ clienteId: existente.id, updatedAt: new Date() })
      .where(eq(crmPessoas.id, empresaId))
    return true
  }

  const [novoCliente] = await db
    .insert(clientes)
    .values({
      nome: empresa.nomeFantasia || empresa.razaoSocial || "",
      cnpj: empresa.cnpj!,
      razaoSocial: empresa.razaoSocial || "",
    })
    .returning()

  await db
    .update(crmPessoas)
    .set({ clienteId: novoCliente.id, updatedAt: new Date() })
    .where(eq(crmPessoas.id, empresaId))

  return true
}

async function criarPedidoVenda(contexto: ContextoGatilho, parametros: Record<string, any>) {
  if (!contexto.oportunidadeId) return false

  const [pedido] = await db
    .insert(crmPedidosVenda)
    .values({
      oportunidadeId: contexto.oportunidadeId,
      status: String(parametros.status || "ABERTO").toUpperCase(),
      observacao:
        String(parametros.observacao || "").trim() ||
        `Pedido gerado pelo gatilho do status ${contexto.statusNome}`,
      origem: "AUTOMATICA",
    })
    .returning()

  await registrarLog({
    tipo: "CADASTRO",
    acao: "criar",
    descricao: `Pedido de venda #${pedido.id} criado pelo gatilho do status ${contexto.statusNome}`,
    entidade: "CrmPedidoVenda",
    entidadeId: pedido.id,
    usuarioNome: contexto.usuarioNome || null,
  })

  return true
}

async function notificarResponsavel(contexto: ContextoGatilho, parametros: Record<string, any>) {
  if (!contexto.responsavelId) return false

  const link =
    contexto.tipo === "OPORTUNIDADE"
      ? `/comercial/crm/oportunidades/${contexto.oportunidadeId}`
      : `/comercial/crm/propostas/${contexto.propostaId}`

  const mensagem =
    String(parametros.mensagem || "").trim() ||
    `${contexto.tipo === "OPORTUNIDADE" ? "Oportunidade" : "Proposta"} "${contexto.titulo || ""}" movida para ${contexto.statusNome}`

  await db.insert(notificacoes).values({
    tipo: `${contexto.tipo}_GATILHO`,
    mensagem,
    usuarioId: contexto.responsavelId,
    usuarioNome: contexto.usuarioNome || null,
    link,
  })

  return true
}

async function registrarTimeline(contexto: ContextoGatilho, parametros: Record<string, any>) {
  if (!contexto.empresaId) return false

  const descricao =
    String(parametros.mensagem || "").trim() ||
    `${contexto.tipo === "OPORTUNIDADE" ? "Oportunidade" : "Proposta"} movida para ${contexto.statusNome}`

  await db.insert(crmTimelineEventos).values({
    empresaId: contexto.empresaId,
    tipo: contexto.tipo === "OPORTUNIDADE" ? "OPORTUNIDADE" : "PROPOSTA",
    descricao,
    metadados: {
      statusAnterior: contexto.statusAnterior || null,
      statusNovo: contexto.statusNome,
      origem: "GATILHO",
    },
  })

  return true
}

async function executarAcao(
  acao: string,
  contexto: ContextoGatilho,
  parametros: Record<string, any>
) {
  switch (acao) {
    case "VIRAR_CLIENTE":
      return contexto.empresaId ? vincularEmpresaComoCliente(contexto.empresaId) : false
    case "CRIAR_PEDIDO_VENDA":
      return criarPedidoVenda(contexto, parametros)
    case "NOTIFICAR_RESPONSAVEL":
      return notificarResponsavel(contexto, parametros)
    case "REGISTRAR_TIMELINE":
      return registrarTimeline(contexto, parametros)
    default:
      return false
  }
}

/**
 * Executa os gatilhos (ações) cadastrados para o status informado.
 * Falhas de uma ação não interrompem as demais nem a mudança de status.
 */
export async function executarGatilhos(contexto: ContextoGatilho): Promise<ResultadoGatilhos> {
  const resultado: ResultadoGatilhos = { executadas: [], erros: [] }

  const [statusRow] = await db
    .select({ id: status.id })
    .from(status)
    .where(and(eq(status.nome, contexto.statusNome), eq(status.tipo, contexto.tipo)))
    .limit(1)

  if (!statusRow) return resultado

  const acoes = await db.select().from(statusAcoes).where(eq(statusAcoes.statusId, statusRow.id))

  for (const acao of acoes) {
    if (acao.ativo === false) continue
    if (!acaoPorValor(acao.acao)) continue

    try {
      const executou = await executarAcao(
        acao.acao,
        contexto,
        (acao.parametros || {}) as Record<string, any>
      )
      if (executou) resultado.executadas.push(acao.acao)
    } catch (erro) {
      console.error(`[gatilho ${acao.acao}]`, erro)
      resultado.erros.push(acao.acao)
    }
  }

  return resultado
}
