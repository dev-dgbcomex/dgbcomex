import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { detalhePedido } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ empresa: string; pedido: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { empresa, pedido } = await params
    return NextResponse.json(
      await detalhePedido(decodeURIComponent(empresa), decodeURIComponent(pedido))
    )
  } catch (error) {
    return erroWms(error, "GET /api/wms/pedidos/[empresa]/[pedido]")
  }
}
