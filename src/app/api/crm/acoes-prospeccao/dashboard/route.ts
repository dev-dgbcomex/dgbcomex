import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmViagens } from "@/lib/db/schema/crm-viagens"
import { crmViagensInvestimentos } from "@/lib/db/schema/crm-viagens-investimentos"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmFaturamentos } from "@/lib/db/schema/crm-faturamentos"
import { crmFaturamentoItens } from "@/lib/db/schema/crm-faturamento-itens"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmPedidoVendaItens } from "@/lib/db/schema/crm-pedido-venda-itens"
import { crmAcoesProspeccaoPesquisas } from "@/lib/db/schema/crm-acoes-prospeccao-pesquisas"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq, desc, sql, and, gte, count } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const mine = searchParams.get("mine")
    const isMine = mine === "true"
    const mineCondition = isMine ? eq(crmAcoesProspeccao.criadoPor, auth.userId) : undefined

    const now = new Date()
    const hoje = now.toISOString().split("T")[0]
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

    const realizadasCondition = mineCondition
      ? and(mineCondition, eq(crmAcoesProspeccao.status, "REALIZADA"))
      : eq(crmAcoesProspeccao.status, "REALIZADA")

    const [
      totalAcoes,
      realizadas,
      canceladas,
      agendadas,
      acoesHoje,
      visitasMes,
      byTipo,
      byStatus,
      porDia,
      porGerenteRaw,
      viagens,
      investimentosPorViagem,
      possiveisRetornos,
      faturamentosPorViagem,
      vendasPorViagem,
      ultimasAcoes,
      pesquisasEnviadas,
      pesquisasAbertas,
      pesquisasRespondidas,
    ] = await Promise.all([
      db.select({ total: count() }).from(crmAcoesProspeccao).where(mineCondition),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccao)
        .where(
          mineCondition
            ? and(mineCondition, eq(crmAcoesProspeccao.status, "REALIZADA"))
            : eq(crmAcoesProspeccao.status, "REALIZADA")
        ),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccao)
        .where(
          mineCondition
            ? and(mineCondition, eq(crmAcoesProspeccao.status, "CANCELADA"))
            : eq(crmAcoesProspeccao.status, "CANCELADA")
        ),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccao)
        .where(
          mineCondition
            ? and(mineCondition, eq(crmAcoesProspeccao.status, "AGENDADA"))
            : eq(crmAcoesProspeccao.status, "AGENDADA")
        ),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccao)
        .where(
          mineCondition
            ? and(mineCondition, eq(crmAcoesProspeccao.dataAcao, hoje))
            : eq(crmAcoesProspeccao.dataAcao, hoje)
        ),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccao)
        .where(
          mineCondition
            ? and(mineCondition, gte(crmAcoesProspeccao.dataAcao, inicioMes))
            : gte(crmAcoesProspeccao.dataAcao, inicioMes)
        ),
      db
        .select({ tipo: crmAcoesProspeccao.tipo, total: count() })
        .from(crmAcoesProspeccao)
        .where(mineCondition)
        .groupBy(crmAcoesProspeccao.tipo),
      db
        .select({ status: crmAcoesProspeccao.status, total: count() })
        .from(crmAcoesProspeccao)
        .where(mineCondition)
        .groupBy(crmAcoesProspeccao.status),
      db
        .select({ dia: crmAcoesProspeccao.dataAcao, total: count() })
        .from(crmAcoesProspeccao)
        .where(realizadasCondition)
        .groupBy(crmAcoesProspeccao.dataAcao)
        .orderBy(crmAcoesProspeccao.dataAcao),
      db
        .select({
          gerenteId: crmAcoesProspeccao.criadoPor,
          gerenteNome: usuarios.name,
          dataAcao: crmAcoesProspeccao.dataAcao,
          total: count(),
        })
        .from(crmAcoesProspeccao)
        .leftJoin(usuarios, eq(crmAcoesProspeccao.criadoPor, usuarios.id))
        .where(realizadasCondition)
        .groupBy(crmAcoesProspeccao.criadoPor, usuarios.name, crmAcoesProspeccao.dataAcao),
      db
        .select({
          viagemId: crmAcoesProspeccao.viagemId,
          viagemTitulo: crmViagens.titulo,
          total: count(),
          realizadas: sql<number>`sum(case when ${crmAcoesProspeccao.status} = 'REALIZADA' then 1 else 0 end)`,
          minData: sql<string | null>`min(${crmAcoesProspeccao.dataAcao})`,
          maxData: sql<string | null>`max(${crmAcoesProspeccao.dataAcao})`,
        })
        .from(crmAcoesProspeccao)
        .leftJoin(crmViagens, eq(crmAcoesProspeccao.viagemId, crmViagens.id))
        .where(mineCondition)
        .groupBy(crmAcoesProspeccao.viagemId, crmViagens.titulo),
      db
        .select({
          viagemId: crmViagensInvestimentos.viagemId,
          totalInvestimento: sql<string | null>`sum(${crmViagensInvestimentos.valor})`,
        })
        .from(crmViagensInvestimentos)
        .groupBy(crmViagensInvestimentos.viagemId),
      db
        .select({
          oportunidadeId: crmOportunidades.id,
          valorEstimado: crmOportunidades.valorEstimado,
          viagemId: crmAcoesProspeccao.viagemId,
        })
        .from(crmOportunidades)
        .innerJoin(crmAcoesProspeccao, eq(crmAcoesProspeccao.oportunidadeId, crmOportunidades.id)),
      db
        .select({
          viagemId: crmAcoesProspeccao.viagemId,
          valorTotal: crmFaturamentoItens.valorTotal,
        })
        .from(crmFaturamentoItens)
        .innerJoin(crmFaturamentos, eq(crmFaturamentoItens.faturamentoId, crmFaturamentos.id))
        .innerJoin(crmOportunidades, eq(crmFaturamentos.oportunidadeId, crmOportunidades.id))
        .innerJoin(crmAcoesProspeccao, eq(crmAcoesProspeccao.oportunidadeId, crmOportunidades.id)),
      db
        .select({
          viagemId: crmAcoesProspeccao.viagemId,
          valorTotal: crmPedidoVendaItens.valorTotal,
        })
        .from(crmPedidoVendaItens)
        .innerJoin(crmPedidosVenda, eq(crmPedidoVendaItens.pedidoVendaId, crmPedidosVenda.id))
        .innerJoin(crmOportunidades, eq(crmPedidosVenda.oportunidadeId, crmOportunidades.id))
        .innerJoin(crmAcoesProspeccao, eq(crmAcoesProspeccao.oportunidadeId, crmOportunidades.id)),
      db
        .select({
          id: crmAcoesProspeccao.id,
          empresaId: crmAcoesProspeccao.empresaId,
          clienteId: crmAcoesProspeccao.clienteId,
          dataAcao: crmAcoesProspeccao.dataAcao,
          hora: crmAcoesProspeccao.hora,
          tipo: crmAcoesProspeccao.tipo,
          status: crmAcoesProspeccao.status,
          endereco: crmAcoesProspeccao.endereco,
          numero: crmAcoesProspeccao.numero,
          complemento: crmAcoesProspeccao.complemento,
          bairro: crmAcoesProspeccao.bairro,
          cidade: crmAcoesProspeccao.cidade,
          uf: crmAcoesProspeccao.uf,
        })
        .from(crmAcoesProspeccao)
        .where(mineCondition)
        .orderBy(desc(crmAcoesProspeccao.createdAt))
        .limit(5),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccaoPesquisas)
        .innerJoin(crmAcoesProspeccao, eq(crmAcoesProspeccaoPesquisas.acaoId, crmAcoesProspeccao.id))
        .where(mineCondition),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccaoPesquisas)
        .innerJoin(crmAcoesProspeccao, eq(crmAcoesProspeccaoPesquisas.acaoId, crmAcoesProspeccao.id))
        .where(
          mineCondition
            ? and(mineCondition, eq(crmAcoesProspeccaoPesquisas.status, "ABERTO"))
            : eq(crmAcoesProspeccaoPesquisas.status, "ABERTO")
        ),
      db
        .select({ total: count() })
        .from(crmAcoesProspeccaoPesquisas)
        .innerJoin(crmAcoesProspeccao, eq(crmAcoesProspeccaoPesquisas.acaoId, crmAcoesProspeccao.id))
        .where(
          mineCondition
            ? and(mineCondition, eq(crmAcoesProspeccaoPesquisas.status, "RESPONDIDO"))
            : eq(crmAcoesProspeccaoPesquisas.status, "RESPONDIDO")
        ),
    ])

    const getCount = (rows: { total: number }[]) => Number(rows[0]?.total ?? 0)

    type GerenteAcc = {
      gerenteId: number | null
      gerenteNome: string
      acoes: number
      diasAtivos: number
      melhorDia: { dia: string; total: number } | null
      piorDia: { dia: string; total: number } | null
      _dias: Map<string, number>
    }

    const gerentes = new Map<number | null, GerenteAcc>()
    for (const r of porGerenteRaw as any[]) {
      let g = gerentes.get(r.gerenteId)
      if (!g) {
        g = {
          gerenteId: r.gerenteId,
          gerenteNome: r.gerenteNome || "Sem nome",
          acoes: 0,
          diasAtivos: 0,
          melhorDia: null,
          piorDia: null,
          _dias: new Map(),
        }
        gerentes.set(r.gerenteId, g)
      }
      const total = Number(r.total)
      g.acoes += total
      g._dias.set(r.dataAcao, (g._dias.get(r.dataAcao) || 0) + total)
    }

    const porGerente = [...gerentes.values()].map((g) => {
      g.diasAtivos = g._dias.size
      const dias = [...g._dias.entries()]
      if (dias.length > 0) {
        dias.sort((a, b) => a[1] - b[1])
        g.piorDia = { dia: dias[0][0], total: dias[0][1] }
        dias.reverse()
        g.melhorDia = { dia: dias[0][0], total: dias[0][1] }
      }
      const { _dias, ...rest } = g
      return {
        ...rest,
        mediaPorDia: g.diasAtivos > 0 ? Number((g.acoes / g.diasAtivos).toFixed(1)) : 0,
      }
    })
    porGerente.sort((a, b) => b.acoes - a.acoes)

    const investimentoPorViagem = new Map<number | null, number>(
      investimentosPorViagem.map((r: any) => [r.viagemId, Number(r.totalInvestimento ?? 0)])
    )

    const seenOportunidades = new Set<string>()
    const possivelRetornoPorViagem = new Map<number | null, number>()
    for (const r of possiveisRetornos as any[]) {
      const key = `${r.viagemId}:${r.oportunidadeId}`
      if (r.viagemId == null || r.oportunidadeId == null || seenOportunidades.has(key)) continue
      seenOportunidades.add(key)
      possivelRetornoPorViagem.set(
        r.viagemId,
        (possivelRetornoPorViagem.get(r.viagemId) ?? 0) + Number(r.valorEstimado ?? 0)
      )
    }

    const retornoRealPorViagem = new Map<number | null, number>()
    for (const r of faturamentosPorViagem as any[]) {
      if (r.viagemId == null) continue
      retornoRealPorViagem.set(
        r.viagemId,
        (retornoRealPorViagem.get(r.viagemId) ?? 0) + Number(r.valorTotal ?? 0)
      )
    }

    const vendasPorViagemTotal = new Map<number | null, number>()
    for (const r of vendasPorViagem as any[]) {
      if (r.viagemId == null) continue
      vendasPorViagemTotal.set(
        r.viagemId,
        (vendasPorViagemTotal.get(r.viagemId) ?? 0) + Number(r.valorTotal ?? 0)
      )
    }

    return NextResponse.json({
      total: getCount(totalAcoes),
      realizadas: getCount(realizadas),
      canceladas: getCount(canceladas),
      agendadas: getCount(agendadas),
      hoje: getCount(acoesHoje),
      esteMes: getCount(visitasMes),
      byTipo: byTipo.map((r: any) => ({ tipo: r.tipo, total: Number(r.total) })),
      byStatus: byStatus.map((r: any) => ({ status: r.status, total: Number(r.total) })),
      porDia: porDia.map((r: any) => ({ dia: r.dia, total: Number(r.total) })),
      porGerente,
      viagens: viagens.map((r: any) => ({
        viagemId: r.viagemId,
        viagemTitulo: r.viagemId ? r.viagemTitulo : "Sem viagem",
        total: Number(r.total),
        realizadas: Number(r.realizadas ?? 0),
        dataInicio: r.minData || null,
        dataFim: r.maxData || null,
        totalInvestimento: investimentoPorViagem.get(r.viagemId) ?? 0,
        possivelRetorno: possivelRetornoPorViagem.get(r.viagemId) ?? 0,
        retornoReal: retornoRealPorViagem.get(r.viagemId) ?? 0,
        vendas: vendasPorViagemTotal.get(r.viagemId) ?? 0,
      })),
      ultimasAcoes: ultimasAcoes.map((r: any) => ({
        id: r.id,
        empresaId: r.empresaId,
        clienteId: r.clienteId,
        dataAcao: r.dataAcao,
        hora: r.hora,
        tipo: r.tipo,
        status: r.status,
        endereco: r.endereco,
        numero: r.numero,
        complemento: r.complemento,
        bairro: r.bairro,
        cidade: r.cidade,
        uf: r.uf,
      })),
      pesquisas: {
        enviadas: getCount(pesquisasEnviadas),
        abertas: getCount(pesquisasAbertas),
        respondidas: getCount(pesquisasRespondidas),
      },
    })
  } catch (error) {
    console.error("[GET /api/crm/acoes-prospeccao/dashboard]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
