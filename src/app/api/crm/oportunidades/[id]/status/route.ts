import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { eq } from "drizzle-orm"
import { processarAutomacaoCRM, type DecisaoAutomacao } from "@/lib/crm/automacoes-crm"
import { handleApiError } from "@/lib/api-error"
import { validarCamposObrigatoriosOportunidade } from "@/lib/crm/validacao-oportunidade"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { status, motivoPerda, decisao, valorEstimado, probabilidade } = body

    const [oportunidade] = await db
      .select({
        id: crmOportunidades.id,
        status: crmOportunidades.status,
        valorEstimado: crmOportunidades.valorEstimado,
        probabilidade: crmOportunidades.probabilidade,
      })
      .from(crmOportunidades)
      .where(eq(crmOportunidades.id, parseInt(id)))
      .limit(1)

    if (!oportunidade) {
      return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 })
    }

    const validacao = validarCamposObrigatoriosOportunidade({
      status,
      valorEstimado: valorEstimado !== undefined ? valorEstimado : oportunidade.valorEstimado,
      probabilidade: probabilidade !== undefined ? probabilidade : oportunidade.probabilidade,
    })

    if (!validacao.valido) {
      return NextResponse.json(
        {
          error: validacao.mensagem,
          validacaoObrigatoria: validacao,
        },
        { status: 409 }
      )
    }

    const automacao = await processarAutomacaoCRM({
      entidade: "OPORTUNIDADE",
      entidadeId: parseInt(id),
      acao: "ALTERAR_STATUS",
      statusNovo: status,
      motivoPerda,
      decisao: decisao as DecisaoAutomacao | undefined,
      valorEstimado,
      probabilidade,
      autor: { id: auth.userId, nome: auth.session.user.name },
      origem: "API",
    })

    if (!automacao.ok) {
      return NextResponse.json(
        {
          error: automacao.bloqueio || automacao.decisaoPendente?.mensagem || "Operação bloqueada",
          decisaoPendente: automacao.decisaoPendente,
          automacao,
        },
        { status: automacao.decisaoPendente ? 409 : 400 }
      )
    }

    if (valorEstimado !== undefined || probabilidade !== undefined) {
      await db
        .update(crmOportunidades)
        .set({
          valorEstimado: valorEstimado !== undefined ? (Number(valorEstimado) || null) : null,
          probabilidade: probabilidade !== undefined ? Number(probabilidade) : null,
          updatedAt: new Date(),
        })
        .where(eq(crmOportunidades.id, parseInt(id)))
    }

    return NextResponse.json({
      ...automacao.registro,
      ...(valorEstimado !== undefined ? { valorEstimado } : {}),
      ...(probabilidade !== undefined ? { probabilidade } : {}),
      automacao,
    })
  } catch (error) {
    return handleApiError(error, "PATCH /api/crm/oportunidades/[id]/status")
  }
}
