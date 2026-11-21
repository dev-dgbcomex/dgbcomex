import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmVisitantes } from "@/lib/db/schema/crm-visitantes"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmTarefas } from "@/lib/db/schema/crm-tarefas"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"
import { crmCampanhas } from "@/lib/db/schema/crm-campanhas"
import { crmPrevisaoVendas } from "@/lib/db/schema/crm-previsao-vendas"
import { clientes } from "@/lib/db/schema/clientes"
import { emailEnviados } from "@/lib/db/schema/email-enviados"
import { emailCliques } from "@/lib/db/schema/email-cliques"
import { hrefEventoTimeline } from "@/lib/crm/href-evento-timeline"
import { eq, desc, sql, and, gte, lte, count } from "drizzle-orm"

export const dynamic = "force-dynamic"

type TopEmpresaRow = {
  empresaId: number | null
  empresaNome: string | null
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

type RecenteRow = {
  id: number
  tipo: string | null
  descricao: string | null
  dataEvento: Date | string | null
  metadados?: unknown
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.error("[CRM Dashboard] Query failed:", e instanceof Error ? e.message : e)
    return fallback
  }
}

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const now = new Date()
    const hoje = now.toISOString().split("T")[0]
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

    const getCount = (rows: { total: number }[]) => Number(rows[0]?.total ?? 0)

    const [
      leadsTotal,
      leadsMes,
      empresasTotal,
      clientesTotal,
      oportunidadesTotal,
      oportunidadesByStatus,
      oportunidadesMes,
      oportunidadesFechadoGanho,
    ] = await Promise.all([
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmVisitantes)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmVisitantes)
            .where(gte(crmVisitantes.createdAt, new Date(inicioMes)))
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmPessoas)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(clientes)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmOportunidades)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ status: crmOportunidades.status, total: count() })
            .from(crmOportunidades)
            .groupBy(crmOportunidades.status)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmOportunidades)
            .where(gte(crmOportunidades.createdAt, new Date(inicioMes)))
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmOportunidades)
            .where(eq(crmOportunidades.status, "FECHADO_GANHO"))
            .then((r: any) => r),
        []
      ),
    ])

    const [
      propostasTotal,
      propostasByStatus,
      visitasTotal,
      visitasHoje,
      acoesRealizadasTotal,
      acoesRealizadasHoje,
      acoesRealizadasMes,
      tarefasPendentes,
      tarefasVencendo,
    ] = await Promise.all([
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmPropostas)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ status: crmPropostas.status, total: count() })
            .from(crmPropostas)
            .groupBy(crmPropostas.status)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmVisitas)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmVisitas)
            .where(eq(crmVisitas.dataVisita, hoje))
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmAcoesProspeccao)
            .where(eq(crmAcoesProspeccao.status, "REALIZADA"))
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmAcoesProspeccao)
            .where(
              and(eq(crmAcoesProspeccao.status, "REALIZADA"), eq(crmAcoesProspeccao.dataAcao, hoje))
            )
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmAcoesProspeccao)
            .where(
              and(
                eq(crmAcoesProspeccao.status, "REALIZADA"),
                gte(crmAcoesProspeccao.dataAcao, inicioMes)
              )
            )
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmTarefas)
            .where(eq(crmTarefas.status, "PENDENTE"))
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmTarefas)
            .where(and(eq(crmTarefas.status, "PENDENTE"), lte(crmTarefas.dataPrevista, hoje)))
            .then((r: any) => r),
        []
      ),
    ])

    const [
      topEmpresasRaw,
      topClientesRaw,
      forecastRaw,
      forecastQuantidadeRaw,
      valorConvertidoRaw,
      recentesRaw,
      visitasRecentesRaw,
      previsaoVendasRaw,
    ] = await Promise.all([
      safeQuery(
        () =>
          db
            .select({
              empresaId: crmOportunidades.empresaId,
              empresaNome: sql<string>`COALESCE(NULLIF(${crmPessoas.nomeFantasia}, ''), NULLIF(${crmPessoas.razaoSocial}, ''), NULLIF(${crmPessoas.nome}, ''), 'Sem nome')`,
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
              crmPessoas.nomeFantasia,
              crmPessoas.razaoSocial,
              crmPessoas.nome
            )
            .orderBy(desc(sql`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`))
            .limit(5),
        []
      ),
      safeQuery(
        () =>
          db
            .select({
              clienteId: sql<number>`${clientes.id}`,
              clienteNome: clientes.nome,
              totalValor: sql<string>`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`,
              totalOportunidades: sql<string>`COUNT(*)`,
              oportunidadesConvertidas: sql<string>`SUM(CASE WHEN ${crmOportunidades.status} = 'FECHADO_GANHO' THEN 1 ELSE 0 END)`,
              valorAberto: sql<string>`SUM(CASE WHEN ${crmOportunidades.status} NOT IN ('FECHADO_PERDIDO', 'FECHADO_GANHO') THEN COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric ELSE 0 END)`,
            })
            .from(crmOportunidades)
            .leftJoin(crmPessoas, eq(crmOportunidades.empresaId, crmPessoas.id))
            .innerJoin(
              clientes,
              sql`${clientes.id} = COALESCE(${crmOportunidades.clienteId}, ${crmPessoas.clienteId})`
            )
            .where(
              sql`COALESCE(${crmOportunidades.clienteId}, ${crmPessoas.clienteId}) IS NOT NULL`
            )
            .groupBy(clientes.id, clientes.nome)
            .orderBy(desc(sql`SUM(COALESCE(${crmOportunidades.valorEstimado}, 0)::numeric)`))
            .limit(5),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: sql<string>`COALESCE(SUM(${crmOportunidades.valorEstimado}), 0)` })
            .from(crmOportunidades)
            .where(sql`${crmOportunidades.status} NOT IN ('FECHADO_PERDIDO', 'FECHADO_GANHO')`),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmOportunidades)
            .where(sql`${crmOportunidades.status} NOT IN ('FECHADO_PERDIDO', 'FECHADO_GANHO')`)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: sql<string>`COALESCE(SUM(${crmOportunidades.valorEstimado}), 0)` })
            .from(crmOportunidades)
            .where(eq(crmOportunidades.status, "FECHADO_GANHO")),
        []
      ),
      safeQuery(
        () =>
          db
            .select({
              id: crmTimelineEventos.id,
              tipo: crmTimelineEventos.tipo,
              descricao: crmTimelineEventos.descricao,
              dataEvento: crmTimelineEventos.dataEvento,
              metadados: crmTimelineEventos.metadados,
            })
            .from(crmTimelineEventos)
            .orderBy(desc(crmTimelineEventos.dataEvento))
            .limit(10),
        []
      ),
      safeQuery(
        () =>
          db
            .select({
              id: crmVisitas.id,
              tipo: sql<string>`'VISITA'`,
              descricao: sql<string>`'Visita ' || COALESCE(${crmVisitas.dataVisita}::text, '') || ' — ' || ${crmVisitas.status}`,
              dataEvento: sql<string>`COALESCE(${crmVisitas.dataVisita}::text, '') || ' ' || COALESCE(${crmVisitas.hora}, '00:00')`,
            })
            .from(crmVisitas)
            .orderBy(desc(crmVisitas.dataVisita))
            .limit(10),
        []
      ),
      safeQuery(
        () =>
          db
            .select({
              periodo: crmPrevisaoVendas.periodo,
              valorPrevisto: crmPrevisaoVendas.valorPrevisto,
              valorReal: crmPrevisaoVendas.valorReal,
              dados: crmPrevisaoVendas.dados,
            })
            .from(crmPrevisaoVendas)
            .orderBy(desc(crmPrevisaoVendas.periodo))
            .limit(12),
        []
      ),
    ])

    const [
      campanhasTotal,
      campanhasAtivas,
      campanhasOrcamento,
      emailEnviadosTotal,
      emailEnviadosLidos,
      emailCliquesTotal,
    ] = await Promise.all([
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmCampanhas)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(crmCampanhas)
            .where(eq(crmCampanhas.status, "ATIVA"))
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: sql<string>`COALESCE(SUM(${crmCampanhas.orcamento}), 0)` })
            .from(crmCampanhas)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(emailEnviados)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(emailEnviados)
            .where(sql`${emailEnviados.abertoEm} IS NOT NULL`)
            .then((r: any) => r),
        []
      ),
      safeQuery(
        () =>
          db
            .select({ total: count() })
            .from(emailCliques)
            .then((r: any) => r),
        []
      ),
    ])

    const totalConvertidas = getCount(oportunidadesFechadoGanho)
    const forecast = Number((forecastRaw as any[])[0]?.total ?? 0)
    const forecastQuantidade = getCount(forecastQuantidadeRaw)
    const valorConvertido = Number((valorConvertidoRaw as any[])[0]?.total ?? 0)

    const recentes = [
      ...(recentesRaw as RecenteRow[]).map((r) => ({
        id: r.id,
        tipo: r.tipo,
        descricao: r.descricao,
        dataEvento: r.dataEvento
          ? r.dataEvento instanceof Date
            ? r.dataEvento.toISOString()
            : String(r.dataEvento)
          : "",
        href: hrefEventoTimeline(r) ?? "/comercial/crm",
      })),
      ...(visitasRecentesRaw as RecenteRow[]).map((r) => ({
        id: r.id,
        tipo: r.tipo,
        descricao: r.descricao,
        dataEvento: r.dataEvento,
        href: `/comercial/crm/visitas/${r.id}`,
      })),
    ]
      .sort((a, b) => new Date(b.dataEvento ?? 0).getTime() - new Date(a.dataEvento ?? 0).getTime())
      .slice(0, 10)

    return NextResponse.json({
      visitantes: { total: getCount(leadsTotal), esteMes: getCount(leadsMes) },
      leads: { total: getCount(empresasTotal) },
      clientes: { total: getCount(clientesTotal) },
      oportunidades: {
        total: getCount(oportunidadesTotal),
        esteMes: getCount(oportunidadesMes),
        byStatus: oportunidadesByStatus.map((r: any) => ({
          status: r.status,
          total: Number(r.total),
        })),
      },
      propostas: {
        total: getCount(propostasTotal),
        byStatus: propostasByStatus.map((r: any) => ({ status: r.status, total: Number(r.total) })),
      },
      visitas: { total: getCount(visitasTotal), hoje: getCount(visitasHoje) },
      acoesProspeccao: {
        realizadas: getCount(acoesRealizadasTotal),
        hoje: getCount(acoesRealizadasHoje),
        esteMes: getCount(acoesRealizadasMes),
      },
      tarefas: { pendentes: getCount(tarefasPendentes), vencendo: getCount(tarefasVencendo) },
      topEmpresas: (topEmpresasRaw as TopEmpresaRow[]).map((r) => ({
        empresaId: r.empresaId,
        empresaNome: r.empresaNome || "Sem nome",
        totalValor: Number(r.totalValor),
      })),
      topClientes: (topClientesRaw as TopClienteRow[]).map((r) => ({
        clienteId: Number(r.clienteId),
        clienteNome: r.clienteNome || "Sem nome",
        totalValor: Number(r.totalValor),
        totalOportunidades: Number(r.totalOportunidades),
        oportunidadesConvertidas: Number(r.oportunidadesConvertidas),
        valorAberto: Number(r.valorAberto),
      })),
      forecast,
      forecastQuantidade,
      conversao: {
        oportunidadesConvertidas: totalConvertidas,
        totalOportunidades: getCount(oportunidadesTotal),
        valorConvertido,
      },
      totalPrevisaoConversao: {
        quantidade: forecastQuantidade + totalConvertidas,
        valor: forecast + valorConvertido,
      },
      recentes,
      previsaoVendas: previsaoVendasRaw.map((r: any) => ({
        periodo: r.periodo,
        valorPrevisto: Number(r.valorPrevisto),
        valorReal: r.valorReal ? Number(r.valorReal) : null,
        dados: r.dados,
      })),
      campanhas: {
        total: getCount(campanhasTotal),
        ativas: getCount(campanhasAtivas),
        orcamentoTotal: Number((campanhasOrcamento as any[])[0]?.total ?? 0),
      },
      emailMassa: {
        enviados: getCount(emailEnviadosTotal),
        lidos: getCount(emailEnviadosLidos),
        clicados: getCount(emailCliquesTotal),
      },
    })
  } catch (error) {
    console.error("[GET /api/crm/dashboard]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
