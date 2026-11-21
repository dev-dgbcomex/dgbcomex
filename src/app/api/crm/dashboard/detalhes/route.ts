import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmVisitantes } from "@/lib/db/schema/crm-visitantes"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { crmTarefas } from "@/lib/db/schema/crm-tarefas"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"
import { crmPrevisaoVendas } from "@/lib/db/schema/crm-previsao-vendas"
import { clientes as clientesSchema } from "@/lib/db/schema/clientes"
import { and, asc, count, desc, eq, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

type DetalheItem = {
  id: number
  titulo: string
  subtitulo?: string | null
  detalhe?: string | null
  status?: string | null
  data?: string | null
  valor?: number | null
  href?: string | null
}

type ListaRow = {
  id: number
  titulo: string | null
  subtitulo?: string | null
  status: string | null
  data: Date | string | null
  valor?: string | number | null
}

type TopLeadRow = {
  empresaId: number | null
  clienteId: number | null
  leadFantasia: string | null
  leadRazao: string | null
  leadNome: string | null
  clienteNome: string | null
  totalValor: string | number | null
}

const BLOCOS = new Set([
  "leads",
  "clientes",
  "oportunidades",
  "visitas",
  "tarefas",
  "funil",
  "funil-leads",
  "funil-oportunidades",
  "funil-convertidas",
  "previsao-convertidas",
  "status",
  "top-leads",
  "recentes",
])

const TITULOS: Record<string, string> = {
  leads: "Leads (Negócios)",
  clientes: "Clientes",
  oportunidades: "Oportunidades",
  visitas: "Visitas",
  tarefas: "Tarefas",
  funil: "Pipeline (Funil)",
  "funil-leads": "Leads no funil",
  "funil-oportunidades": "Oportunidades no funil",
  "funil-convertidas": "Oportunidades convertidas",
  "previsao-convertidas": "Oportunidades convertidas",
  status: "Oportunidades por status",
  "top-leads": "Top Leads (Negócios)",
  recentes: "Atividades recentes",
}

const LISTAGENS: Record<string, string> = {
  leads: "/comercial/crm/leads",
  clientes: "/comercial/clientes",
  oportunidades: "/comercial/crm/oportunidades",
  visitas: "/comercial/crm/visitas",
  tarefas: "/comercial/crm/tarefas",
  funil: "/comercial/crm/oportunidades",
  "funil-leads": "/comercial/crm/leads",
  "funil-oportunidades": "/comercial/crm/oportunidades",
  "funil-convertidas": "/comercial/crm/oportunidades",
  "previsao-convertidas": "/comercial/crm/oportunidades",
  status: "/comercial/crm/oportunidades",
  "top-leads": "/comercial/crm/oportunidades",
  recentes: "/comercial/crm",
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  return String(valor)
}

function dataTexto(valor: unknown): string | null {
  if (!valor) return null
  if (valor instanceof Date) return valor.toISOString()
  return String(valor)
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error("[CRM Detalhes] Query failed:", error instanceof Error ? error.message : error)
    return fallback
  }
}

async function listarLeads(status: string | null, limite: number): Promise<DetalheItem[]> {
  let query = db
    .select({
      id: crmPessoas.id,
      titulo: sql<string>`COALESCE(NULLIF(${crmPessoas.nomeFantasia}, ''), NULLIF(${crmPessoas.razaoSocial}, ''), NULLIF(${crmPessoas.nome}, ''), 'Sem nome')`,
      subtitulo: sql<string>`COALESCE(NULLIF(${crmPessoas.cnpj}, ''), NULLIF(${crmPessoas.cpf}, ''), 'Sem documento')`,
      status: crmPessoas.status,
      data: crmPessoas.createdAt,
    })
    .from(crmPessoas)
  if (status) query = query.where(eq(crmPessoas.status, status))
  const rows = await query.orderBy(desc(crmPessoas.createdAt)).limit(limite)
  return (rows as ListaRow[]).map((row) => ({
    id: row.id,
    titulo: texto(row.titulo),
    subtitulo: row.subtitulo,
    status: row.status,
    data: dataTexto(row.data),
    href: `/comercial/crm/leads/${row.id}`,
  }))
}

async function listarClientes(limite: number): Promise<DetalheItem[]> {
  const rows = await db
    .select({
      id: clientesSchema.id,
      titulo: clientesSchema.nome,
      subtitulo: clientesSchema.cnpj,
      data: clientesSchema.createdAt,
    })
    .from(clientesSchema)
    .orderBy(desc(clientesSchema.createdAt))
    .limit(limite)
  return (rows as ListaRow[]).map((row) => ({
    id: row.id,
    titulo: texto(row.titulo),
    subtitulo: row.subtitulo,
    data: dataTexto(row.data),
    href: `/comercial/clientes/${row.id}`,
  }))
}

