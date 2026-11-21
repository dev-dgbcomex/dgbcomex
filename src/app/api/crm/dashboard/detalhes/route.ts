import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmVisitantes } from "@/lib/db/schema/crm-visitantes"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmTarefas } from "@/lib/db/schema/crm-tarefas"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"
import { crmPrevisaoVendas } from "@/lib/db/schema/crm-previsao-vendas"
import { clientes as clientesSchema } from "@/lib/db/schema/clientes"
import { hrefEventoTimeline } from "@/lib/crm/href-evento-timeline"
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
  leadFantasia: string | null
  leadRazao: string | null
  leadNome: string | null
  totalValor: string | number | null
}

type TopClienteRow = {
  clienteId: number | null
  clienteNome: string | null
  totalValor: string | number | null
  totalOportunidades: string | number | null
  oportunidadesConvertidas: string | number | null
  valorAberto: string | number | null
}

const BLOCOS = new Set([
  "leads",
  "clientes",
  "oportunidades",
  "visitas",
  "acoes-realizadas",
  "tarefas",
  "funil",
  "funil-leads",
  "funil-oportunidades",
  "funil-convertidas",
  "previsao-abertas",
  "previsao-convertidas",
  "status",
  "top-leads",
  "top-clientes",
  "recentes",
])

const TITULOS: Record<string, string> = {
  leads: "Leads (Negócios)",
  clientes: "Clientes",
  oportunidades: "Oportunidades",
  visitas: "Visitas",
  "acoes-realizadas": "Ações de prospecção realizadas",
  tarefas: "Tarefas",
  funil: "Pipeline (Funil)",
  "funil-leads": "Leads no funil",
  "funil-oportunidades": "Oportunidades no funil",
  "funil-convertidas": "Oportunidades convertidas",
  "previsao-abertas": "Oportunidades da previsão de receita",
  "previsao-convertidas": "Oportunidades convertidas",
  status: "Oportunidades por status",
  "top-leads": "Top Leads (Negócios)",
  "top-clientes": "Top Clientes (por oportunidades)",
  recentes: "Atividades recentes",
}

