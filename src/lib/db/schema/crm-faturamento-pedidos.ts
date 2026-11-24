import { integer, pgTable, timestamp } from "drizzle-orm/pg-core"
import { primaryKey } from "drizzle-orm/pg-core/primary-keys"
import { crmFaturamentos } from "./crm-faturamentos"
import { crmPedidosVenda } from "./crm-pedidos-venda"

export const crmFaturamentoPedidos = pgTable(
  "crm_faturamento_pedidos",
  {
    faturamentoId: integer("faturamento_id")
      .notNull()
      .references(() => crmFaturamentos.id, { onDelete: "cascade" }),
    pedidoVendaId: integer("pedido_venda_id")
      .notNull()
      .references(() => crmPedidosVenda.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t: any) => ({
    pk: primaryKey({ columns: [t.faturamentoId, t.pedidoVendaId] }),
  })
)

export type CrmFaturamentoPedido = typeof crmFaturamentoPedidos.$inferSelect
export type NewCrmFaturamentoPedido = typeof crmFaturamentoPedidos.$inferInsert
