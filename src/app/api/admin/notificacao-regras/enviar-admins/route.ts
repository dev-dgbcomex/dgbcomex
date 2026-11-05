import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { notificarAdmins } from "@/lib/notificar"

export const dynamic = "force-dynamic"

const MENSAGEM_PADRAO =
  "Teste de notificação — os administradores recebem todas as notificações do sistema"
const TIPO_PADRAO = "TESTE_NOTIFICACAO"
const LINK_PADRAO = "/admin/notificacoes"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUDO")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    let body: unknown = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const dados = (body ?? {}) as { mensagem?: unknown; tipo?: unknown; link?: unknown }
    const mensagem =
      typeof dados.mensagem === "string" && dados.mensagem.trim()
        ? dados.mensagem.trim()
        : MENSAGEM_PADRAO
    const tipo =
      typeof dados.tipo === "string" && dados.tipo.trim() ? dados.tipo.trim() : TIPO_PADRAO
    const link =
      typeof dados.link === "string" && dados.link.trim() ? dados.link.trim() : LINK_PADRAO

    const resultado = await notificarAdmins(tipo, mensagem, link, session.user?.name ?? null)

    return NextResponse.json({ success: true, ...resultado })
  } catch (error) {
    console.error("[POST /api/admin/notificacao-regras/enviar-admins]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
