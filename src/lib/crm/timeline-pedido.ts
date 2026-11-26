import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"
import { inserirTimelineEvento } from "@/lib/crm-timeline"

export type TipoEventoPedidoVenda = "PEDIDO_VENDA" | "FATURAMENTO" | "SINCRONIZACAO_ERP"

export async function registrarEventoPedidoVenda(params: {
  pedidoVendaId: number
  oportunidadeId?: number | null
  empresaId?: number | null
  clienteId?: number | null
  tipo: TipoEventoPedidoVenda
  descricao: string
  metadados?: Record<string, unknown>
  chaveEvento: string
}): Promise<void> {
  if (!params.pedidoVendaId || !params.chaveEvento) return

  const [duplicado] = await db
    .select({ id: crmTimelineEventos.id })
    .from(crmTimelineEventos)
    .where(
      and(
        eq(crmTimelineEventos.tipo, params.tipo),
        sql`${crmTimelineEventos.metadados}->>'chaveEvento' = ${params.chaveEvento}`
      )
    )
    .limit(1)
  if (duplicado) return

  let empresaId = params.empresaId ?? null
  let clienteId = params.clienteId ?? null
  let oportunidadeId = params.oportunidadeId ?? null

  if (!empresaId && !clienteId) {
    if (!oportunidadeId) {
      const [pedido] = await db
        .select({ oportunidadeId: crmPedidosVenda.oportunidadeId })
        .from(crmPedidosVenda)
        .where(eq(crmPedidosVenda.id, params.pedidoVendaId))
        .limit(1)
      oportunidadeId = pedido?.oportunidadeId ?? null
    }
    if (!oportunidadeId) return

    const [oportunidade] = await db
      .select({
        empresaId: crmOportunidades.empresaId,
        clienteId: crmOportunidades.clienteId,
      })
      .from(crmOportunidades)
      .where(eq(crmOportunidades.id, oportunidadeId))
      .limit(1)
    empresaId = oportunidade?.empresaId ?? null
    clienteId = oportunidade?.clienteId ?? null
  }

  if (!empresaId && !clienteId) return

  await inserirTimelineEvento({
    empresaId,
    clienteId,
    tipo: params.tipo,
    descricao: params.descricao,
    metadados: {
      ...(params.metadados ?? {}),
      pedidoVendaId: params.pedidoVendaId,
      oportunidadeId,
      chaveEvento: params.chaveEvento,
    },
  })
}
