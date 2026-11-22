import { and, eq, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { registrarLog, notificar } from "@/lib/notificar"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { executarGatilhos } from "@/lib/crm/status-gatilhos"
import { promoverLeadParaCliente } from "@/lib/crm/promover-cliente"

export type EntidadeAutomacao =
  | "LEAD"
  | "OPORTUNIDADE"
  | "PROPOSTA"
  | "PEDIDO_VENDA"
  | "FATURAMENTO"

export type AcaoAutomacao =
  | "CRIAR"
  | "ALTERAR_STATUS"
  | "VINCULAR_ERP"
  | "SINCRONIZAR_ERP"
  | "EXCLUIR"
  | "VERIFICAR_FATURAMENTO"

export type DecisaoAutomacao =
  | "PERDER_LEAD"
  | "NOVA_OPORTUNIDADE"
  | "ARQUIVAR"
  | "DESARQUIVAR"
  | "CONVERTER"

export type DecisaoPendente = {
  codigo: string
  mensagem: string
  opcoes: Array<{ valor: DecisaoAutomacao; rotulo: string; descricao?: string }>
  contexto: Record<string, unknown>
}

export type ResultadoAutomacao = {
  ok: boolean
  entidade: EntidadeAutomacao
  entidadeId: number
  acao: AcaoAutomacao
  statusAnterior: string | null
  statusNovo: string | null
  registro: Record<string, unknown>
  decisaoPendente?: DecisaoPendente
  bloqueio?: string
  avisos: string[]
  efeitos: {
    log: boolean
    timeline: string[]
    notificacoes: string[]
  }
  gatilhos: {
    executadas: string[]
    puladas: string[]
    erros: string[]
  }
}

type Autor = { id?: number | null; nome?: string | null }

export type EntradaAutomacao = {
  entidade: EntidadeAutomacao
  entidadeId: number
  acao: AcaoAutomacao
  statusAnterior?: string | null
  statusNovo?: string | null
  motivoPerda?: string | null
  decisao?: DecisaoAutomacao | null
  autor?: Autor
  origem?: string
  titulo?: string | null
  contexto?: Record<string, unknown>
}

function base(entrada: EntradaAutomacao): ResultadoAutomacao {
  return {
    ok: true,
    entidade: entrada.entidade,
    entidadeId: entrada.entidadeId,
    acao: entrada.acao,
    statusAnterior: entrada.statusAnterior ?? null,
    statusNovo: entrada.statusNovo ?? null,
    registro: {},
    avisos: [],
    efeitos: { log: false, timeline: [], notificacoes: [] },
    gatilhos: { executadas: [], puladas: [], erros: [] },
  }
}

function bloqueado(entrada: EntradaAutomacao, mensagem: string): ResultadoAutomacao {
  return { ...base(entrada), ok: false, bloqueio: mensagem }
}

async function registrarEfeitos(
  resultado: ResultadoAutomacao,
  params: {
    entidade: string
    entidadeId: number
    acao: string
    descricao: string
    link: string
    tipoNotificacao: string
    titulo: string
    usuarioNome?: string | null
    usuarioId?: number | null
    empresaId?: number | null
    clienteId?: number | null
  }
) {
  await registrarLog({
    tipo: "ATUALIZACAO",
    acao: params.acao,
    descricao: params.descricao,
    entidade: params.entidade,
    entidadeId: params.entidadeId,
    usuarioNome: params.usuarioNome ?? null,
  })
  resultado.efeitos.log = true

  if (params.empresaId) {
    await inserirTimelineEvento({
      empresaId: params.empresaId,
      clienteId: params.clienteId ?? undefined,
      tipo: params.entidade === "CrmLead" ? "LEAD" : "OPORTUNIDADE",
      descricao: params.descricao,
      metadados: {
        statusAnterior: resultado.statusAnterior,
        statusNovo: resultado.statusNovo,
        origem: "AUTOMACAO",
      },
    })
    resultado.efeitos.timeline.push(params.descricao)
  }

  await notificar(params.tipoNotificacao, params.descricao, params.link, params.usuarioNome ?? null)
  resultado.efeitos.notificacoes.push(params.tipoNotificacao)

  if (params.usuarioId && params.usuarioNome) {
    await notificarAtividadeComercial({
      acao: params.acao,
      entidade: params.entidade,
      registro: params.titulo,
      link: params.link,
      usuarioNome: params.usuarioNome,
      usuarioId: params.usuarioId,
    })
  }
}

async function contarOportunidadesLead(leadId: number, excetoId?: number) {
  const condicoes = [eq(crmOportunidades.empresaId, leadId)]
  if (excetoId) condicoes.push(ne(crmOportunidades.id, excetoId))
  const linhas = await db
    .select({ id: crmOportunidades.id })
    .from(crmOportunidades)
    .where(and(...condicoes))
  return linhas.length
}

async function processarStatusLead(entrada: EntradaAutomacao): Promise<ResultadoAutomacao> {
  const resultado = base(entrada)
  const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, entrada.entidadeId)).limit(1)
  if (!lead) return bloqueado(entrada, "Lead não encontrada")

  const statusNovo = entrada.statusNovo ?? lead.status
  resultado.statusAnterior = lead.status
  resultado.statusNovo = statusNovo

  if (statusNovo === "QUALIFICADO") {
    const total = await contarOportunidadesLead(lead.id)
    if (total === 0) {
      return bloqueado(entrada, "Crie uma oportunidade antes de qualificar esta lead")
    }
  }

  if (statusNovo === "POSSIVEL_CLIENTE") {
    const ganhas = await db
      .select({ id: crmOportunidades.id })
      .from(crmOportunidades)
      .where(
        and(
          eq(crmOportunidades.empresaId, lead.id),
          eq(crmOportunidades.status, "FECHADO_GANHO")
        )
      )
    if (ganhas.length === 0) {
      return bloqueado(entrada, "A lead só vai para Possível Cliente com uma oportunidade ganha")
    }
  }

  if (statusNovo === "CONVERTIDO_CLIENTE" && !lead.promovidaCliente) {
    if (entrada.decisao !== "CONVERTER") {
      return bloqueado(entrada, "Use o botão Tornar cliente para converter a lead")
    }
    const promocao = await promoverLeadParaCliente({
      pessoaId: lead.id,
      usuarioId: entrada.autor?.id ?? null,
      usuarioNome: entrada.autor?.nome ?? null,
      notificarEquipe: false,
    })
    resultado.registro = promocao.pessoa as unknown as Record<string, unknown>
    resultado.avisos.push("Lead convertida em cliente")
    return resultado
  }

  const deveArquivar =
    (statusNovo === "PERDIDO" || statusNovo === "INATIVO") && entrada.decisao !== "DESARQUIVAR"
  const agora = new Date()
  const [atualizada] = await db
    .update(crmLeads)
    .set({
      status: statusNovo,
      arquivado: deveArquivar,
      arquivadoEm: deveArquivar ? agora : null,
      arquivadoPor: deveArquivar ? entrada.autor?.id ?? null : null,
      arquivadoPorNome: deveArquivar ? entrada.autor?.nome ?? null : null,
      updatedAt: agora,
    })
    .where(eq(crmLeads.id, lead.id))
    .returning()

  resultado.registro = atualizada as unknown as Record<string, unknown>
  if (deveArquivar) resultado.avisos.push("Lead arquivada")
  if (entrada.decisao === "DESARQUIVAR" || (lead.arquivado && !deveArquivar)) {
    resultado.avisos.push("Lead desarquivada")
  }

  await registrarEfeitos(resultado, {
    entidade: "CrmLead",
    entidadeId: lead.id,
    acao: "alterar_status",
    descricao: `Lead movida para ${statusNovo}`,
    link: `/comercial/crm/leads/${lead.id}`,
    tipoNotificacao: "LEAD_ATUALIZADO",
    titulo: lead.nome || lead.razaoSocial || "Lead",
    usuarioNome: entrada.autor?.nome,
    usuarioId: entrada.autor?.id,
    empresaId: lead.id,
  })

  return resultado
}

