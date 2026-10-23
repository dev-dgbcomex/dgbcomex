import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { removerPeca } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pecaId: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id, pecaId } = await params
    const separacaoId = Number(id)
    const peca = Number(pecaId)
    if (
      !Number.isInteger(separacaoId) ||
      separacaoId <= 0 ||
      !Number.isInteger(peca) ||
      peca <= 0
    ) {
      return NextResponse.json({ error: "Peça inválida" }, { status: 400 })
    }

    return NextResponse.json(await removerPeca(separacaoId, peca, auth.userId))
  } catch (error) {
    return erroWms(error, "DELETE /api/wms/separacoes/[id]/pecas/[pecaId]")
  }
}
