import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { listarEstoque } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const limite = Number(searchParams.get("limite") ?? 50)
    const offset = Number(searchParams.get("offset") ?? 0)

    return NextResponse.json(
      await listarEstoque({
        busca: searchParams.get("busca") ?? "",
        gaveta: searchParams.get("gaveta") ?? "",
        subLote: searchParams.get("subLote") ?? "",
        aviso: searchParams.get("aviso") ?? "",
        cor: searchParams.get("cor") ?? "",
        produto: searchParams.get("produto") ?? "",
        limite: Number.isFinite(limite) ? limite : 50,
        offset: Number.isFinite(offset) ? offset : 0,
      })
    )
  } catch (error) {
    return erroWms(error, "GET /api/wms/estoque")
  }
}
