import { jsonb, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"

export const campoVisibilidade = pgTable(
  "campo_visibilidade",
  {
    id: serial("id").primaryKey(),
    cadastro: varchar("cadastro", { length: 80 }).notNull(),
    campo: varchar("campo", { length: 80 }).notNull(),
    rolesOcultos: jsonb("roles_ocultos").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t: any) => [uniqueIndex("campo_visibilidade_cadastro_campo_key").on(t.cadastro, t.campo)]
)

export type CampoVisibilidade = typeof campoVisibilidade.$inferSelect
export type NovoCampoVisibilidade = typeof campoVisibilidade.$inferInsert
