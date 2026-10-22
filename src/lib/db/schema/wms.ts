/**
 * WMS — tabelas locais (`dgbcomex_warehouse`).
 *
 * IMPORTANTE: este schema NÃO é migrado para o Neon. O WMS vive no PostgreSQL local
 * (ver `src/lib/db/local.ts` e `scripts/migrar-wms-local.js`). O ERP é somente leitura:
 * as peças vêm de `raw.cte_peca`/`raw.cte_baixa`, nunca são escritas.
 */
import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"

export const WMS_MOVIMENTO_TIPO = ["ENTRADA", "SAIDA", "TRANSFERENCIA", "AJUSTE"] as const
export type WmsMovimentoTipo = (typeof WMS_MOVIMENTO_TIPO)[number]

export const WMS_ENDERECO_TIPO = ["PULMAO", "PICKING", "EXPEDICAO", "AVARIA"] as const
export type WmsEnderecoTipo = (typeof WMS_ENDERECO_TIPO)[number]

export const wmsEnderecos = pgTable(
  "wms_enderecos",
  {
    id: serial("id").primaryKey(),
    codigo: varchar("codigo", { length: 60 }).notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("PULMAO"),
    zona: varchar("zona", { length: 60 }),
    rua: varchar("rua", { length: 30 }),
    predio: varchar("predio", { length: 30 }),
    nivel: varchar("nivel", { length: 30 }),
    apto: varchar("apto", { length: 30 }),
    capacidade: numeric("capacidade", { precision: 12, scale: 2 }),
    ativo: boolean("ativo").notNull().default(true),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t: any) => [uniqueIndex("wms_enderecos_codigo_key").on(t.codigo)]
)

export const wmsEstoque = pgTable(
  "wms_estoque",
  {
    id: serial("id").primaryKey(),
    enderecoId: integer("endereco_id")
      .notNull()
      .references(() => wmsEnderecos.id, { onDelete: "restrict" }),
    empresa: varchar("empresa", { length: 10 }),
    nroRolo: varchar("nro_rolo", { length: 30 }).notNull(),
    nroPeca: varchar("nro_peca", { length: 30 }).notNull(),
    produto: varchar("produto", { length: 30 }),
    categoria: varchar("categoria", { length: 10 }),
    cor: varchar("cor", { length: 10 }),
    desenho: varchar("desenho", { length: 10 }),
    variante: varchar("variante", { length: 10 }),
    largura: varchar("largura", { length: 20 }),
    metros: numeric("metros", { precision: 18, scale: 2 }),
    peso: numeric("peso", { precision: 18, scale: 2 }),
    situacao: varchar("situacao", { length: 10 }),
    loteInterno: varchar("lote_interno", { length: 40 }),
    dataEntrada: date("data_entrada"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t: any) => [
    uniqueIndex("wms_estoque_rolo_peca_key").on(t.nroRolo, t.nroPeca),
    index("wms_estoque_endereco_idx").on(t.enderecoId),
  ]
)

export const wmsMovimentos = pgTable(
  "wms_movimentos",
  {
    id: serial("id").primaryKey(),
    tipo: varchar("tipo", { length: 20 }).notNull(),
    estoqueId: integer("estoque_id").references(() => wmsEstoque.id, {
      onDelete: "set null",
    }),
    enderecoOrigemId: integer("endereco_origem_id").references(() => wmsEnderecos.id, {
      onDelete: "set null",
    }),
    enderecoDestinoId: integer("endereco_destino_id").references(() => wmsEnderecos.id, {
      onDelete: "set null",
    }),
    usuarioId: integer("usuario_id"),
    metros: numeric("metros", { precision: 18, scale: 2 }),
    peso: numeric("peso", { precision: 18, scale: 2 }),
    observacao: text("observacao"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t: any) => [
    index("wms_movimentos_created_idx").on(t.createdAt),
    index("wms_movimentos_estoque_idx").on(t.estoqueId),
  ]
)

export type WmsEndereco = typeof wmsEnderecos.$inferSelect
export type WmsEstoque = typeof wmsEstoque.$inferSelect
export type WmsMovimento = typeof wmsMovimentos.$inferSelect
