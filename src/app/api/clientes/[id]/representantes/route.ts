import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { clientesRepresentantes } from "@/lib/db/schema/clientes-representantes"
import { representantes } from "@/lib/db/schema/representantes"
import { eq, and, desc } from "drizzle-orm"
import { registrarLog } from "@/lib/notificar"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    const membros = await db
      .select({
        id: clientesRepresentantes.id,
        clienteId: clientesRepresentantes.clienteId,
        representanteId: clientesRepresentantes.representanteId,
        nome: representantes.nome,
        cnpj: representantes.cnpj,
        cidade: representantes.cidade,
        uf: representantes.uf,
        email: representantes.email,
        telefone: representantes.telefone,
        contato: representantes.contato,
        createdAt: clientesRepresentantes.createdAt,
      })
      .from(clientesRepresentantes)
      .innerJoin(representantes, eq(clientesRepresentantes.representanteId, representantes.id))
      .where(eq(clientesRepresentantes.clienteId, parseInt(id)))
      .orderBy(desc(clientesRepresentantes.createdAt))

    return NextResponse.json(membros)
  } catch (error) {
    console.error("[GET /api/clientes/[id]/representantes]", error)
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
      .from(clientesRepresentantes)
      .where(
        and(
          eq(clientesRepresentantes.clienteId, parseInt(id)),
          eq(clientesRepresentantes.representanteId, representanteId)
        )
      )
      .limit(1)

    if (existente) {
      return NextResponse.json(
        { error: "Representante já vinculado a este cliente" },
        { status: 409 }
      )
    }

    const [novo] = await db
      .insert(clientesRepresentantes)
      .values({
        clienteId: parseInt(id),
        representanteId,
      })
      .returning()

    const [representante] = await db
      .select({ nome: representantes.nome })
      .from(representantes)
      .where(eq(representantes.id, representanteId))
      .limit(1)

    await registrarLog({
      tipo: "ATUALIZACAO",
      acao: "vincular_representante",
      descricao: `Representante vinculado ao cliente: ${representante?.nome || `representante ${representanteId}`}`,
      entidade: "CrmCliente",
      entidadeId: parseInt(id),
      usuarioNome: auth.session.user?.name,
    })

    return NextResponse.json(novo, { status: 201 })
  } catch (error) {
    console.error("[POST /api/clientes/[id]/representantes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const vinculoId = searchParams.get("vinculoId")

    let nomeRepresentante = ""
    if (vinculoId) {
      const [vinculo] = await db
        .select({ nome: representantes.nome })
        .from(clientesRepresentantes)
        .innerJoin(representantes, eq(clientesRepresentantes.representanteId, representantes.id))
        .where(
          and(
            eq(clientesRepresentantes.id, parseInt(vinculoId)),
            eq(clientesRepresentantes.clienteId, parseInt(id))
          )
        )
        .limit(1)
      nomeRepresentante = vinculo?.nome || ""
    }

    if (vinculoId) {
      await db
        .delete(clientesRepresentantes)
        .where(
          and(
            eq(clientesRepresentantes.id, parseInt(vinculoId)),
            eq(clientesRepresentantes.clienteId, parseInt(id))
          )
        )
    } else {
      const body = await req.json()
      const [vinculo] = await db
        .select({ nome: representantes.nome })
        .from(clientesRepresentantes)
        .innerJoin(representantes, eq(clientesRepresentantes.representanteId, representantes.id))
        .where(
          and(
            eq(clientesRepresentantes.clienteId, parseInt(id)),
            eq(clientesRepresentantes.representanteId, body.representanteId)
          )
        )
        .limit(1)
      nomeRepresentante = vinculo?.nome || ""

      await db
        .delete(clientesRepresentantes)
        .where(
          and(
            eq(clientesRepresentantes.clienteId, parseInt(id)),
            eq(clientesRepresentantes.representanteId, body.representanteId)
          )
        )
    }

    await registrarLog({
      tipo: "ATUALIZACAO",
      acao: "remover_representante",
      descricao: `Representante removido do cliente: ${nomeRepresentante || "representante"}`,
      entidade: "CrmCliente",
      entidadeId: parseInt(id),
      usuarioNome: auth.session.user?.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/clientes/[id]/representantes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
