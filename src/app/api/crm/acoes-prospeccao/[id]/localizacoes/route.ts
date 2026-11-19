import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccaoLocalizacoes } from "@/lib/db/schema/crm-acoes-prospeccao-localizacoes"
import { eq, desc } from "drizzle-orm"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id: idStr } = await params
    const acaoId = Number(idStr)
    if (isNaN(acaoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const localizacoes = await db
      .select()
      .from(crmAcoesProspeccaoLocalizacoes)
      .where(eq(crmAcoesProspeccaoLocalizacoes.acaoId, acaoId))
      .orderBy(desc(crmAcoesProspeccaoLocalizacoes.createdAt))

    return NextResponse.json(localizacoes)
  } catch (error) {
    console.error("[GET /api/crm/acoes-prospeccao/[id]/localizacoes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id: idStr } = await params
    const acaoId = Number(idStr)
    if (isNaN(acaoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { latitude, longitude, endereco, observacao, fotoUrl, tipo } = body

    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: "Latitude e longitude são obrigatórias" }, { status: 400 })
    }

    const [localizacao] = await db
      .insert(crmAcoesProspeccaoLocalizacoes)
      .values({
        acaoId,
        latitude,
        longitude,
        endereco,
        observacao,
        fotoUrl,
        tipo: tipo || "LOCAL",
        criadoPor: auth.userId,
      })
      .returning()

    return NextResponse.json(localizacao, { status: 201 })
  } catch (error) {
    console.error("[POST /api/crm/acoes-prospeccao/[id]/localizacoes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id: idStr } = await params
    const acaoId = Number(idStr)
    if (isNaN(acaoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const localizacaoId = Number(searchParams.get("localizacaoId"))
    if (isNaN(localizacaoId)) {
      return NextResponse.json({ error: "ID da localização inválido" }, { status: 400 })
    }

    await db
      .delete(crmAcoesProspeccaoLocalizacoes)
      .where(eq(crmAcoesProspeccaoLocalizacoes.id, localizacaoId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/crm/acoes-prospeccao/[id]/localizacoes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
