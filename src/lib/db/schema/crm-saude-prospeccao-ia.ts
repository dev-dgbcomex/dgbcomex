import { integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { usuarios } from "./usuarios"

export const crmSaudeProspeccaoAnalises = pgTable("crm_saude_prospeccao_analises", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 300 }).notNull(),
  analise: text("analise").notNull(),
  resumo: text("resumo"),
  contexto: jsonb("contexto").$type<Record<string, unknown>>().default({}).notNull(),
  filtros: jsonb("filtros").$type<Record<string, unknown>>().default({}).notNull(),
  provedor: varchar("provedor", { length: 40 }),
  modelo: varchar("modelo", { length: 120 }),
  situacao: varchar("situacao", { length: 20 }).notNull().default("ABERTA"),
  enviadaEm: timestamp("enviada_em"),
  criadoPor: integer("criado_por").references(() => usuarios.id),
  criadoPorNome: varchar("criado_por_nome", { length: 255 }),
  criadoPorEmail: varchar("criado_por_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const crmSaudeProspeccaoMensagens = pgTable("crm_saude_prospeccao_mensagens", {
  id: serial("id").primaryKey(),
  analiseId: integer("analise_id")
    .notNull()
    .references(() => crmSaudeProspeccaoAnalises.id, { onDelete: "cascade" }),
  papel: varchar("papel", { length: 10 }).notNull(),
  conteudo: text("conteudo").notNull(),
  dadosUsados: jsonb("dados_usados").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type CrmSaudeProspeccaoAnalise = typeof crmSaudeProspeccaoAnalises.$inferSelect
export type CrmSaudeProspeccaoMensagem = typeof crmSaudeProspeccaoMensagens.$inferSelect
