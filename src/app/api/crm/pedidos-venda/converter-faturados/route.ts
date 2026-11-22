import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { eq, inArray } from "drizzle-orm"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { handleApiError } from "@/lib/api-error"

type ItemConversao = {
  pedidoId: number
  leadId: number | null
  converted: boolean
  mensagem: string
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const pedidoIds: number[] = Array.isArray(body.pedidoIds)
      ? body.pedidoIds.map((id: unknown) => Number(id)).filter(Boolean)
      : []

    if (pedidoIds.length === 0) {
      return NextResponse.json({ error: "Nenhum pedido selecionado" }, { status: 400 })
    }

    const pedidos: Array<{ pedidoId: number; empresaId: number | null }> = await db
      .select({
        pedidoId: crmPedidosVenda.id,
        empresaId: crmOportunidades.empresaId,
      })
      .from(crmPedidosVenda)
      .innerJoin(crmOportunidades, eq(crmPedidosVenda.oportunidadeId, crmOportunidades.id))
      .where(inArray(crmPedidosVenda.id, pedidoIds))

    const leads = Array.from(new Set(pedidos.map((p) => p.empresaId).filter(Boolean))) as number[]
    const itens: ItemConversao[] = pedidos.map((pedido) => ({
      pedidoId: pedido.pedidoId,
      leadId: pedido.empresaId,
      converted: false,
      mensagem: "Lead não resolvida",
    }))

    for (const leadId of leads) {
      const automacao = await processarAutomacaoCRM({
        entidade: "LEAD",
        entidadeId: leadId,
        acao: "ALTERAR_STATUS",
        statusNovo: "CONVERTIDO_CLIENTE",
        decisao: "CONVERTER",
        autor: { id: auth.userId, nome: auth.session.user.name },
        origem: "API",
      })

      const mensagem = automacao.ok
        ? "Lead convertida em cliente"
        : automacao.bloqueio || automacao.decisaoPendente?.mensagem || "Falha na conversão"

      for (const item of itens) {
        if (item.leadId === leadId) {
          item.converted = automacao.ok
          item.mensagem = mensagem
        }
      }
    }

    return NextResponse.json({
      itens,
      convertidas: itens.filter((item) => item.converted).length,
      falhas: itens.filter((item) => !item.converted).length,
    })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/pedidos-venda/converter-faturados")
  }
}