async function processarStatusOportunidade(entrada: EntradaAutomacao): Promise<ResultadoAutomacao> {
  const resultado = base(entrada)
  const [oportunidade] = await db
    .select()
    .from(crmOportunidades)
    .where(eq(crmOportunidades.id, entrada.entidadeId))
    .limit(1)

  if (!oportunidade) return bloqueado(entrada, "Oportunidade não encontrada")

  const statusBruto = entrada.statusNovo ?? oportunidade.status
  const statusNovo = statusBruto === "GANHO" ? "FECHADO_GANHO" : statusBruto
  resultado.statusAnterior = oportunidade.status
  resultado.statusNovo = statusNovo

  if (statusNovo === oportunidade.status && statusNovo !== "FECHADO_PERDIDO") {
    resultado.avisos.push("Status inalterado")
    resultado.registro = oportunidade as unknown as Record<string, unknown>
    return resultado
  }

  const leadId = oportunidade.empresaId
  const [lead] = leadId
    ? await db.select().from(crmLeads).where(eq(crmLeads.id, leadId)).limit(1)
    : [undefined]

  if (statusNovo === "FECHADO_GANHO") {
    const pedidos = await db
      .select({ id: crmPedidosVenda.id })
      .from(crmPedidosVenda)
      .where(
        and(
          eq(crmPedidosVenda.oportunidadeId, oportunidade.id),
          eq(crmPedidosVenda.origem, "ERP")
        )
      )
    if (pedidos.length === 0) {
      return bloqueado(
        entrada,
        "Vincule um pedido do ERP antes de marcar a oportunidade como ganha"
      )
    }
  }

  let totalOutras = 0
  if (statusNovo === "FECHADO_PERDIDO") {
    if (!entrada.motivoPerda) return bloqueado(entrada, "Motivo da perda é obrigatório")
    if (leadId) totalOutras = await contarOportunidadesLead(leadId, oportunidade.id)

    if (totalOutras === 0 && lead && !lead.promovidaCliente && !entrada.decisao) {
      return {
        ...resultado,
        ok: false,
        decisaoPendente: {
          codigo: "PERDA_ULTIMA_OPORTUNIDADE",
          mensagem: `Esta é a última oportunidade da lead ${lead.nome || lead.razaoSocial || "sem nome"}. O que deseja fazer?`,
          opcoes: [
            {
              valor: "PERDER_LEAD",
              rotulo: "Perder a lead",
              descricao: "A lead ficará com status Perdido e continuará visível para consulta.",
            },
            {
              valor: "NOVA_OPORTUNIDADE",
              rotulo: "Manter Qualificado",
              descricao: "O sistema cria uma nova oportunidade e mantém a lead qualificada.",
            },
          ],
          contexto: { leadId: lead.id, oportunidadeId: oportunidade.id },
        },
      }
    }
  }

  const agora = new Date()
  const [atualizada] = await db
    .update(crmOportunidades)
    .set({
      status: statusNovo,
      motivoPerda: statusNovo === "FECHADO_PERDIDO" ? entrada.motivoPerda : null,
      updatedAt: agora,
    })
    .where(eq(crmOportunidades.id, oportunidade.id))
    .returning()

  resultado.registro = atualizada as unknown as Record<string, unknown>

  if (statusNovo === "FECHADO_GANHO" && lead && !lead.promovidaCliente) {
    await db
      .update(crmLeads)
      .set({ status: "POSSIVEL_CLIENTE", arquivado: false, updatedAt: agora })
      .where(eq(crmLeads.id, lead.id))
    resultado.avisos.push("Lead movida para Possível Cliente")
  }

  if (statusNovo === "FECHADO_PERDIDO" && lead && !lead.promovidaCliente) {
    if (entrada.decisao === "PERDER_LEAD") {
      await db
        .update(crmLeads)
        .set({
          status: "PERDIDO",
          arquivado: false,
          arquivadoEm: null,
          arquivadoPor: null,
          arquivadoPorNome: null,
          updatedAt: agora,
        })
        .where(eq(crmLeads.id, lead.id))
      resultado.avisos.push("Lead marcada como Perdida")
    }

    if (entrada.decisao === "NOVA_OPORTUNIDADE") {
      await db.insert(crmOportunidades).values({
        titulo: `Nova oportunidade - ${oportunidade.titulo}`,
        descricao: "Oportunidade criada automaticamente após a perda da anterior",
        empresaId: oportunidade.empresaId,
        leadId: oportunidade.leadId,
        clienteId: oportunidade.clienteId,
        contatoId: oportunidade.contatoId,
        responsavelId: oportunidade.responsavelId,
        status: "NOVO",
        probabilidade: 0,
      })
      await db
        .update(crmLeads)
        .set({ status: "QUALIFICADO", arquivado: false, updatedAt: agora })
        .where(eq(crmLeads.id, lead.id))
      resultado.avisos.push("Nova oportunidade criada e lead mantida como Qualificada")
    }

    if (totalOutras > 0) {
      resultado.avisos.push(`A lead continua com ${totalOutras} oportunidade(s) ativa(s)`)
    }
  }

  const gatilhos = await executarGatilhos(
    {
      tipo: "OPORTUNIDADE",
      statusNome: statusNovo,
      statusAnterior: oportunidade.status,
      oportunidadeId: oportunidade.id,
      empresaId: oportunidade.empresaId,
      responsavelId: oportunidade.responsavelId,
      titulo: oportunidade.titulo,
      usuarioNome: entrada.autor?.nome ?? null,
    },
    { pularAcoes: ["VIRAR_CLIENTE", "CRIAR_PEDIDO_VENDA"] }
  )
  resultado.gatilhos = gatilhos

  await registrarEfeitos(resultado, {
    entidade: "CrmOportunidade",
    entidadeId: oportunidade.id,
    acao: "alterar_status",
    descricao:
      statusNovo === "FECHADO_PERDIDO"
        ? `Oportunidade "${oportunidade.titulo}" perdida: ${entrada.motivoPerda}`
        : `Oportunidade "${oportunidade.titulo}" movida para ${statusNovo}`,
    link: `/comercial/crm/oportunidades/${oportunidade.id}`,
    tipoNotificacao: "OPORTUNIDADE_STATUS",
    titulo: oportunidade.titulo,
    usuarioNome: entrada.autor?.nome,
    usuarioId: entrada.autor?.id,
    empresaId: oportunidade.empresaId,
    clienteId: oportunidade.clienteId,
  })

  return resultado
}

