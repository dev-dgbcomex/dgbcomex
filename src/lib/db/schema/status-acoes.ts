import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core"
import { status } from "./status"

export const statusAcoes = pgTable(
  "status_acoes",
  {
    id: serial("id").primaryKey(),
    statusId: integer("status_id")
      .notNull()
      .references(() => status.id, { onDelete: "cascade" }),
    acao: varchar("acao", { length: 50 }).notNull(),
    parametros: jsonb("parametros").$type<Record<string, unknown>>().default({}),
    ativo: boolean("ativo").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t: any) => ({
    idxStatusAcoesStatus: index("idx_status_acoes_status_id").on(t.statusId),
  })
)

export type StatusAcao = typeof statusAcoes.$inferSelect
export type NewStatusAcao = typeof statusAcoes.$inferInsert
