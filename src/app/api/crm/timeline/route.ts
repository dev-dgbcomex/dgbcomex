import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"
import { eq, desc, inArray, or } from "drizzle-orm"
import { idsPessoasDoCliente } from "@/lib/crm/cliente-relacionamentos"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const pessoaId = searchParams.get("pessoaId")
    const clienteId = searchParams.get("clienteId")

    if (!pessoaId && !clienteId) {
      return NextResponse.json({ error: "pessoaId ou clienteId é obrigatório" }, { status: 400 })
    }

    let condicao
    if (pessoaId) {
      condicao = eq(crmTimelineEventos.empresaId, parseInt(pessoaId))
    } else {
      // Timeline do cliente: os eventos do próprio cliente + os eventos das
      // pessoas do CRM que viraram este cliente.
      const cliente = parseInt(clienteId!)
      const pessoas = await idsPessoasDoCliente(cliente)
      const partes: any[] = [eq(crmTimelineEventos.clienteId, cliente)]
      if (pessoas.length > 0) partes.push(inArray(crmTimelineEventos.empresaId, pessoas))
      condicao = or(...partes)
    }

    const eventos = await db
      .select()
      .from(crmTimelineEventos)
      .where(condicao)
      .orderBy(desc(crmTimelineEventos.dataEvento))
      .limit(50)

    return NextResponse.json(eventos)
  } catch (error) {
    console.error("[GET /api/crm/timeline]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
