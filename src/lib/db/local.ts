import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as wmsSchema from "./schema/wms"

const connectionString = process.env.DATABASE_URL_LOCAL

function criarDbLocal() {
  const client = postgres(connectionString as string, { prepare: false })
  return drizzle(client, { schema: { ...wmsSchema } })
}

type LocalDb = ReturnType<typeof criarDbLocal>

/**
 * Client do PostgreSQL local (`dgbcomex_warehouse`), usado só pelo WMS.
 *
 * A conexão é preguiçosa: sem `DATABASE_URL_LOCAL`, o import funciona normalmente e o
 * erro claro aparece apenas quando uma query é executada. Isso é necessário porque o
 * build (ex.: Vercel) importa as rotas para coletar metadados, mas não tem o banco local.
 */
export const dbLocal: LocalDb = connectionString
  ? criarDbLocal()
  : (new Proxy({} as LocalDb, {
      get() {
        throw new Error(
          "DATABASE_URL_LOCAL não configurada. O módulo WMS usa o PostgreSQL local " +
            "(dgbcomex_warehouse), não o Neon. Defina a variável em .env.local."
        )
      },
    }) as LocalDb)
