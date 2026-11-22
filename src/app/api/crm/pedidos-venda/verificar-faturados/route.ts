import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmFaturamentos } from "@/lib/db/schema/crm-faturamentos"
import { and, eq, ne } from "drizzle-orm"
import { atualizarEspelhosErp } from "@/lib/crm/erp-espelho"
import { handleApiError } from "@/lib/api-error"

type Candidato = {
  pedidoId: number
  numero: string | null
  referenciaExterna: string | null
  oportunidadeId: number
  oportunidadeTitulo: string | null
  leadId: number | null
  leadNome: string | null
  jaConvertida: boolean
  nota: string | null
  dataNota: string | null
}

function chavePedido(referencia: string | null | undefined) {
  const partes = (referencia || "").split("/").map((p) => p.trim())
  if (partes.length < 2 || !partes[0] || !partes[1]) return null
  return `${partes[0]}/${partes[1]}`
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const pedidoId = body.pedidoId ? Number(body.pedidoId) : undefined
    const oportunidadeId = body.oportunidadeId ? Number(body.oportunidadeId) : undefined

    const sincronizacao = await atualizarEspelhosErp("FATURAMENTO")

    const condicoes = [eq(crmPedidosVenda.origem, "ERP")]
    if (pedidoId) condicoes.push(eq(crmPedidosVenda.id, pedidoId))
    if (oportunidadeId) condicoes.push(eq(crmPedidosVenda.oportunidadeId, oportunidadeId))

    const pedidos = await db
      .select({
        pedidoId: crmPedidosVenda.id,
        numero: crmPedidosVenda.numero,
        referenciaExterna: crmPedidosVenda.referenciaExterna,
        oportunidadeId: crmOportunidades.id,
        oportunidadeTitulo: crmOportunidades.titulo,
        leadId: crmLeads.id,
        leadNome: crmLeads.nome,
        leadRazaoSocial: crmLeads.razaoSocial,
        jaConvertida: crmLeads.promovidaCliente,
      })
      .from(crmPedidosVenda)
      .innerJoin(crmOportunidades, eq(crmPedidosVenda.oportunidadeId, crmOportunidades.id))
      .leftJoin(crmLeads, eq(crmOportunidades.empresaId, crmLeads.id))
      .where(and(...condicoes))

    const faturamentos = await db
      .select({
        numero: crmFaturamentos.numero,
        dataEmissao: crmFaturamentos.dataEmissao,
        referenciaExterna: crmFaturamentos.referenciaExterna,
      })
      .from(crmFaturamentos)
      .where(and(eq(crmFaturamentos.origem, "ERP"), ne(crmFaturamentos.status, "CANCELADO")))

    const notasPorPedido = new Map<string, { nota: string | null; dataNota: string | null }>()
    for (const faturamento of faturamentos) {
      const chave = chavePedido(faturamento.referenciaExterna)
      if (!chave) continue
      const atual = notasPorPedido.get(chave)
      if (atual) continue
      notasPorPedido.set(chave, {
        nota: faturamento.numero,
        dataNota: faturamento.dataEmissao ? String(faturamento.dataEmissao) : null,
      })
    }

    const candidatos: Candidato[] = []
    for (const pedido of pedidos) {
      const chave = chavePedido(pedido.referenciaExterna)
      if (!chave) continue
      const nota = notasPorPedido.get(chave)
      if (!nota) continue
      candidatos.push({
        pedidoId: pedido.pedidoId,
        numero: pedido.numero,
        referenciaExterna: pedido.referenciaExterna,
        oportunidadeId: pedido.oportunidadeId,
        oportunidadeTitulo: pedido.oportunidadeTitulo,
        leadId: pedido.leadId,
        leadNome: pedido.leadNome || pedido.leadRazaoSocial || null,
        jaConvertida: Boolean(pedido.jaConvertida),
        nota: nota.nota,
        dataNota: nota.dataNota,
      })
    }

    return NextResponse.json({
      candidatos,
      sincronizacao: {
        verificados: sincronizacao.verificados,
        atualizados: sincronizacao.atualizados,
        falhas: sincronizacao.falhas,
      },
    })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/pedidos-venda/verificar-faturados")
  }
}
