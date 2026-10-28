import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { podeColetarWms } from "@/lib/wms/permissoes"
import { adicionarPecasColetor } from "@/lib/wms/repo"
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
        { error: "Seu perfil não pode coletar peças" },
        { status: 403 }
      )
    }

    const { id } = await params
    const separacaoId = Number(id)
    if (!Number.isInteger(separacaoId) || separacaoId <= 0) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const item =
      typeof body.item === "number" ? body.item : Number(body.item)
    if (!Number.isInteger(item) || item <= 0) {
      return NextResponse.json({ error: "Item inválido" }, { status: 400 })
    }

    const pecas = body.pecas
    if (!Array.isArray(pecas) || pecas.length === 0) {
      return NextResponse.json(
        { error: "Pecas obrigatórias" },
        { status: 400 }
      )
    }

    return NextResponse.json(await adicionarPecasColetor(separacaoId, { item, pecas }))
  } catch (error) {
    return erroWms(error, "POST /api/wms/coletor/separacoes/[id]/pecas")
  }
}
