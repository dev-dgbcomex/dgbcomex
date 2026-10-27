import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { podeArquivarWms } from "@/lib/wms/permissoes"
import { reabrirSeparacao } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

const STATUS = new Set(["LIBERADO", "EM_SEPARACAO"])

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeArquivarWms(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Seu perfil não pode reabrir ordens" },
        { status: 403 }
      )
    }

    const { id } = await params
    const numero = Number(id)
    if (!Number.isInteger(numero) || numero <= 0) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const status =
      typeof body.status === "string" ? body.status.trim().toUpperCase() : "LIBERADO"
    if (!STATUS.has(status)) {
      return NextResponse.json(
        { error: "Status inválido: use LIBERADO ou EM_SEPARACAO" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      await reabrirSeparacao(numero, {
        status,
        usuarioId: auth.userId,
        observacao:
          typeof body.observacao === "string" ? body.observacao : null,
      })
    )
  } catch (error) {
    return erroWms(error, "POST /api/wms/separacoes/[id]/reabrir")
  }
}
