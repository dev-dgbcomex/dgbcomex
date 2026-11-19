import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { eq } from "drizzle-orm"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar"

function buildEventSummary(acao: any): string {
  const entity = acao.empresaNome || acao.clienteNome || "Ação de Prospecção"
  return `Ação de Prospecção - ${entity}`
}

function buildEventDescription(acao: any): string {
  const parts: string[] = []
  if (acao.tipo) parts.push(`Tipo: ${acao.tipo}`)
  if (acao.endereco)
    parts.push(
      `Endereço: ${acao.endereco}${acao.numero ? `, ${acao.numero}` : ""}${acao.cidade ? ` - ${acao.cidade}/${acao.uf}` : ""}`
    )
  if (acao.relato) parts.push(`Relato: ${acao.relato.replace(/<[^>]*>/g, "").slice(0, 200)}`)
  return parts.join("\n")
}

function buildEventLocation(acao: any): string {
  if (!acao.endereco) return ""
  return `${acao.endereco}${acao.numero ? `, ${acao.numero}` : ""}${acao.cidade ? ` - ${acao.cidade}/${acao.uf}` : ""}`
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session
    const accessToken = (session.user as any).accessToken
    if (!accessToken) {
      return NextResponse.json(
        { error: "Login via Google necessário para sincronizar com Google Calendar" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { acaoId } = body

    const [acao] = await db
      .select({
        id: crmAcoesProspeccao.id,
        empresaId: crmAcoesProspeccao.empresaId,
        empresaNome: crmPessoas.razaoSocial,
        clienteId: crmAcoesProspeccao.clienteId,
        clienteNome: clientes.nome,
        dataAcao: crmAcoesProspeccao.dataAcao,
        hora: crmAcoesProspeccao.hora,
        tipo: crmAcoesProspeccao.tipo,
        endereco: crmAcoesProspeccao.endereco,
        numero: crmAcoesProspeccao.numero,
        cidade: crmAcoesProspeccao.cidade,
        uf: crmAcoesProspeccao.uf,
        relato: crmAcoesProspeccao.relato,
        googleEventId: crmAcoesProspeccao.googleEventId,
      })
      .from(crmAcoesProspeccao)
      .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
      .where(eq(crmAcoesProspeccao.id, acaoId))
      .limit(1)

    if (!acao) {
      return NextResponse.json({ error: "Ação de prospecção não encontrada" }, { status: 404 })
    }

    const startTime = `${acao.dataAcao}T${acao.hora || "09:00"}:00`
    const eventInput = {
      summary: buildEventSummary(acao),
      description: buildEventDescription(acao),
      startTime,
      location: buildEventLocation(acao),
    }

    let eventId: string

    if (acao.googleEventId) {
      await updateCalendarEvent(accessToken, acao.googleEventId, eventInput)
      eventId = acao.googleEventId
    } else {
      eventId = await createCalendarEvent(accessToken, eventInput)
    }

    await db
      .update(crmAcoesProspeccao)
      .set({ googleEventId: eventId, updatedAt: new Date() })
      .where(eq(crmAcoesProspeccao.id, acaoId))

    return NextResponse.json({ success: true, eventId })
  } catch (error: any) {
    console.error("[SYNC GOOGLE]", error.message)
    return NextResponse.json(
      { error: "Erro ao sincronizar com Google Calendar" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session
    const accessToken = (session.user as any).accessToken
    if (!accessToken) {
      return NextResponse.json({ error: "Login via Google necessário" }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const acaoId = parseInt(searchParams.get("acaoId") || "0")

    const [acao] = await db
      .select({ googleEventId: crmAcoesProspeccao.googleEventId })
      .from(crmAcoesProspeccao)
      .where(eq(crmAcoesProspeccao.id, acaoId))
      .limit(1)

    if (!acao?.googleEventId) {
      return NextResponse.json({ error: "Ação de prospecção não sincronizada" }, { status: 400 })
    }

    await deleteCalendarEvent(accessToken, acao.googleEventId)

    await db
      .update(crmAcoesProspeccao)
      .set({ googleEventId: null, updatedAt: new Date() })
      .where(eq(crmAcoesProspeccao.id, acaoId))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[DESINCRONIZAR GOOGLE]", error.message)
    return NextResponse.json({ error: "Erro ao dessincronizar" }, { status: 500 })
  }
}
