import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { podeArquivarWms } from "@/lib/wms/permissoes"
import { desarquivarSeparacao } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeArquivarWms(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Seu perfil não pode desarquivar ordens" },
        { status: 403 }
      )
    }

    const { id } = await params
    const numero = Number(id)
    if (!Number.isInteger(numero) || numero <= 0) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 })
    }

    return NextResponse.json(await desarquivarSeparacao(numero))
  } catch (error) {
    return erroWms(error, "POST /api/wms/separacoes/[id]/desarquivar")
  }
}