async function listarOportunidades(
  status: string | null,
  limite: number
): Promise<DetalheItem[]> {
  let query = db
    .select({
      id: crmOportunidades.id,
      titulo: crmOportunidades.titulo,
      status: crmOportunidades.status,
      valor: crmOportunidades.valorEstimado,
      data: crmOportunidades.createdAt,
    })
    .from(crmOportunidades)
  if (status) query = query.where(eq(crmOportunidades.status, status))
  const rows = await query.orderBy(desc(crmOportunidades.createdAt)).limit(limite)
  return (rows as ListaRow[]).map((row) => ({
    id: row.id,
    titulo: texto(row.titulo),
    status: row.status,
    valor: Number(row.valor ?? 0),
    data: dataTexto(row.data),
    href: `/comercial/crm/oportunidades/${row.id}`,
  }))
}

async function listarVisitas(limite: number): Promise<DetalheItem[]> {
  const rows = await db
    .select({
      id: crmVisitas.id,
      titulo: sql<string>`COALESCE(NULLIF(${crmVisitas.nomeAvulso}, ''), (SELECT nome FROM clientes WHERE id = ${crmVisitas.clienteId}), (SELECT COALESCE(NULLIF(razao_social, ''), NULLIF(nome, '')) FROM crm_leads WHERE id = ${crmVisitas.empresaId}), 'Visita')`,
      subtitulo: crmVisitas.tipo,
      status: crmVisitas.status,
      data: crmVisitas.dataVisita,
    })
    .from(crmVisitas)
    .orderBy(desc(crmVisitas.dataVisita))
    .limit(limite)
  return (rows as ListaRow[]).map((row) => ({
    id: row.id,
    titulo: texto(row.titulo),
    subtitulo: row.subtitulo,
    status: row.status,
    data: dataTexto(row.data),
    href: `/comercial/crm/visitas/${row.id}`,
  }))
}

async function listarTarefas(limite: number): Promise<DetalheItem[]> {
  const rows = await db
    .select({
      id: crmTarefas.id,
      titulo: crmTarefas.titulo,
      subtitulo: crmTarefas.tipo,
      status: crmTarefas.status,
      data: crmTarefas.dataPrevista,
    })
    .from(crmTarefas)
    .orderBy(asc(crmTarefas.status), asc(crmTarefas.dataPrevista))
    .limit(limite)
  return (rows as ListaRow[]).map((row) => ({
    id: row.id,
    titulo: texto(row.titulo),
    subtitulo: row.subtitulo,
    status: row.status,
    data: dataTexto(row.data),
    href: `/comercial/crm/tarefas?busca=${row.id}`,
  }))
}

async function listarTopLeads(limite: number): Promise<DetalheItem[]> {
  const rows = await db
    .select({
      empresaId: crmOportunidades.empresaId,
      clienteId: crmOportunidades.clienteId,
      leadRazao: crmPessoas.razaoSocial,
      leadFantasia: crmPessoas.nomeFantasia,
      leadNome: crmPessoas.nome,
      clienteNome: clientesSchema.nome,
      totalValor: sql<string>`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`,
    })
    .from(crmOportunidades)
    .leftJoin(crmPessoas, eq(crmOportunidades.empresaId, crmPessoas.id))
    .leftJoin(clientesSchema, eq(crmOportunidades.clienteId, clientesSchema.id))
    .where(sql`${crmOportunidades.status} NOT IN ('FECHADO_PERDIDO', 'FECHADO_GANHO')`)
    .groupBy(
      crmOportunidades.empresaId,
      crmOportunidades.clienteId,
      crmPessoas.razaoSocial,
      crmPessoas.nomeFantasia,
      crmPessoas.nome,
      clientesSchema.nome
    )
    .orderBy(desc(sql`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`))
    .limit(limite)
  return (rows as TopLeadRow[]).map((row, indice) => {
    const titulo =
      texto(row.leadFantasia) || texto(row.leadRazao) || texto(row.leadNome) || texto(row.clienteNome) || "Sem nome"
    return {
      id: row.empresaId ?? row.clienteId ?? indice + 1,
      titulo,
      subtitulo: row.empresaId ? "Lead (Negócio)" : "Cliente",
      valor: Number(row.totalValor ?? 0),
      href: row.empresaId
        ? `/comercial/crm/leads/${row.empresaId}`
        : `/comercial/clientes/${row.clienteId}`,
    }
  })
}

