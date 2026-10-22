import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { contarPecasEmAberto, listarPecasEmAberto } from "@/lib/wms/repo"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const busca = searchParams.get("busca") ?? ""
    const limite = Number(searchParams.get("limite") ?? 50)
    const offset = Number(searchParams.get("offset") ?? 0)

    const [itens, total] = await Promise.all([
      listarPecasEmAberto({
        busca,
        limite: Number.isFinite(limite) ? limite : 50,
        offset: Number.isFinite(offset) ? offset : 0,
      }),
      contarPecasEmAberto(busca),
    ])

    return NextResponse.json({ itens, total })
  } catch (error) {
    return handleApiError(error, "GET /api/wms/estoque")
  }
}
