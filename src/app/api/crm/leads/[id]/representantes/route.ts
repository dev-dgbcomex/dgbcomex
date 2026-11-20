import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { leadsRepresentantes } from "@/lib/db/schema/leads-representantes"
import { representantes } from "@/lib/db/schema/representantes"
import { eq, and, desc } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    const membros = await db
      .select({
        id: leadsRepresentantes.id,
        pessoaId: leadsRepresentantes.pessoaId,
        representanteId: leadsRepresentantes.representanteId,
        nome: representantes.nome,
        cnpj: representantes.cnpj,
        cidade: representantes.cidade,
        uf: representantes.uf,
        email: representantes.email,
        telefone: representantes.telefone,
        contato: representantes.contato,
        createdAt: leadsRepresentantes.createdAt,
      })
      .from(leadsRepresentantes)
      .innerJoin(representantes, eq(leadsRepresentantes.representanteId, representantes.id))
      .where(eq(leadsRepresentantes.pessoaId, parseInt(id)))
      .orderBy(desc(leadsRepresentantes.createdAt))

    return NextResponse.json(membros)
  } catch (error) {
    console.error("[GET /api/crm/leads/[id]/representantes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { representanteId } = body

    if (!representanteId) {
      return NextResponse.json({ error: "representanteId é obrigatório" }, { status: 400 })
    }

    const [existente] = await db
      .select()
      .from(leadsRepresentantes)
      .where(
        and(
          eq(leadsRepresentantes.pessoaId, parseInt(id)),
          eq(leadsRepresentantes.representanteId, representanteId)
        )
      )
      .limit(1)

    if (existente) {
      return NextResponse.json(
        { error: "Representante já vinculado a esta lead" },
        { status: 409 }
      )
    }

    const [novo] = await db
      .insert(leadsRepresentantes)
      .values({
        pessoaId: parseInt(id),
        representanteId,
      })
      .returning()

    return NextResponse.json(novo, { status: 201 })
  } catch (error) {
    console.error("[POST /api/crm/leads/[id]/representantes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const vinculoId = searchParams.get("id")

    if (!vinculoId) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }

    await db
      .delete(leadsRepresentantes)
      .where(
        and(
          eq(leadsRepresentantes.id, parseInt(vinculoId)),
          eq(leadsRepresentantes.pessoaId, parseInt(id))
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/crm/leads/[id]/representantes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
