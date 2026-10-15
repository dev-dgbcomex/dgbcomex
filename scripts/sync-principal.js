// Aplica no DATABASE_URL principal o mesmo SQL de `sync-all-dbs.js`.
//
// O `sync-all-dbs.js` roda so nos bancos secundarios (pdm_pro_textil, pdm_ibirapuera,
// neon): o principal ficou de fora por definicao. Quando um ALTER precisa ir no
// principal, ele e replicado aqui — e este script le o MESMO arquivo, entao os dois
// nunca divergem. Idempotente (tudo e `ADD COLUMN IF NOT EXISTS` dentro de DO $$).
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const fs = require("node:fs")
const path = require("node:path")
const { Pool } = require("pg")

const ALVO = process.argv[2] || process.env.DATABASE_URL
if (!ALVO) {
  console.error("Informe o DATABASE_URL alvo (ou defina no .env.local)")
  process.exit(1)
}

/** Extrai a constante MIGRATION_SQL do sync-all-dbs.js sem executa-lo. */
function lerMigrationSql() {
  const arquivo = path.join(__dirname, "sync-all-dbs.js")
  const fonte = fs.readFileSync(arquivo, "utf8")
  const inicio = fonte.indexOf("const MIGRATION_SQL = `")
  if (inicio < 0) throw new Error("MIGRATION_SQL nao encontrada em sync-all-dbs.js")
  const corpo = fonte.slice(inicio).split("`")[1]
  return corpo
}

async function main() {
  const pool = new Pool({ connectionString: ALVO })
  try {
    const antes = await pool.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'crm_pessoas'`
    )
    console.log(`crm_pessoas antes: ${antes.rowCount} colunas`)
    await pool.query(lerMigrationSql())
    const depois = await pool.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'crm_pessoas'`
    )
    const gained = depois.rows
      .map((r) => r.column_name)
      .filter((c) => !antes.rows.some((a) => a.column_name === c))
    console.log(`crm_pessoas depois: ${depois.rowCount} colunas`)
    console.log(gained.length ? `+ ${gained.join(", ")}` : "nenhuma coluna nova")
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error("ERRO:", e.message)
  process.exit(1)
})