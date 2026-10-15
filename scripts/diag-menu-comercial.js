// Diagnostico: todos os menus, seus itens e os roles que tem acesso ao comercial.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const menus = await pool.query(
    "select id, role, titulo, ordem, ativo from user_menus order by role, ordem, titulo"
  )
  console.log("total de menus:", menus.rowCount)
  for (const m of menus.rows) {
    const itens = await pool.query(
      "select titulo, url, ordem, ativo from user_menu_itens where user_menu_id = $1 order by ordem, titulo",
      [m.id]
    )
    const temComercial = itens.rows.some((i) => i.url.startsWith("/comercial"))
    console.log(
      `\nMENU ${m.id} [${m.role}] "${m.titulo}" ordem=${m.ordem} ativo=${m.ativo} itens=${itens.rowCount}${temComercial ? "  << comercial" : ""}`
    )
    itens.rows.forEach((i) => console.log(`   ${i.ordem}. ${i.titulo} -> ${i.url}${i.ativo ? "" : " (inativo)"}`))
  }
  const perfis = await pool.query("select id, nome from perfis order by id").catch(() => null)
  if (perfis?.rows) console.log("\nperfis:", perfis.rows.map((p) => `${p.id}:${p.nome}`).join(", "))
  await pool.end()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
