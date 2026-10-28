import { pgTable, serial, varchar, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core"

export const integrocoes = pgTable("integrocoes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  empresa: varchar("empresa", { length: 10 }),
  pedido: varchar("pedido", { length: 20 }),
  separacao_id: bigint("separacao_id"),
  tipo_operacao: varchar("tipo_operacao", { length: 20 }).notNull(),
  payload: jsonb("payload"),
  status: varchar("status", { length: 20 }).notNull().default("PENDENTE"),
  tentativas: integer("tentativas").notNull().default(0),
  erro: text("erro"),
  criado_em: timestamp("criado_em").notNull().defaultNow(),
  processado_em: timestamp("processado_em"),
});

export type Integrocao = typeof integrocoes.$inferSelect;
export type NewIntegrocao = typeof integrocoes.$inferInsert;
