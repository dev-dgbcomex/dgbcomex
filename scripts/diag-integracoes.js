// Diagnostico: como as integracoes de BI apontam para a api-microdata.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const { rows } = await pool.query(
    "select id, nome, base_url, telas, ativo from integracoes order by id"
  )
  for (const r of rows) {
    console.log(`${String(r.id).padStart(3)} ${r.ativo ? "ativo " : "inativo"} ${r.nome}`)
    console.log(`      ${r.base_url}   telas=${JSON.stringify(r.telas)}`)
  }
  await pool.end()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})