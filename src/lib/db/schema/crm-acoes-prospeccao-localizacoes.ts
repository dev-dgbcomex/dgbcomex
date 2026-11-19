import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core"
import { crmAcoesProspeccao } from "./crm-acoes-prospeccao"
import { usuarios } from "./usuarios"

export const crmAcoesProspeccaoLocalizacoes = pgTable("crm_acoes_prospeccao_localizacoes", {
  id: serial("id").primaryKey(),
  acaoId: integer("acao_id")
    .notNull()
    .references(() => crmAcoesProspeccao.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  endereco: varchar("endereco", { length: 500 }),
  observacao: text("observacao"),
  fotoUrl: varchar("foto_url", { length: 500 }),
  tipo: varchar("tipo", { length: 20 }).notNull().default("LOCAL"),
  criadoPor: integer("criado_por").references(() => usuarios.id),
  createdAt: timestamp("created_at").defaultNow(),
})

export type CrmAcaoProspeccaoLocalizacao = typeof crmAcoesProspeccaoLocalizacoes.$inferSelect
export type NewCrmAcaoProspeccaoLocalizacao = typeof crmAcoesProspeccaoLocalizacoes.$inferInsert
