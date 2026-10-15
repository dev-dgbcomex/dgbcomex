// Diagnostico: colunas que o Drizzle declara x colunas que existem no banco.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const TABELAS = [
  ["crm_pessoas", ["tipo_pessoa", "resumo_ia", "sugestao_ia", "data_resumo_ia", "id_integracao"]],
  ["clientes", []],
  ["representantes", []],
]

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  for (const [tabela] of TABELAS) {
    const { rows } = await pool.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = $1 order by ordinal_position`,
      [tabela]
    )
    console.log(`${tabela}: ${rows.length} colunas -> ${rows.map((r) => r.column_name).join(", ")}`)
  }
  await pool.end()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})