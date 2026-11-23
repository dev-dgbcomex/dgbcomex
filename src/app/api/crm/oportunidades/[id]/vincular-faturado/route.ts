import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { ErroErp } from "@/lib/erp/cliente"
import {
  aplicarVinculacaoFaturado,
  previewVincularFaturado,
} from "@/lib/crm/vincular-faturado"

/**
 * Vincula um pedido de venda já faturado no ERP à oportunidade e executa o
 * processo do "Verificar faturados": espelha o pedido, gera/vincula o faturamento
   da nota real, atualiza o valor estimado, status do pedido, automações e lead.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session

    const { id } = await params
    const oportunidadeId = parseInt(id)
    if (!oportunidadeId || Number.isNaN(oportunidadeId)) {
      return NextResponse.json({ error: "Oportunidade é obrigatória" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const codigoPedido = String(body.codigoPedido || "").trim()
    if (!codigoPedido) {
      return NextResponse.json(
        { error: "Informe o código do pedido de venda do ERP" },
        { status: 400 }
      )
    }

    const aplicar = body.aplicar === true
    const nrNota = body.nrNota ? String(body.nrNota).trim() || null : null
    const statusPedido = body.statusPedido === "FATURADO" || body.statusPedido === "PARCIAL" ? body.statusPedido : null

    if (!aplicar) {
      const preview = await previewVincularFaturado({ oportunidadeId, codigoPedido })
      return NextResponse.json(preview, { status: 200 })
    }

    const resultado = await aplicarVinculacaoFaturado({
      oportunidadeId,
      codigoPedido,
      nrNota,
      statusPedido,
      usuarioNome: session.user.name ?? null,
    })

    return NextResponse.json(
      {
        message: "Pedido vinculado e faturamento processado",
        ...resultado,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof ErroErp) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return handleApiError(error, "POST /api/crm/oportunidades/[id]/vincular-faturado")
  }
}