async function processarCriacaoOportunidade(entrada: EntradaAutomacao): Promise<ResultadoAutomacao> {
  const resultado = base(entrada)
  const empresaId = Number(entrada.contexto?.empresaId || 0)
  if (!empresaId) return resultado

  const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, empresaId)).limit(1)
  if (!lead || lead.promovidaCliente || lead.arquivado) return resultado
  if (!["NOVO", "PERDIDO", "INATIVO"].includes(lead.status)) return resultado

  await db
    .update(crmLeads)
    .set({ status: "QUALIFICADO", arquivado: false, updatedAt: new Date() })
    .where(eq(crmLeads.id, lead.id))
  resultado.avisos.push("Lead qualificada automaticamente pela nova oportunidade")

  await registrarEfeitos(resultado, {
    entidade: "CrmLead",
    entidadeId: lead.id,
    acao: "qualificar_automaticamente",
    descricao: `Lead qualificada pela oportunidade #${entrada.entidadeId}`,
    link: `/comercial/crm/leads/${lead.id}`,
    tipoNotificacao: "LEAD_ATUALIZADO",
    titulo: lead.nome || lead.razaoSocial || "Lead",
    usuarioNome: entrada.autor?.nome,
    usuarioId: entrada.autor?.id,
    empresaId: lead.id,
  })

  return resultado
}

export async function processarAutomacaoCRM(
  entrada: EntradaAutomacao
): Promise<ResultadoAutomacao> {
  if (entrada.entidade === "LEAD" && entrada.acao === "ALTERAR_STATUS") {
    return processarStatusLead(entrada)
  }
  if (entrada.entidade === "OPORTUNIDADE" && entrada.acao === "ALTERAR_STATUS") {
    return processarStatusOportunidade(entrada)
  }
  if (entrada.entidade === "OPORTUNIDADE" && entrada.acao === "CRIAR") {
    return processarCriacaoOportunidade(entrada)
  }

  const resultado = base(entrada)
  resultado.avisos.push("Nenhuma automação configurada para esta ação")
  return resultado
}