const LISTAGENS: Record<string, string> = {
  leads: "/comercial/crm/leads",
  clientes: "/comercial/clientes",
  oportunidades: "/comercial/crm/oportunidades",
  visitas: "/comercial/crm/visitas",
  "acoes-realizadas": "/comercial/crm/acoes-prospeccao",
  tarefas: "/comercial/crm/tarefas",
  funil: "/comercial/crm/oportunidades",
  "funil-leads": "/comercial/crm/leads",
  "funil-oportunidades": "/comercial/crm/oportunidades",
  "funil-convertidas": "/comercial/crm/oportunidades",
  "previsao-abertas": "/comercial/crm/oportunidades",
  "previsao-convertidas": "/comercial/crm/oportunidades",
  status: "/comercial/crm/oportunidades",
  "top-leads": "/comercial/crm/leads",
  "top-clientes": "/comercial/clientes",
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

async function listarOportunidades(status: string | null, limite: number): Promise<DetalheItem[]> {
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

async function listarOportunidadesPrevisao(
  tipo: "abertas" | "convertidas",
  limite: number
): Promise<{ itens: DetalheItem[]; totalRegistros: number; totalValor: number }> {
  const condicao =
    tipo === "abertas"
      ? sql`${crmOportunidades.status} NOT IN ('FECHADO_PERDIDO', 'FECHADO_GANHO')`
      : eq(crmOportunidades.status, "FECHADO_GANHO")

  const [linhas, totais] = await Promise.all([
    db
      .select({
        id: crmOportunidades.id,
        titulo: crmOportunidades.titulo,
        status: crmOportunidades.status,
        valor: crmOportunidades.valorEstimado,
        data: crmOportunidades.createdAt,
      })
      .from(crmOportunidades)
      .where(condicao)
      .orderBy(desc(crmOportunidades.createdAt))
      .limit(limite),
    db
      .select({
        totalRegistros: count(),
        totalValor: sql<string>`COALESCE(SUM(${crmOportunidades.valorEstimado}), 0)`,
      })
      .from(crmOportunidades)
      .where(condicao),
  ])

  return {
    itens: (linhas as ListaRow[]).map((row) => ({
      id: row.id,
      titulo: texto(row.titulo),
      status: row.status,
      valor: Number(row.valor ?? 0),
      data: dataTexto(row.data),
      href: `/comercial/crm/oportunidades/${row.id}`,
    })),
    totalRegistros: Number(totais[0]?.totalRegistros ?? 0),
    totalValor: Number(totais[0]?.totalValor ?? 0),
  }
}

async function listarAcoesRealizadas(limite: number): Promise<DetalheItem[]> {
  const rows = await db
    .select({
      id: crmAcoesProspeccao.id,
      titulo: sql<string>`COALESCE(NULLIF(${crmAcoesProspeccao.nomeAvulso}, ''), (SELECT nome FROM clientes WHERE id = ${crmAcoesProspeccao.clienteId}), (SELECT COALESCE(NULLIF(razao_social, ''), NULLIF(nome, '')) FROM crm_leads WHERE id = ${crmAcoesProspeccao.empresaId}), 'Ação de prospecção')`,
      subtitulo: crmAcoesProspeccao.tipo,
      status: crmAcoesProspeccao.status,
      data: crmAcoesProspeccao.dataAcao,
    })
    .from(crmAcoesProspeccao)
    .where(eq(crmAcoesProspeccao.status, "REALIZADA"))
    .orderBy(desc(crmAcoesProspeccao.dataAcao))
    .limit(limite)
  return (rows as ListaRow[]).map((row) => ({
    id: row.id,
    titulo: texto(row.titulo),
    subtitulo: row.subtitulo,
    status: row.status,
    data: dataTexto(row.data),
    href: `/comercial/crm/acoes-prospeccao/${row.id}`,
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
      leadRazao: crmPessoas.razaoSocial,
      leadFantasia: crmPessoas.nomeFantasia,
      leadNome: crmPessoas.nome,
      totalValor: sql<string>`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`,
    })
    .from(crmOportunidades)
    .innerJoin(crmPessoas, eq(crmOportunidades.empresaId, crmPessoas.id))
    .where(
      sql`${crmOportunidades.status} NOT IN ('FECHADO_PERDIDO', 'FECHADO_GANHO')
        AND ${crmOportunidades.clienteId} IS NULL
        AND ${crmPessoas.clienteId} IS NULL
        AND COALESCE(${crmPessoas.promovidaCliente}, false) = false`
    )
    .groupBy(
      crmOportunidades.empresaId,
      crmPessoas.razaoSocial,
      crmPessoas.nomeFantasia,
      crmPessoas.nome
    )
    .orderBy(desc(sql`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`))
    .limit(limite)
  return (rows as TopLeadRow[]).map((row, indice) => ({
    id: row.empresaId ?? indice + 1,
    titulo: texto(row.leadFantasia) || texto(row.leadRazao) || texto(row.leadNome) || "Sem nome",
    subtitulo: "Lead (Negócio)",
    valor: Number(row.totalValor ?? 0),
    href: `/comercial/crm/leads/${row.empresaId ?? indice + 1}`,
  }))
}

async function listarTopClientes(limite: number): Promise<DetalheItem[]> {
  const rows = await db
    .select({
      clienteId: sql<number>`${clientesSchema.id}`,
      clienteNome: clientesSchema.nome,
      totalValor: sql<string>`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`,
      totalOportunidades: sql<string>`COUNT(*)`,
      oportunidadesConvertidas: sql<string>`SUM(CASE WHEN ${crmOportunidades.status} = 'FECHADO_GANHO' THEN 1 ELSE 0 END)`,
      valorAberto: sql<string>`SUM(CASE WHEN ${crmOportunidades.status} NOT IN ('FECHADO_PERDIDO', 'FECHADO_GANHO') THEN COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric ELSE 0 END)`,
    })
    .from(crmOportunidades)
    .leftJoin(crmPessoas, eq(crmOportunidades.empresaId, crmPessoas.id))
    .innerJoin(
      clientesSchema,
      sql`${clientesSchema.id} = COALESCE(${crmOportunidades.clienteId}, ${crmPessoas.clienteId})`
    )
    .where(sql`COALESCE(${crmOportunidades.clienteId}, ${crmPessoas.clienteId}) IS NOT NULL`)
    .groupBy(clientesSchema.id, clientesSchema.nome)
    .orderBy(desc(sql`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`))
    .limit(limite)
  return (rows as TopClienteRow[]).map((row) => {
    const totalOportunidades = Number(row.totalOportunidades ?? 0)
    const oportunidadesConvertidas = Number(row.oportunidadesConvertidas ?? 0)
    const conversao = `${oportunidadesConvertidas} convertidas de ${totalOportunidades} oportunidades`
    return {
      id: Number(row.clienteId),
      titulo: texto(row.clienteNome) || "Sem nome",
      subtitulo: conversao,
      detalhe: conversao,
      valor: Number(row.totalValor ?? 0),
      href: `/comercial/clientes/${row.clienteId}`,
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
      metadados: crmTimelineEventos.metadados,
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
  return [
    ...eventos,
    ...visitas.map((visita: { id: number }) => ({ ...visita, metadados: { visitaId: visita.id } })),
  ]
    .sort((a, b) => new Date(b.data ?? 0).getTime() - new Date(a.data ?? 0).getTime())
    .slice(0, limite)
    .map((row) => ({
      id: row.id,
      titulo: row.titulo,
      status: row.status,
      data: dataTexto(row.data),
      href: hrefEventoTimeline({ tipo: row.status, metadados: row.metadados }) ?? "/comercial/crm",
    }))
}

async function resumoFunil(): Promise<DetalheItem[]> {
  const [leads, clientes, oportunidades, convertidas] = await Promise.all([
    safeQuery(() => db.select({ total: count() }).from(crmPessoas), [{ total: 0 }]),
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
    const blocoPrevisao = bloco === "previsao-abertas" || bloco === "previsao-convertidas"
    const limiteMaximo = blocoPrevisao ? 500 : 100
    const limitePadrao = blocoPrevisao ? 500 : 25
    const limiteParam = Number(params.get("limite"))
    const limite =
      Number.isFinite(limiteParam) && limiteParam > 0
        ? Math.min(limiteParam, limiteMaximo)
        : limitePadrao

    let itens: DetalheItem[] = []
    let totalRegistros = 0
    let totalValor = 0
    if (bloco === "funil") {
      itens = await safeQuery(resumoFunil, [])
    } else if (bloco === "leads" || bloco === "funil-leads") {
      itens = await safeQuery(() => listarLeads(status, limite), [])
    } else if (bloco === "clientes") {
      itens = await safeQuery(() => listarClientes(limite), [])
    } else if (bloco === "oportunidades" || bloco === "funil-oportunidades" || bloco === "status") {
      itens = await safeQuery(() => listarOportunidades(status, limite), [])
    } else if (bloco === "funil-convertidas") {
      itens = await safeQuery(() => listarOportunidades("FECHADO_GANHO", limite), [])
    } else if (blocoPrevisao) {
      const previsao = await safeQuery(
        () =>
          listarOportunidadesPrevisao(
            bloco === "previsao-abertas" ? "abertas" : "convertidas",
            limite
          ),
        { itens: [], totalRegistros: 0, totalValor: 0 }
      )
      itens = previsao.itens
      totalRegistros = previsao.totalRegistros
      totalValor = previsao.totalValor
    } else if (bloco === "visitas") {
      itens = await safeQuery(() => listarVisitas(limite), [])
    } else if (bloco === "acoes-realizadas") {
      itens = await safeQuery(() => listarAcoesRealizadas(limite), [])
    } else if (bloco === "tarefas") {
      itens = await safeQuery(() => listarTarefas(limite), [])
    } else if (bloco === "top-leads") {
      itens = await safeQuery(() => listarTopLeads(limite), [])
    } else if (bloco === "top-clientes") {
      itens = await safeQuery(() => listarTopClientes(limite), [])
    } else if (bloco === "recentes") {
      itens = await safeQuery(() => listarRecentes(limite), [])
    }

    return NextResponse.json({
      bloco,
      titulo: TITULOS[bloco],
      listagem: LISTAGENS[bloco],
      itens,
      ...(blocoPrevisao ? { totalRegistros, totalValor } : {}),
    })
  } catch (error) {
    console.error("[GET /api/crm/dashboard/detalhes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
