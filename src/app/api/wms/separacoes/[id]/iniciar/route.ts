import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { iniciarSeparacao } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function POST(
  _req: NextRequest,
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

    return NextResponse.json(await iniciarSeparacao(numero, auth.userId))
  } catch (error) {
    return erroWms(error, "POST /api/wms/separacoes/[id]/iniciar")
  }
}
