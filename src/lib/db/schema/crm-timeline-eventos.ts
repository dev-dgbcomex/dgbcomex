import { pgTable, serial, integer, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core"
import { crmLeads } from "./crm-leads"
import { clientes } from "./clientes"

export const crmTimelineEventos = pgTable("crm_timeline_eventos", {
  id: serial("id").primaryKey(),
  empresaId: integer("lead_id").references(() => crmLeads.id),
  clienteId: integer("cliente_id").references(() => clientes.id),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  descricao: text("descricao").notNull(),
  metadados: jsonb("metadados").$type<Record<string, any>>().default({}),
  dataEvento: timestamp("data_evento").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
})

export type CrmTimelineEvento = typeof crmTimelineEventos.$inferSelect
export type NewCrmTimelineEvento = typeof crmTimelineEventos.$inferInsert
