import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core"
import { crmLeads } from "./crm-leads"
import { representantes } from "./representantes"

export const leadsRepresentantes = pgTable("leads_representantes", {
  id: serial("id").primaryKey(),
  pessoaId: integer("lead_id")
    .notNull()
    .references(() => crmLeads.id, { onDelete: "cascade" }),
  representanteId: integer("representante_id")
    .notNull()
    .references(() => representantes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
})

export type LeadRepresentante = typeof leadsRepresentantes.$inferSelect
export type NewLeadRepresentante = typeof leadsRepresentantes.$inferInsert
