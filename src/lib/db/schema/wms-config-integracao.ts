import { pgTable, serial, varchar, jsonb, boolean, timestamp } from "drizzle-orm/pg-core"

export const wmsConfigIntegracao = pgTable("wms_config_integracao", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  baseUrl: varchar("base_url", { length: 500 }).notNull(),
  tipoAuth: varchar("tipo_auth", { length: 20 }).notNull().default("login"),
  authConfig: jsonb("auth_config").notNull().default({}),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export type WmsConfigIntegracao = typeof wmsConfigIntegracao.$inferSelect
export type NewWmsConfigIntegracao = typeof wmsConfigIntegracao.$inferInsert
