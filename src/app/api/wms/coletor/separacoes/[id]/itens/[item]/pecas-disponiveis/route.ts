import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { pecasDisponiveisParaColetor } from "@/lib/wms/repo"
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
    const itemNumero = Number(item)
    if (!Number.isInteger(separacaoId) || separacaoId <= 0) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 })
    }
    if (!Number.isInteger(itemNumero) || itemNumero <= 0) {
      return NextResponse.json({ error: "Item inválido" }, { status: 400 })
    }

    return NextResponse.json(await pecasDisponiveisParaColetor(separacaoId, itemNumero))
  } catch (error) {
    return erroWms(error, "GET /api/wms/coletor/separacoes/[id]/itens/[item]/pecas-disponiveis")
  }
}
