import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { cancelarSeparacao } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function POST(
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const motivo =
      typeof body.motivo === "string" && body.motivo.trim() ? body.motivo.trim() : null

    return NextResponse.json(await cancelarSeparacao(numero, motivo, auth.userId))
  } catch (error) {
    return erroWms(error, "POST /api/wms/separacoes/[id]/cancelar")
  }
}
