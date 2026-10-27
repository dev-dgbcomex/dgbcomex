import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { podeArquivarWms } from "@/lib/wms/permissoes"
import { desarquivarPedido } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ empresa: string; pedido: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeArquivarWms(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Seu perfil não pode desarquivar pedidos" },
        { status: 403 }
      )
    }

    const { empresa, pedido } = await params
    return NextResponse.json(
      await desarquivarPedido(decodeURIComponent(empresa), decodeURIComponent(pedido))
    )
  } catch (error) {
    return erroWms(error, "POST /api/wms/pedidos/[empresa]/[pedido]/desarquivar")
  }
}
