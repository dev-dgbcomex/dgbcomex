// Diagnostico: com as integracoes apontam (base_url e login_url).
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const { rows } = await pool.query(
    "select nome, base_url, auth_config->>'login_url' as login_url, telas, ativo from integracoes order by id"
  )
  for (const r of rows) {
    console.log(`${String(r.nome).padEnd(30)} ${r.ativo ? "ativo" : "INATIVO"}`)
    console.log(`   base    : ${r.base_url}`)
    console.log(`   login   : ${r.login_url}`)
    console.log(`   telas   : ${JSON.stringify(r.telas)}`)
  }
  await pool.end()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})