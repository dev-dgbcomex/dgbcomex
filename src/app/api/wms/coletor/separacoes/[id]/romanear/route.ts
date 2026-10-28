import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { podeColetarWms } from "@/lib/wms/permissoes"
import { gerarRomaneioColetor } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeColetarWms(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Seu perfil não pode gerar romaneio" },
        { status: 403 }
      )
    }

    const { id } = await params
    const separacaoId = Number(id)
    if (!Number.isInteger(separacaoId) || separacaoId <= 0) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const usuarioId =
      typeof body.usuarioId === "number" ? body.usuarioId : Number(body.usuarioId)

    return NextResponse.json(await gerarRomaneioColetor(separacaoId, { usuarioId }))
  } catch (error) {
    return erroWms(error, "POST /api/wms/coletor/separacoes/[id]/romanear")
  }
}
