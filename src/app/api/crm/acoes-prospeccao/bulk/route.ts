import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
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
      return NextResponse.json({ error: "ids e status são obrigatórios" }, { status: 400 })
    }

    const allowed = ["AGENDADA", "EM_ANDAMENTO", "REALIZADA", "CANCELADA"]
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    const userId = auth.userId
    const role = auth.session.user?.role

    if (!podeGerenciarTudo(role)) {
      const acoes: { id: number; criadoPor: number | null }[] = await db
        .select({ id: crmAcoesProspeccao.id, criadoPor: crmAcoesProspeccao.criadoPor })
        .from(crmAcoesProspeccao)
        .where(inArray(crmAcoesProspeccao.id, idList))
      const unauthorized = acoes.filter((v) => !podeGerenciarRegistro(role, v.criadoPor, userId))
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { error: `${unauthorized.length} ação(ões) de prospecção sem permissão para alterar` },
          { status: 403 }
        )
      }
    }

    await db.update(crmAcoesProspeccao).set({ status }).where(inArray(crmAcoesProspeccao.id, idList))

    return NextResponse.json({ updated: idList.length })
  } catch (error) {
    console.error("[PATCH /api/crm/acoes-prospeccao/bulk]", error)
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
      return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 })
    }

    if (!podeGerenciarTudo(auth.session.user?.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    await db.delete(crmAcoesProspeccao).where(inArray(crmAcoesProspeccao.id, ids))

    await notificar(
      "ACAO_PROSPECCAO_EXCLUIDA",
      `${ids.length} ação(ões) de prospecção excluída(s) em lote`,
      `/comercial/crm/acoes-prospeccao`,
      auth.session.user.name
    )

    return NextResponse.json({ deleted: ids.length })
  } catch (error) {
    console.error("[DELETE /api/crm/acoes-prospeccao/bulk]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
