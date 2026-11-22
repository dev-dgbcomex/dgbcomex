import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { processarAutomacaoCRM, type DecisaoAutomacao } from "@/lib/crm/automacoes-crm"
import { handleApiError } from "@/lib/api-error"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const { status, motivoPerda, decisao } = await req.json()

    const automacao = await processarAutomacaoCRM({
      entidade: "OPORTUNIDADE",
      entidadeId: parseInt(id),
      acao: "ALTERAR_STATUS",
      statusNovo: status,
      motivoPerda,
      decisao: decisao as DecisaoAutomacao | undefined,
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

    return NextResponse.json({ ...automacao.registro, automacao })
  } catch (error) {
    return handleApiError(error, "PATCH /api/crm/oportunidades/[id]/status")
  }
}
