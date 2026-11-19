import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core"
import { crmAcoesProspeccaoPesquisas } from "./crm-acoes-prospeccao-pesquisas"

export const crmAcoesProspeccaoPesquisasRespostas = pgTable(
  "crm_acoes_prospeccao_pesquisas_respostas",
  {
    id: serial("id").primaryKey(),
    pesquisaId: integer("pesquisa_id")
      .notNull()
      .references(() => crmAcoesProspeccaoPesquisas.id, { onDelete: "cascade" }),
    pergunta: varchar("pergunta", { length: 200 }).notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("ALTERNATIVA"),
    resposta: text("resposta"),
    createdAt: timestamp("created_at").defaultNow(),
  }
)

export type CrmAcaoProspeccaoPesquisaResposta =
  typeof crmAcoesProspeccaoPesquisasRespostas.$inferSelect
export type NewCrmAcaoProspeccaoPesquisaResposta =
  typeof crmAcoesProspeccaoPesquisasRespostas.$inferInsert
