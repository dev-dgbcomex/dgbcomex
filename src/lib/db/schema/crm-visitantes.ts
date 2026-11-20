import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core"
import { usuarios } from "./usuarios"
import { crmLeads } from "./crm-leads"

export const crmVisitantes = pgTable("crm_visitantes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  empresaNome: varchar("empresa_nome", { length: 200 }),
  cargo: varchar("cargo", { length: 100 }),
  tipoPessoa: varchar("tipo_pessoa", { length: 2 }),
  documento: varchar("documento", { length: 18 }),
  origem: varchar("origem", { length: 30 }).notNull().default("OUTRO"),
  status: varchar("status", { length: 30 }).notNull().default("NOVO"),
  descricao: text("descricao"),
  responsavelId: integer("responsavel_id").references(() => usuarios.id),
  empresaId: integer("lead_id_legado"),
  pessoaId: integer("lead_id").references(() => crmLeads.id),
  score: integer("score").default(0),
  prioridade: varchar("prioridade", { length: 20 }).default("BAIXA"),
  segmentoIa: varchar("segmento_ia", { length: 100 }),
  porteIa: varchar("porte_ia", { length: 50 }),
  dataClassificacaoIa: timestamp("data_classificacao_ia"),
  idIntegracao: varchar("id_integracao", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type CrmVisitante = typeof crmVisitantes.$inferSelect
export type NewCrmVisitante = typeof crmVisitantes.$inferInsert
