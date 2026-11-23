import { NextRequest, NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import {
  crmSaudeProspeccaoAnalises,
  crmSaudeProspeccaoMensagens,
} from "@/lib/db/schema/crm-saude-prospeccao-ia"
import { carregarAnaliseAutorizada } from "@/lib/crm/saude-prospeccao-acesso"
import { sendEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let usuarioNome: string | null = null
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    usuarioNome = auth.session.user.name ?? null

    const id = Number((await params).id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const analise = await carregarAnaliseAutorizada({
      id,
      userId: auth.userId,
      role: auth.session.user.role,
    })
    if (!analise) return NextResponse.json({ error: "Análise não encontrada" }, { status: 404 })

    const destinatario = analise.criadoPorEmail || auth.session.user.email
    if (!destinatario) {
      return NextResponse.json({ error: "Usuário sem e-mail cadastrado" }, { status: 422 })
    }

    const mensagens = await db
      .select()
      .from(crmSaudeProspeccaoMensagens)
      .where(eq(crmSaudeProspeccaoMensagens.analiseId, id))
      .orderBy(asc(crmSaudeProspeccaoMensagens.createdAt))

    const conversa = mensagens
      .map((mensagem: (typeof mensagens)[number]) => `<h3>${mensagem.papel === "usuario" ? "Pergunta" : "Resposta"}</h3><pre>${escaparHtml(mensagem.conteudo)}</pre>`)
      .join("")

    const resultadoEnvio = await sendEmail({
      to: destinatario,
      subject: `Saúde da Prospecção — ${analise.titulo}`,
      html: `<h1>Saúde da Prospecção</h1><h2>${escaparHtml(analise.titulo)}</h2><h3>Análise</h3><pre>${escaparHtml(analise.analise)}</pre>${conversa}`,
    })

    const enviado = !resultadoEnvio.error && (resultadoEnvio.sent ?? 0) > 0

    await db
      .update(crmSaudeProspeccaoAnalises)
      .set({
        situacao: enviado ? "ENVIADA" : "ABERTA",
        enviadaEm: enviado ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(crmSaudeProspeccaoAnalises.id, id))

    if (!enviado) {
      return NextResponse.json(
        { error: "Não foi possível enviar o e-mail", detalhe: resultadoEnvio.error },
        { status: 502 }
      )
    }

    return NextResponse.json({ enviado: true, destinatario })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/saude-prospeccao/ia/analises/[id]/concluir", usuarioNome)
  }
}
