import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { detalheSituacao, moverPedidoSituacao } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

const ADMIN = new Set(["ADMIN", "SUDO"])

function podeMover(role: string | null | undefined, perfis: string[]): boolean {
  if (!role) return false
  const normalizado = role.toUpperCase()
  return ADMIN.has(normalizado) || perfis.map((p) => p.toUpperCase()).includes(normalizado)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ empresa: string; pedido: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { empresa, pedido } = await params
    const body = (await req.json()) as Record<string, unknown>
    const situacaoId = typeof body.situacaoId === "number" ? body.situacaoId : Number(body.situacaoId)
    if (!Number.isInteger(situacaoId) || situacaoId <= 0) {
      return NextResponse.json({ error: "Situação inválida" }, { status: 400 })
    }

    const situacao = await detalheSituacao(situacaoId)
    if (!podeMover(auth.session.user?.role, situacao.perfis ?? [])) {
      return NextResponse.json(
        { error: "Seu perfil não pode mover o pedido para esta situação" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      await moverPedidoSituacao(decodeURIComponent(empresa), decodeURIComponent(pedido), {
        situacaoId,
        observacao:
          typeof body.observacao === "string" ? body.observacao : null,
        usuarioId: auth.userId,
      })
    )
  } catch (error) {
    return erroWms(error, "POST /api/wms/pedidos/[empresa]/[pedido]/situacao")
  }
}
