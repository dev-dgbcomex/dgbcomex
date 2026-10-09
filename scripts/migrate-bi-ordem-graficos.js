/**
 * Adiciona `usuarios.bi_ordem_graficos` **apenas** no banco da `DATABASE_URL`.
 *
 * Diferente de `sync-all-dbs.js`, que varre os 4 bancos: este script é cirúrgico,
 * para quando só o Neon precisa da coluna. É idempotente e não altera nenhum outro
 * objeto — só a coluna nova.
 *
 *   node scripts/migrate-bi-ordem-graficos.js
 */
import { Client } from "pg"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })

const COLUNA = "bi_ordem_graficos"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL nao definida (esperava .env.local ou .env)")
    process.exit(1)
  }

  // Só mostra o host para conferir qual banco é; nunca a senha.
  const host = new URL(url).hostname
  console.log(`Banco alvo: ${host}`)

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    const antes = await client.query(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'usuarios' and column_name = $1`,
      [COLUNA]
    )

    if (antes.rowCount > 0) {
      console.log(`Coluna ${COLUNA} ja existe — nada a fazer.`)
    } else {
      await client.query(
        `alter table usuarios add column if not exists ${COLUNA} jsonb default '[]'::jsonb`
      )
      console.log(`Coluna ${COLUNA} adicionada.`)
    }

    const depois = await client.query(
      `select column_name, data_type, column_default
         from information_schema.columns
        where table_schema = 'public' and table_name = 'usuarios' and column_name = $1`,
      [COLUNA]
    )
    console.log("Verificacao:", JSON.stringify(depois.rows[0]))

    // Um SELECT real na tabela prova que a coluna é utilizável de fato.
    const amostra = await client.query(
      `select count(*)::int as total,
              count(${COLUNA})::int as preenchidas
         from usuarios`
    )
    console.log("Usuarios:", JSON.stringify(amostra.rows[0]))
    console.log("\nOK — somente este banco foi alterado.")
  } finally {
    await client.end()
  }
}

main().catch((erro) => {
  console.error("ERRO:", erro.message)
  process.exit(1)
})