async function listarRecentes(limite: number): Promise<DetalheItem[]> {
  const eventos = await db
    .select({
      id: crmTimelineEventos.id,
      titulo: crmTimelineEventos.descricao,
      status: crmTimelineEventos.tipo,
      data: crmTimelineEventos.dataEvento,
    })
    .from(crmTimelineEventos)
    .orderBy(desc(crmTimelineEventos.dataEvento))
    .limit(limite)
  const visitas = await db
    .select({
      id: crmVisitas.id,
      titulo: sql<string>`'Visita ' || COALESCE(${crmVisitas.dataVisita}::text, '') || ' — ' || ${crmVisitas.status}`,
      status: sql<string>`'VISITA'`,
      data: crmVisitas.dataVisita,
    })
    .from(crmVisitas)
    .orderBy(desc(crmVisitas.dataVisita))
    .limit(limite)
  return [...eventos, ...visitas]
    .sort((a, b) => new Date(b.data ?? 0).getTime() - new Date(a.data ?? 0).getTime())
    .slice(0, limite)
    .map((row) => ({
      id: row.id,
      titulo: row.titulo,
      status: row.status,
      data: dataTexto(row.data),
      href:
        row.status === "VISITA"
          ? `/comercial/crm/visitas/${row.id}`
          : row.status === "ACAO_PROSPECCAO"
            ? `/comercial/crm/acoes-prospeccao/${row.id}`
            : "/comercial/crm",
    }))
}

async function resumoFunil(): Promise<DetalheItem[]> {
  const [leads, clientes, oportunidades, convertidas] = await Promise.all([
    safeQuery(
      () => db.select({ total: count() }).from(crmPessoas),
      [{ total: 0 }]
    ),
    safeQuery(() => db.select({ total: count() }).from(clientesSchema), [{ total: 0 }]),
    safeQuery(() => db.select({ total: count() }).from(crmOportunidades), [{ total: 0 }]),
    safeQuery(
      () =>
        db
          .select({ total: count() })
          .from(crmOportunidades)
          .where(eq(crmOportunidades.status, "FECHADO_GANHO")),
      [{ total: 0 }]
    ),
  ])
  const total = (rows: { total: number }[]) => Number(rows[0]?.total ?? 0)
  return [
    {
      id: 1,
      titulo: "Leads",
      subtitulo: `${total(leads)} registros`,
      href: "/comercial/crm/leads",
    },
    {
      id: 2,
      titulo: "Clientes",
      subtitulo: `${total(clientes)} registros`,
      href: "/comercial/clientes",
    },
    {
      id: 3,
      titulo: "Oportunidades",
      subtitulo: `${total(oportunidades)} registros`,
      href: "/comercial/crm/oportunidades",
    },
    {
      id: 4,
      titulo: "Convertidas",
      subtitulo: `${total(convertidas)} registros`,
      href: "/comercial/crm/oportunidades?status=FECHADO_GANHO",
    },
  ]
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const params = req.nextUrl.searchParams
    const bloco = params.get("bloco") ?? ""
    if (!BLOCOS.has(bloco)) {
      return NextResponse.json({ error: "Bloco inválido" }, { status: 400 })
    }

    const status = params.get("status")
    const limiteParam = Number(params.get("limite"))
    const limite = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 100) : 25

    let itens: DetalheItem[] = []
    if (bloco === "funil") {
      itens = await safeQuery(resumoFunil, [])
    } else if (bloco === "leads" || bloco === "funil-leads") {
      itens = await safeQuery(() => listarLeads(status, limite), [])
    } else if (bloco === "clientes") {
      itens = await safeQuery(() => listarClientes(limite), [])
    } else if (
      bloco === "oportunidades" ||
      bloco === "funil-oportunidades" ||
      bloco === "status"
    ) {
      itens = await safeQuery(() => listarOportunidades(status, limite), [])
    } else if (bloco === "funil-convertidas" || bloco === "previsao-convertidas") {
      itens = await safeQuery(() => listarOportunidades("FECHADO_GANHO", limite), [])
    } else if (bloco === "visitas") {
      itens = await safeQuery(() => listarVisitas(limite), [])
    } else if (bloco === "tarefas") {
      itens = await safeQuery(() => listarTarefas(limite), [])
    } else if (bloco === "top-leads") {
      itens = await safeQuery(() => listarTopLeads(limite), [])
    } else if (bloco === "recentes") {
      itens = await safeQuery(() => listarRecentes(limite), [])
    }

    return NextResponse.json({
      bloco,
      titulo: TITULOS[bloco],
      listagem: LISTAGENS[bloco],
      itens,
    })
  } catch (error) {
    console.error("[GET /api/crm/dashboard/detalhes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
