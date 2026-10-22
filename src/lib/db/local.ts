import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as wmsSchema from "./schema/wms"

const connectionString = process.env.DATABASE_URL_LOCAL

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_LOCAL não configurada. O módulo WMS usa o PostgreSQL local " +
      "(dgbcomex_warehouse), não o Neon. Defina a variável em .env.local."
  )
}

const client = postgres(connectionString, { prepare: false })

export const dbLocal = drizzle(client, { schema: { ...wmsSchema } })

export { client as clientLocal }
