import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { criarSituacao, listarSituacoes } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"
import type { WmsSituacaoAcao } from "@/lib/wms/tipos"

export const dynamic = "force-dynamic"

const ADMIN = new Set(["ADMIN", "SUDO"])
const ACOES = new Set(["NENHUMA", "CRIAR_ORDEM", "CONCLUIR_ORDEM", "CANCELAR_ORDEM"])

function podeAdministrar(role?: string | null) {
  return Boolean(role && ADMIN.has(role.toUpperCase()))
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const ativo = req.nextUrl.searchParams.get("ativo")
    return NextResponse.json(
      await listarSituacoes(
        ativo === "true" ? { ativo: true } : ativo === "false" ? { ativo: false } : {}
      )
    )
  } catch (error) {
    return erroWms(error, "GET /api/wms/situacoes")
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeAdministrar(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Apenas administradores podem alterar as situações" },
        { status: 403 }
      )
    }

    const body = (await req.json()) as Record<string, unknown>
    const nome = typeof body.nome === "string" ? body.nome.trim() : ""
    if (!nome) {
      return NextResponse.json({ error: "Informe o nome da situação" }, { status: 400 })
    }
    const acao =
      typeof body.acao === "string" && ACOES.has(body.acao)
        ? (body.acao as WmsSituacaoAcao)
        : "NENHUMA"

    return NextResponse.json(
      await criarSituacao({
        nome,
        cor: typeof body.cor === "string" ? body.cor : "#94a3b8",
        ordem: typeof body.ordem === "number" ? body.ordem : undefined,
        acao,
        perfis: Array.isArray(body.perfis)
          ? body.perfis.filter((perfil): perfil is string => typeof perfil === "string")
          : [],
        ativo: typeof body.ativo === "boolean" ? body.ativo : true,
      }),
      { status: 201 }
    )
  } catch (error) {
    return erroWms(error, "POST /api/wms/situacoes")
  }
}
