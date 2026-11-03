import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { status, statusAcoes } from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api-error"
import { acaoPorValor } from "@/lib/crm/status-acoes"

export const dynamic = "force-dynamic"

function autorizado(role?: string | null) {
  return role === "ADMIN" || role === "SUDO"
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const statusId = req.nextUrl.searchParams.get("statusId")
    if (!statusId) {
      return NextResponse.json({ error: "statusId é obrigatório" }, { status: 400 })
    }

    const lista = await db
      .select({
        id: statusAcoes.id,
        statusId: statusAcoes.statusId,
        acao: statusAcoes.acao,
        parametros: statusAcoes.parametros,
        ativo: statusAcoes.ativo,
        statusNome: status.nome,
        statusRotulo: status.rotulo,
        statusTipo: status.tipo,
      })
      .from(statusAcoes)
      .innerJoin(status, eq(statusAcoes.statusId, status.id))
      .where(eq(statusAcoes.statusId, parseInt(statusId)))
      .orderBy(asc(statusAcoes.id))

    return NextResponse.json(lista)
  } catch (error) {
    return handleApiError(error, "GET /api/admin/status/acoes")
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!autorizado(auth.session.user?.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { statusId, acao, parametros, ativo } = await req.json()
    if (!statusId || !acao) {
      return NextResponse.json({ error: "statusId e acao são obrigatórios" }, { status: 400 })
    }

    const [statusRow] = await db
      .select({ id: status.id, tipo: status.tipo })
      .from(status)
      .where(eq(status.id, parseInt(statusId)))
      .limit(1)

    if (!statusRow) {
      return NextResponse.json({ error: "Status não encontrado" }, { status: 404 })
    }

    const definicao = acaoPorValor(acao)
    if (!definicao) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    if (!definicao.tipos.includes(statusRow.tipo)) {
      return NextResponse.json(
        { error: `A ação "${definicao.label}" não se aplica a status do tipo ${statusRow.tipo}` },
        { status: 400 }
      )
    }

    const [item] = await db
      .insert(statusAcoes)
      .values({
        statusId: parseInt(statusId),
        acao,
        parametros: parametros || {},
        ativo: ativo !== undefined ? ativo : true,
      })
      .returning()

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleApiError(error, "POST /api/admin/status/acoes")
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!autorizado(auth.session.user?.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id, acao, parametros, ativo } = await req.json()
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }

    const [item] = await db
      .update(statusAcoes)
      .set({
        ...(acao !== undefined && { acao }),
        ...(parametros !== undefined && { parametros }),
        ...(ativo !== undefined && { ativo }),
        updatedAt: new Date(),
      })
      .where(eq(statusAcoes.id, parseInt(id)))
      .returning()

    if (!item) {
      return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    return handleApiError(error, "PUT /api/admin/status/acoes")
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!autorizado(auth.session.user?.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }

    await db.delete(statusAcoes).where(eq(statusAcoes.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/admin/status/acoes")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!autorizado(auth.session.user?.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { statusId } = await req.json()
    if (!statusId) {
      return NextResponse.json({ error: "statusId é obrigatório" }, { status: 400 })
    }

    const lista = await db
      .select()
      .from(statusAcoes)
      .where(and(eq(statusAcoes.statusId, parseInt(statusId)), eq(statusAcoes.ativo, true)))

    return NextResponse.json(lista)
  } catch (error) {
    return handleApiError(error, "PATCH /api/admin/status/acoes")
  }
}
