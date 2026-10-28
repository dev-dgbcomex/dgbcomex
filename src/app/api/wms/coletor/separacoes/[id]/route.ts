import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { detalheSeparacaoColetor } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const numero = Number(id)
    if (!Number.isInteger(numero) || numero <= 0) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 })
    }

    return NextResponse.json(await detalheSeparacaoColetor(numero))
  } catch (error) {
    return erroWms(error, "GET /api/wms/coletor/separacoes/[id]")
  }
}
