// Cria o menu "WMS" (Armazém) para o role ADMIN com seus itens.
// Idempotente: se o menu/item ja existir, nao duplica.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const ROLE = "ADMIN"
const TITULO_MENU = "WMS"
const ITENS = [
  { titulo: "Dashboard", url: "/wms", ordem: 0 },
  { titulo: "Pedidos", url: "/wms/pedidos", ordem: 1 },
  { titulo: "Situações", url: "/wms/situacoes", ordem: 2 },
  { titulo: "Ordens de Separação", url: "/wms/separacoes", ordem: 3 },
  { titulo: "Estoque em Aberto", url: "/wms/estoque", ordem: 4 },
  { titulo: "Gavetas", url: "/wms/gavetas", ordem: 5 },
]
const URLS_OBSOLETAS = ["/wms/enderecos", "/wms/movimentos"]

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const existing = await pool.query(
    `SELECT id, ordem FROM user_menus WHERE role = $1 AND titulo = $2 ORDER BY id`,
    [ROLE, TITULO_MENU]
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
       VALUES ($1, $2, 'Warehouse', $3, true, now(), now()) RETURNING id`,
      [ROLE, TITULO_MENU, ordem]
    )
    menuId = ins.rows[0].id
    console.log(`Menu criado: id=${menuId} role=${ROLE} ordem=${ordem}`)
  } else {
    console.log(`Menu ja existia: id=${menuId}`)
  }

  for (const url of URLS_OBSOLETAS) {
    const { rowCount } = await pool.query(
      `DELETE FROM user_menu_itens WHERE user_menu_id = $1 AND url = $2`,
      [menuId, url]
    )
    if (rowCount > 0) console.log(`  - removido item obsoleto ${url}`)
  }

  for (const item of ITENS) {
    const existente = await pool.query(
      `SELECT id, titulo, ordem FROM user_menu_itens WHERE user_menu_id = $1 AND url = $2`,
      [menuId, item.url]
    )
    if (existente.rowCount > 0) {
      const atual = existente.rows[0]
      if (atual.titulo !== item.titulo || atual.ordem !== item.ordem) {
        await pool.query(
          `UPDATE user_menu_itens SET titulo = $1, ordem = $2, updated_at = now() WHERE id = $3`,
          [item.titulo, item.ordem, atual.id]
        )
        console.log(`  ~ ${item.titulo} ${item.url}`)
      } else {
        console.log(`  (ja existe) ${item.titulo} ${item.url}`)
      }
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
  console.log(`\nMenu ${TITULO_MENU} (id=${menuId}) com ${final.rowCount} itens:`)
  final.rows.forEach((i) => console.log(`  ${i.ordem}. ${i.titulo} (${i.url})`))

  await pool.end()
  process.exit(0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
