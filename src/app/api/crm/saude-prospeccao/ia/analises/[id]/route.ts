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

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const mensagens = await db
      .select()
      .from(crmSaudeProspeccaoMensagens)
      .where(eq(crmSaudeProspeccaoMensagens.analiseId, id))
      .orderBy(asc(crmSaudeProspeccaoMensagens.createdAt))

    return NextResponse.json({ analise, mensagens })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/saude-prospeccao/ia/analises/[id]", usuarioNome)
  }
}
