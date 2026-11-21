import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { usuarios } from "./usuarios"

export const crmResumosIa = pgTable(
  "crm_resumos_ia",
  {
    id: serial("id").primaryKey(),
    entidadeTipo: varchar("entidade_tipo", { length: 10 }).notNull(),
    entidadeId: integer("entidade_id").notNull(),
    resumo: text("resumo").notNull(),
    insights: text("insights"),
    sugestoes: text("sugestoes"),
    classificacao: varchar("classificacao", { length: 10 }).notNull(),
    motivoClassificacao: text("motivo_classificacao"),
    contexto: jsonb("contexto").$type<Record<string, unknown>>().default({}),
    provedor: varchar("provedor", { length: 40 }),
    modelo: varchar("modelo", { length: 120 }),
    tentativas: integer("tentativas").default(0),
    criadoPor: integer("criado_por").references(() => usuarios.id),
    criadoPorNome: varchar("criado_por_nome", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t: any) => [index("idx_crm_resumos_ia_entidade").on(t.entidadeTipo, t.entidadeId, t.createdAt)]
)

export type CrmResumoIa = typeof crmResumosIa.$inferSelect
export type NewCrmResumoIa = typeof crmResumosIa.$inferInsert
