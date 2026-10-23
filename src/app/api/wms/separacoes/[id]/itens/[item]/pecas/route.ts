import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { pecasDoItem } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; item: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id, item } = await params
    const separacaoId = Number(id)
    const numeroItem = Number(item)
    if (
      !Number.isInteger(separacaoId) ||
      separacaoId <= 0 ||
      !Number.isInteger(numeroItem) ||
      numeroItem <= 0
    ) {
      return NextResponse.json({ error: "Item inválido" }, { status: 400 })
    }

    const { searchParams } = req.nextUrl
    const limite = Number(searchParams.get("limite") ?? 50)
    const offset = Number(searchParams.get("offset") ?? 0)

    return NextResponse.json(
      await pecasDoItem(separacaoId, numeroItem, {
        busca: searchParams.get("busca") ?? "",
        gaveta: searchParams.get("gaveta") ?? "",
        subLote: searchParams.get("subLote") ?? "",
        aviso: searchParams.get("aviso") ?? "",
        campo: searchParams.get("campo") ?? "",
        limite: Number.isFinite(limite) ? limite : 50,
        offset: Number.isFinite(offset) ? offset : 0,
      })
    )
  } catch (error) {
    return erroWms(error, "GET /api/wms/separacoes/[id]/itens/[item]/pecas")
  }
}
