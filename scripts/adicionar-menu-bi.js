// Cria o menu "BI" para o role ADMIN com o item de Integracoes no banco principal.
// Idempotente: se o menu/item ja existir, nao duplica.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const ROLE = "ADMIN"
const ITENS = [{ titulo: "Integrações", url: "/bi/integracoes", ordem: 0 }]

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const existing = await pool.query(
    `SELECT id, ordem FROM user_menus WHERE role = $1 AND titulo = 'BI' ORDER BY id`,
    [ROLE]
  )
  let menuId = existing.rowCount > 0 ? existing.rows[0].id : null

  if (!menuId) {
    const nextOrdem = await pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM user_menus WHERE role = $1`,
      [ROLE]
    )
    const ordem = nextOrdem.rows[0].prox
    const ins = await pool.query(
      `INSERT INTO user_menus (role, titulo, icone, ordem, ativo, created_at, updated_at)
       VALUES ($1, 'BI', 'BarChart3', $2, true, now(), now()) RETURNING id`,
      [ROLE, ordem]
    )
    menuId = ins.rows[0].id
    console.log(`Menu criado: id=${menuId} role=${ROLE} ordem=${ordem}`)
  } else {
    console.log(`Menu ja existia: id=${menuId}`)
  }

  for (const item of ITENS) {
    const { rowCount } = await pool.query(
      `SELECT id FROM user_menu_itens WHERE user_menu_id = $1 AND url = $2`,
      [menuId, item.url]
    )
    if (rowCount > 0) {
      console.log(`  (ja existe) ${item.titulo} ${item.url}`)
      continue
    }
    const ins = await pool.query(
      `INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem, ativo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, now(), now()) RETURNING id`,
      [menuId, item.titulo, item.url, item.ordem]
    )
    console.log(`  + ${item.titulo} ${item.url} (id=${ins.rows[0].id})`)
  }

  const final = await pool.query(
    `SELECT ui.id, ui.titulo, ui.url, ui.ordem FROM user_menu_itens ui
     WHERE ui.user_menu_id = $1 AND ui.ativo = true ORDER BY ui.ordem`,
    [menuId]
  )
  console.log(`\nMenu BI (id=${menuId}) com ${final.rowCount} itens:`)
  final.rows.forEach((i) => console.log(`  ${i.ordem}. ${i.titulo} (${i.url})`))

  await pool.end()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })