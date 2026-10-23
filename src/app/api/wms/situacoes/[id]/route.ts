import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { detalheSituacao, editarSituacao, excluirSituacao } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"
import type { NovaSituacaoPedido, WmsSituacaoAcao } from "@/lib/wms/tipos"

export const dynamic = "force-dynamic"

const ADMIN = new Set(["ADMIN", "SUDO"])
const ACOES = new Set(["NENHUMA", "CRIAR_ORDEM", "CONCLUIR_ORDEM", "CANCELAR_ORDEM"])

function podeAdministrar(role?: string | null) {
  return Boolean(role && ADMIN.has(role.toUpperCase()))
}

function idValido(valor: string): number | null {
  const id = Number(valor)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const situacaoId = idValido(id)
    if (!situacaoId) {
      return NextResponse.json({ error: "Situação inválida" }, { status: 400 })
    }
    return NextResponse.json(await detalheSituacao(situacaoId))
  } catch (error) {
    return erroWms(error, "GET /api/wms/situacoes/[id]")
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeAdministrar(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Apenas administradores podem alterar as situações" },
        { status: 403 }
      )
    }

    const { id } = await params
    const situacaoId = idValido(id)
    if (!situacaoId) {
      return NextResponse.json({ error: "Situação inválida" }, { status: 400 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const dados: Partial<NovaSituacaoPedido> = {}
    if (typeof body.nome === "string") dados.nome = body.nome.trim()
    if (typeof body.cor === "string") dados.cor = body.cor
    if (typeof body.ordem === "number") dados.ordem = body.ordem
    if (typeof body.ativo === "boolean") dados.ativo = body.ativo
    if (typeof body.acao === "string" && ACOES.has(body.acao)) {
      dados.acao = body.acao as WmsSituacaoAcao
    }
    if (Array.isArray(body.perfis)) {
      dados.perfis = body.perfis.filter(
        (perfil): perfil is string => typeof perfil === "string"
      )
    }
    if (dados.nome != null && !dados.nome) {
      return NextResponse.json({ error: "Informe o nome da situação" }, { status: 400 })
    }

    return NextResponse.json(await editarSituacao(situacaoId, dados))
  } catch (error) {
    return erroWms(error, "PUT /api/wms/situacoes/[id]")
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeAdministrar(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Apenas administradores podem alterar as situações" },
        { status: 403 }
      )
    }

    const { id } = await params
    const situacaoId = idValido(id)
    if (!situacaoId) {
      return NextResponse.json({ error: "Situação inválida" }, { status: 400 })
    }
    await excluirSituacao(situacaoId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return erroWms(error, "DELETE /api/wms/situacoes/[id]")
  }
}
