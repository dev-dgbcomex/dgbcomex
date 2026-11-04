import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { clientes } from "@/lib/db/schema/clientes"
import { registrarLog } from "@/lib/notificar"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { inserirTimelineEvento } from "@/lib/crm-timeline"

export class PromocaoErro extends Error {
  status: number
  constructor(mensagem: string, status = 400) {
    super(mensagem)
    this.status = status
  }
}

export type ResumoPromocao = {
  oportunidades: number
  propostas: number
  visitas: number
  valorPropostas: number
  valorOportunidades: number
}

export type ResultadoPromocao = {
  pessoa: typeof crmPessoas.$inferSelect
  clienteId: number
  clienteCriado: boolean
  resumo: ResumoPromocao
}

export async function promoverPessoaParaCliente(params: {
  pessoaId: number
  usuarioId?: number | null
  usuarioNome?: string | null
  notificarEquipe?: boolean
}): Promise<ResultadoPromocao> {
  const { pessoaId } = params

  const [pessoa] = await db.select().from(crmPessoas).where(eq(crmPessoas.id, pessoaId)).limit(1)

  if (!pessoa) {
    throw new PromocaoErro("Pessoa não encontrada", 404)
  }

  if (pessoa.promovidaCliente) {
    throw new PromocaoErro("Esta pessoa já foi transformada em cliente", 409)
  }

  const cnpj = (pessoa.cnpj || "").replace(/\D/g, "")
  if (!cnpj) {
    throw new PromocaoErro("A pessoa precisa ter CNPJ cadastrado para virar cliente", 400)
  }

  const nomePessoa = pessoa.nome || pessoa.razaoSocial || pessoa.nomeFantasia || "Pessoa"

  const [oportunidades] = await db
    .select({
      total: sql<number>`count(*)::int`,
      valor: sql<number>`coalesce(sum(${crmOportunidades.valorEstimado}), 0)`,
    })
    .from(crmOportunidades)
    .where(eq(crmOportunidades.empresaId, pessoaId))

  const [propostas] = await db
    .select({
      total: sql<number>`count(*)::int`,
      valor: sql<number>`coalesce(sum(${crmPropostas.valor}), 0)`,
    })
    .from(crmPropostas)
    .where(eq(crmPropostas.empresaId, pessoaId))

  const [visitas] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(crmVisitas)
    .where(eq(crmVisitas.empresaId, pessoaId))

  let clienteId = pessoa.clienteId
  let clienteCriado = false

  if (!clienteId) {
    const [clienteExistente] = await db
      .select()
      .from(clientes)
      .where(eq(clientes.cnpj, cnpj))
      .limit(1)

    if (clienteExistente) {
      clienteId = clienteExistente.id
    } else {
      const [novoCliente] = await db
        .insert(clientes)
        .values({
          nome: pessoa.nomeFantasia || pessoa.razaoSocial || pessoa.nome || "Cliente",
          cnpj,
          razaoSocial: pessoa.razaoSocial || null,
          email: pessoa.email || null,
          emailNf: pessoa.emailNf || null,
          telefone: pessoa.telefone || null,
          celular: pessoa.celular || null,
          segmento: pessoa.segmento || null,
          endereco: pessoa.endereco || null,
          cidade: pessoa.cidade || null,
          uf: pessoa.uf || null,
        })
        .returning()
      clienteId = novoCliente.id
      clienteCriado = true
    }
  }

  const quando = new Date()
  const [atualizada] = await db
    .update(crmPessoas)
    .set({
      clienteId,
      promovidaCliente: true,
      promovidoEm: quando,
      promovidoPor: params.usuarioId ?? null,
      promovidoPorNome: params.usuarioNome ?? null,
      status: "CONVERTIDO_CLIENTE",
      updatedAt: quando,
    })
    .where(eq(crmPessoas.id, pessoaId))
    .returning()

  // O negócio da pessoa passa a ser do cliente (oportunidades, propostas e
  // visitas), para aparecer na tela do cliente e nos relatórios do CRM.
  await db
    .update(crmOportunidades)
    .set({ clienteId })
    .where(eq(crmOportunidades.empresaId, pessoaId))
  await db.update(crmPropostas).set({ clienteId }).where(eq(crmPropostas.empresaId, pessoaId))
  await db.update(crmVisitas).set({ clienteId }).where(eq(crmVisitas.empresaId, pessoaId))

  const resumo: ResumoPromocao = {
    oportunidades: oportunidades?.total || 0,
    propostas: propostas?.total || 0,
    visitas: visitas?.total || 0,
    valorPropostas: Number(propostas?.valor || 0),
    valorOportunidades: Number(oportunidades?.valor || 0),
  }

  await registrarLog({
    tipo: "ATUALIZACAO",
    acao: "promover_cliente",
    descricao: `Pessoa "${nomePessoa}" transformada em cliente`,
    entidade: "CrmPessoa",
    entidadeId: pessoaId,
    usuarioId: params.usuarioId ?? null,
    usuarioNome: params.usuarioNome ?? null,
    dados: {
      clienteId,
      cnpj,
      clienteCriado,
      oportunidades: resumo.oportunidades,
      propostas: resumo.propostas,
      visitas: resumo.visitas,
    },
  })

  await inserirTimelineEvento({
    empresaId: pessoaId,
    clienteId,
    tipo: "CONVERSAO_CLIENTE",
    descricao: `Transformada em cliente por ${params.usuarioNome || "usuário não identificado"}`,
    metadados: {
      clienteId,
      porUsuarioNome: params.usuarioNome || null,
      porUsuarioId: params.usuarioId ?? null,
      oportunidades: resumo.oportunidades,
      propostas: resumo.propostas,
      visitas: resumo.visitas,
    },
  })

  await registrarLog({
    tipo: "CADASTRO",
    acao: "promover_cliente",
    descricao: `Cliente "${
      pessoa.nomeFantasia || pessoa.razaoSocial || pessoa.nome || "Cliente"
    }" criado a partir da pessoa "${nomePessoa}"`,
    entidade: "CrmCliente",
    entidadeId: clienteId,
    usuarioId: params.usuarioId ?? null,
    usuarioNome: params.usuarioNome ?? null,
  })

  if (params.notificarEquipe !== false) {
    await notificarAtividadeComercial({
      acao: `transformou a pessoa "${nomePessoa}" em cliente`,
      entidade: "Pessoa",
      registro: nomePessoa,
      link: `/comercial/crm/pessoas/${pessoaId}`,
      usuarioNome: params.usuarioNome || null,
      usuarioId: params.usuarioId ?? null,
    })
  }

  return { pessoa: atualizada, clienteId, clienteCriado, resumo }
}
