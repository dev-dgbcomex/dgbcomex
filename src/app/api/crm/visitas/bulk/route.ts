import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { inArray } from "drizzle-orm"
import { notificar } from "@/lib/notificar"
import { podeGerenciarRegistro, podeGerenciarTudo } from "@/lib/permissoes"

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const { ids, status } = body
    const idList = (Array.isArray(ids) ? ids : []).filter(
      (id: unknown): id is number => typeof id === "number"
    )

    if (idList.length === 0 || !status) {
      return NextResponse.json({ error: "ids e status sao obrigatorios" }, { status: 400 })
    }

    const allowed = ["AGENDADA", "EM_ANDAMENTO", "REALIZADA", "CANCELADA"]
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 })
    }

    const userId = auth.userId
    const role = auth.session.user?.role

    if (!podeGerenciarTudo(role)) {
      const visitas: { id: number; criadoPor: number | null }[] = await db
        .select({ id: crmVisitas.id, criadoPor: crmVisitas.criadoPor })
        .from(crmVisitas)
        .where(inArray(crmVisitas.id, idList))
      const unauthorized = visitas.filter((v) => !podeGerenciarRegistro(role, v.criadoPor, userId))
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { error: `${unauthorized.length} visita(s) sem permissao para alterar` },
          { status: 403 }
        )
      }
    }

    await db.update(crmVisitas).set({ status }).where(inArray(crmVisitas.id, idList))

    return NextResponse.json({ updated: idList.length })
  } catch (error) {
    console.error("[PATCH /api/crm/visitas/bulk]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const { ids } = body

    if (!ids?.length) {
      return NextResponse.json({ error: "ids e obrigatorios" }, { status: 400 })
    }

    if (!podeGerenciarTudo(auth.session.user?.role)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    await db.delete(crmVisitas).where(inArray(crmVisitas.id, ids))

    await notificar(
      "VISITA_CRIADA",
      `${ids.length} visita(s) excluida(s) em lote`,
      `/comercial/crm/visitas`,
      auth.session.user.name
    )

    return NextResponse.json({ deleted: ids.length })
  } catch (error) {
    console.error("[DELETE /api/crm/visitas/bulk]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
