import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { tipo, latitude, longitude } = body

    if (
      tipo !== "check_in" &&
      tipo !== "check_out" &&
      tipo !== "undo_check_in" &&
      tipo !== "undo_check_out"
    ) {
      return NextResponse.json(
        { error: "Tipo inválido (use check_in, check_out, undo_check_in ou undo_check_out)" },
        { status: 400 }
      )
    }

    const [acao] = await db
      .select()
      .from(crmAcoesProspeccao)
      .where(eq(crmAcoesProspeccao.id, parseInt(id)))
      .limit(1)

    if (!acao) {
      return NextResponse.json({ error: "Ação de prospecção não encontrada" }, { status: 404 })
    }

    const userRole = auth.session.user?.role ?? ""
    if (userRole !== "ADMIN" && userRole !== "SUDO" && acao.criadoPor !== auth.userId) {
      return NextResponse.json(
        { error: "Apenas o criador da ação de prospecção pode registrar check-in/out" },
        { status: 403 }
      )
    }

    if (tipo === "check_in" && acao.checkInTime) {
      return NextResponse.json({ error: "Check-in já realizado" }, { status: 400 })
    }
    if (tipo === "undo_check_in" && !acao.checkInTime) {
      return NextResponse.json({ error: "Check-in não foi realizado" }, { status: 400 })
    }
    if (tipo === "undo_check_out" && !acao.checkOutTime) {
      return NextResponse.json({ error: "Check-out não foi realizado" }, { status: 400 })
    }
    if (tipo === "check_out" && !acao.checkInTime) {
      return NextResponse.json({ error: "Faça check-in primeiro" }, { status: 400 })
    }
    if (tipo === "check_out" && acao.checkOutTime) {
      return NextResponse.json({ error: "Check-out já realizado" }, { status: 400 })
    }

    const values: Record<string, any> = { updatedAt: new Date() }
    if (tipo === "check_in") {
      values.checkInTime = new Date()
      values.checkInLat = latitude ?? null
      values.checkInLng = longitude ?? null
      if (acao.status === "AGENDADA") {
        values.status = "EM_ANDAMENTO"
      }
    } else if (tipo === "undo_check_in") {
      values.checkInTime = null
      values.checkInLat = null
      values.checkInLng = null
      if (acao.status === "EM_ANDAMENTO") {
        values.status = "AGENDADA"
      }
    } else if (tipo === "undo_check_out") {
      values.checkOutTime = null
      values.checkOutLat = null
      values.checkOutLng = null
      if (acao.status === "REALIZADA") {
        values.status = "EM_ANDAMENTO"
      }
    } else {
      values.checkOutTime = new Date()
      values.checkOutLat = latitude ?? null
      values.checkOutLng = longitude ?? null
      if (acao.status === "EM_ANDAMENTO") {
        values.status = "REALIZADA"
      }
    }

    const [atualizada] = await db
      .update(crmAcoesProspeccao)
      .set(values)
      .where(eq(crmAcoesProspeccao.id, parseInt(id)))
      .returning()

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error(`[POST /api/crm/acoes-prospeccao/[id]/check]`, error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
