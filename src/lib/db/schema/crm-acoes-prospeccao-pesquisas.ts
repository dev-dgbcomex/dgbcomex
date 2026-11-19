import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core"
import { crmAcoesProspeccao } from "./crm-acoes-prospeccao"
import { usuarios } from "./usuarios"

export const crmAcoesProspeccaoPesquisas = pgTable("crm_acoes_prospeccao_pesquisas", {
  id: serial("id").primaryKey(),
  acaoId: integer("acao_id")
    .notNull()
    .references(() => crmAcoesProspeccao.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  nome: varchar("nome", { length: 255 }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  enviadoEm: timestamp("enviado_em"),
  abertoEm: timestamp("aberto_em"),
  respondidoEm: timestamp("respondido_em"),
  status: varchar("status", { length: 20 }).notNull().default("PENDENTE"),
  criadoPor: integer("criado_por").references(() => usuarios.id),
  createdAt: timestamp("created_at").defaultNow(),
})

export type CrmAcaoProspeccaoPesquisa = typeof crmAcoesProspeccaoPesquisas.$inferSelect
export type NewCrmAcaoProspeccaoPesquisa = typeof crmAcoesProspeccaoPesquisas.$inferInsert
