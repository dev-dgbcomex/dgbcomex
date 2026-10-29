import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { obterEstadoCargaPedidos } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    return NextResponse.json(await obterEstadoCargaPedidos())
  } catch (error) {
    return erroWms(error, "GET /api/wms/pedidos/carga/estado")
  }
}
