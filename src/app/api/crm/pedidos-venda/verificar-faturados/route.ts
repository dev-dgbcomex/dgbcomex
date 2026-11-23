import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { verificarPedidoFaturado } from "@/lib/crm/verificar-pedido-faturado"

type CorpoVerificar = {
  pedidoId?: number
  pedidoIds?: number[]
  oportunidadeId?: number
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => ({}))) as CorpoVerificar
    const oportunidadeId = body.oportunidadeId ? Number(body.oportunidadeId) : undefined

    let pedidoIds: number[] | undefined
    if (body.pedidoIds && Array.isArray(body.pedidoIds)) {
      pedidoIds = body.pedidoIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    } else if (body.pedidoId) {
      pedidoIds = [Number(body.pedidoId)]
    }

    const preview = await verificarPedidoFaturado(pedidoIds, oportunidadeId)

    return NextResponse.json({
      pedidos: preview.pedidos,
      mensagem: preview.mensagem,
      sincronizacao: preview.sincronizacao,
    })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/pedidos-venda/verificar-faturados")
  }
}
