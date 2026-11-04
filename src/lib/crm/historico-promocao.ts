import { and, desc, eq, gte, lte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { clientes } from "@/lib/db/schema/clientes"

export type OrigemPromocao = "promocao" | "vinculo_anterior"

export type HistoricoPromocao = {
  pessoaId: number
  nomePessoa: string
  dataPessoa: string | null
  clienteId: number | null
  clienteNome: string | null
  virouClienteEm: string | null
  porUsuario: string | null
  origem: OrigemPromocao
  oportunidades: number
  propostas: number
  visitas: number
  valorPropostas: number
  valorOportunidades: number
}

export type LinhaConversao = {
  id: number
  dataHora: string | null
  pessoa: string
  cliente: string
  porUsuario: string
  oportunidades: number
  propostas: number
  visitas: number
  valorPropostas: number
  origem: OrigemPromocao
}

export type FiltrosConversoes = {
  de?: Date
  ate?: Date
  usuario?: string | null
}

function nomePessoa(p: {
  nome?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
}): string {
  return p.nome || p.razaoSocial || p.nomeFantasia || "Pessoa"
}

export async function consultarHistoricoPromocao(
  clienteId: number
): Promise<HistoricoPromocao | null> {
  const [pessoa] = await db
    .select({
      id: crmPessoas.id,
      nome: crmPessoas.nome,
      razaoSocial: crmPessoas.razaoSocial,
      nomeFantasia: crmPessoas.nomeFantasia,
      createdAt: crmPessoas.createdAt,
      promovidaCliente: crmPessoas.promovidaCliente,
      promovidoEm: crmPessoas.promovidoEm,
      promovidoPorNome: crmPessoas.promovidoPorNome,
      clienteId: crmPessoas.clienteId,
    })
    .from(crmPessoas)
    .where(eq(crmPessoas.clienteId, clienteId))
    .limit(1)

  if (!pessoa) return null

  const [cliente] = await db
    .select({ nome: clientes.nome, createdAt: clientes.createdAt })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1)

  const [oportunidades] = await db
    .select({
      total: sql<number>`count(*)::int`,
      valor: sql<number>`coalesce(sum(${crmOportunidades.valorEstimado}), 0)`,
    })
    .from(crmOportunidades)
    .where(eq(crmOportunidades.empresaId, pessoa.id))

  const [propostas] = await db
    .select({
      total: sql<number>`count(*)::int`,
      valor: sql<number>`coalesce(sum(${crmPropostas.valor}), 0)`,
    })
    .from(crmPropostas)
    .where(eq(crmPropostas.empresaId, pessoa.id))

  const [visitas] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(crmVisitas)
    .where(eq(crmVisitas.empresaId, pessoa.id))

  const virouClienteEm = pessoa.promovidoEm || cliente?.createdAt || null
  const origem: OrigemPromocao = pessoa.promovidoEm ? "promocao" : "vinculo_anterior"

  return {
    pessoaId: pessoa.id,
    nomePessoa: nomePessoa(pessoa),
    dataPessoa: pessoa.createdAt ? new Date(pessoa.createdAt).toISOString() : null,
    clienteId: pessoa.clienteId,
    clienteNome: cliente?.nome || null,
    virouClienteEm: virouClienteEm ? new Date(virouClienteEm).toISOString() : null,
    porUsuario: pessoa.promovidoPorNome || null,
    origem,
    oportunidades: oportunidades?.total || 0,
    propostas: propostas?.total || 0,
    visitas: visitas?.total || 0,
    valorPropostas: Number(propostas?.valor || 0),
    valorOportunidades: Number(oportunidades?.valor || 0),
  }
}

export async function listarConversoes(filtros: FiltrosConversoes): Promise<LinhaConversao[]> {
  const condicoes = [eq(crmPessoas.promovidaCliente, true)]
  if (filtros.de) condicoes.push(gte(crmPessoas.promovidoEm, filtros.de))
  if (filtros.ate) condicoes.push(lte(crmPessoas.promovidoEm, filtros.ate))
  if (filtros.usuario) condicoes.push(eq(crmPessoas.promovidoPorNome, filtros.usuario))

  const linhas = await db
    .select({
      id: crmPessoas.id,
      nome: crmPessoas.nome,
      razaoSocial: crmPessoas.razaoSocial,
      nomeFantasia: crmPessoas.nomeFantasia,
      promovidoEm: crmPessoas.promovidoEm,
      promovidoPorNome: crmPessoas.promovidoPorNome,
      clienteId: crmPessoas.clienteId,
      clienteNome: clientes.nome,
    })
    .from(crmPessoas)
    .leftJoin(clientes, eq(crmPessoas.clienteId, clientes.id))
    .where(and(...condicoes))
    .orderBy(desc(crmPessoas.promovidoEm))

  if (linhas.length === 0) return []

  const ids = (linhas as any[]).map((l: any) => l.id)
  const [opps, props, visits] = await Promise.all([
    db
      .select({
        empresaId: crmOportunidades.empresaId,
        total: sql<number>`count(*)::int`,
        valor: sql<number>`coalesce(sum(${crmOportunidades.valorEstimado}), 0)`,
      })
      .from(crmOportunidades)
      .where(sql`${crmOportunidades.empresaId} in ${ids}`)
      .groupBy(crmOportunidades.empresaId),
    db
      .select({
        empresaId: crmPropostas.empresaId,
        total: sql<number>`count(*)::int`,
        valor: sql<number>`coalesce(sum(${crmPropostas.valor}), 0)`,
      })
      .from(crmPropostas)
      .where(sql`${crmPropostas.empresaId} in ${ids}`)
      .groupBy(crmPropostas.empresaId),
    db
      .select({
        empresaId: crmVisitas.empresaId,
        total: sql<number>`count(*)::int`,
      })
      .from(crmVisitas)
      .where(sql`${crmVisitas.empresaId} in ${ids}`)
      .groupBy(crmVisitas.empresaId),
  ])

  const oppMap = new Map<number, any>((opps as any[]).map((o: any) => [o.empresaId, o]))
  const propMap = new Map<number, any>((props as any[]).map((p: any) => [p.empresaId, p]))
  const visitMap = new Map<number, any>((visits as any[]).map((v: any) => [v.empresaId, v]))

  return (linhas as any[]).map((l: any) => ({
    id: l.id,
    dataHora: l.promovidoEm ? new Date(l.promovidoEm).toISOString() : null,
    pessoa: nomePessoa(l),
    cliente: l.clienteNome || "—",
    porUsuario: l.promovidoPorNome || "Não registrado",
    oportunidades: oppMap.get(l.id)?.total || 0,
    propostas: propMap.get(l.id)?.total || 0,
    visitas: visitMap.get(l.id)?.total || 0,
    valorPropostas: Number(propMap.get(l.id)?.valor || 0),
    origem: l.promovidoEm ? "promocao" : "vinculo_anterior",
  }))
}
