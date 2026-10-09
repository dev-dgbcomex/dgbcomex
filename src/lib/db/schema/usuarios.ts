import { pgTable, serial, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core"

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("COMERCIAL"),
  ativo: boolean("ativo").default(true),
  idIntegracao: varchar("id_integracao", { length: 100 }),
  paginaInicial: varchar("pagina_inicial", { length: 255 }),
  ultimoAcesso: timestamp("ultimo_acesso"),
  createdAt: timestamp("created_at").defaultNow(),
  celWhatsapp: varchar("cel_whatsapp", { length: 20 }),
  updatedAt: timestamp("updated_at").defaultNow(),
  biOrdemCards: jsonb("bi_ordem_cards").$type<number[]>().default([]),
  biOrdemGraficos: jsonb("bi_ordem_graficos").$type<string[]>().default([]),
})

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usuarios.id)
    .notNull(),
  sessionToken: varchar("session_token", { length: 255 }).unique().notNull(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})
