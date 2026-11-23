import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError, getErrorMessage } from "@/lib/api-error"
import { aplicarVerificacaoPedidoFaturado } from "@/lib/crm/verificar-pedido-faturado"

type CorpoAplicar = {
  pedidoIds?: number[]
  oportunidadeId?: number
  statusPedido?: "FATURADO" | "PARCIAL"
  aplicar?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => ({}))) as CorpoAplicar
    if (body.aplicar !== true) {
      return NextResponse.json(
        { error: "Informe aplicar: true para confirmar a atualização." },
        { status: 400 }
      )
    }

    const pedidoIds = body.pedidoIds
      ? body.pedidoIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : undefined
    const oportunidadeId = body.oportunidadeId ? Number(body.oportunidadeId) : undefined

    const resultado = await aplicarVerificacaoPedidoFaturado({
      pedidoIds,
      oportunidadeId,
      statusPedido: body.statusPedido,
      autor: {
        id:
          typeof auth.session.user.id === "number"
            ? auth.session.user.id
            : Number(auth.session.user.id) || null,
        nome: auth.session.user.name ?? null,
      },
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const mensagem = getErrorMessage(error)
    if (
      mensagem === "Vincule ou lance um pedido com o mesmo número de pedido do ERP."
    ) {
      return NextResponse.json({ error: mensagem }, { status: 409 })
    }
    return handleApiError(error, "POST /api/crm/pedidos-venda/aplicar-faturados")
  }
}
