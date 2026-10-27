// Insere o menu "WMS" para TODOS os usuarios (Neon).
//
// O /api/user/menus resolve nesta ordem: menus do usuario -> menus do role -> DEFAULT.
// Entao, para o WMS aparecer em todo mundo:
//   - quem tem menu proprio recebe um menu WMS proprio;
//   - quem nao tem menu proprio recebe no menu do role (criado se o role ainda nao tiver menus).
//
// Idempotente: se o menu/itens ja existirem, nao duplica.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const TITULO = "WMS"
const ICONE = "Warehouse"
const ITENS = [
  { titulo: "Dashboard", url: "/wms", ordem: 0 },
  { titulo: "Pedidos", url: "/wms/pedidos", ordem: 1 },
  { titulo: "Situações", url: "/wms/situacoes", ordem: 2 },
  { titulo: "Ordens de Separação", url: "/wms/separacoes", ordem: 3 },
  { titulo: "Estoque em Aberto", url: "/wms/estoque", ordem: 4 },
  { titulo: "Gavetas", url: "/wms/gavetas", ordem: 5 },
  { titulo: "Arquivados", url: "/wms/arquivados", ordem: 6 },
]
const URLS_OBSOLETAS = ["/wms/enderecos", "/wms/movimentos"]

async function garantirMenu(pool, { usuarioId, role }) {
  const escopo = usuarioId ? "usuario" : `role ${role}`
  const existente = await pool.query(
    `SELECT id FROM user_menus
     WHERE titulo = $1
       AND ativo = true
       AND ((usuario_id = $2) OR ($2::int IS NULL AND role = $3))
     ORDER BY id LIMIT 1`,
    [TITULO, usuarioId ?? null, role ?? null]
  )

  let menuId
  if (existente.rowCount > 0) {
    menuId = existente.rows[0].id
    console.log(`  (ja existe) menu WMS do ${escopo}: id=${menuId}`)
  } else {
    const proxima = await pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM user_menus
       WHERE (usuario_id = $1) OR ($1::int IS NULL AND role = $2)`,
      [usuarioId ?? null, role ?? null]
    )
    const ins = await pool.query(
      `INSERT INTO user_menus (usuario_id, role, titulo, icone, ordem, ativo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, now(), now()) RETURNING id`,
      [usuarioId ?? null, role ?? null, TITULO, ICONE, proxima.rows[0].prox]
    )
    menuId = ins.rows[0].id
    console.log(`  + menu WMS do ${escopo}: id=${menuId}`)
  }

  for (const url of URLS_OBSOLETAS) {
    const { rowCount } = await pool.query(
      `DELETE FROM user_menu_itens WHERE user_menu_id = $1 AND url = $2`,
      [menuId, url]
    )
    if (rowCount > 0) console.log(`      - removido item obsoleto ${url}`)
  }

  for (const item of ITENS) {
    const existenteItem = await pool.query(
      `SELECT id, titulo, ordem FROM user_menu_itens WHERE user_menu_id = $1 AND url = $2`,
      [menuId, item.url]
    )
    if (existenteItem.rowCount > 0) {
      const atual = existenteItem.rows[0]
      if (atual.titulo !== item.titulo || atual.ordem !== item.ordem) {
        await pool.query(
          `UPDATE user_menu_itens SET titulo = $1, ordem = $2, updated_at = now() WHERE id = $3`,
          [item.titulo, item.ordem, atual.id]
        )
        console.log(`      ~ ${item.titulo} ${item.url}`)
      }
      continue
    }
    await pool.query(
      `INSERT INTO user_menu_itens (user_menu_id, titulo, url, ordem, ativo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, now(), now())`,
      [menuId, item.titulo, item.url, item.ordem]
    )
    console.log(`      + ${item.titulo} ${item.url}`)
  }

  return menuId
}

async function resolverMenusDoUsuario(pool, usuario) {
  const proprios = await pool.query(
    `SELECT id FROM user_menus WHERE usuario_id = $1 AND ativo = true`,
    [usuario.id]
  )
  if (proprios.rowCount > 0) {
    return pool.query(
      `SELECT m.titulo FROM user_menus m
       WHERE m.usuario_id = $1 AND m.ativo = true
         AND EXISTS (SELECT 1 FROM user_menu_itens i WHERE i.user_menu_id = m.id)`,
      [usuario.id]
    )
  }

  const doRole = await pool.query(
    `SELECT m.titulo FROM user_menus m
     WHERE m.role = $1 AND m.ativo = true
       AND EXISTS (SELECT 1 FROM user_menu_itens i WHERE i.user_menu_id = m.id)`,
    [usuario.role]
  )
  if (doRole.rowCount > 0) return doRole

  return pool.query(
    `SELECT m.titulo FROM user_menus m
     WHERE m.role = 'DEFAULT' AND m.ativo = true
       AND EXISTS (SELECT 1 FROM user_menu_itens i WHERE i.user_menu_id = m.id)`
  )
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const usuarios = await pool.query(`SELECT id, name, role FROM usuarios ORDER BY id`)
  const roles = await pool.query(
    `SELECT DISTINCT role FROM user_menus WHERE role IS NOT NULL ORDER BY role`
  )

  console.log(`=== Menus por role ===`)
  for (const { role } of roles.rows) {
    await garantirMenu(pool, { role })
  }
  const rolesDosUsuarios = [...new Set(usuarios.rows.map((u) => u.role))]
  for (const role of rolesDosUsuarios) {
    if (roles.rows.some((r) => r.role === role)) continue
    console.log(`=== Role sem menus (${role}) — criando WMS ===`)
    await garantirMenu(pool, { role })
  }

  console.log(`\n=== Menus por usuario (quem tem menu proprio) ===`)
  const comMenuProprio = await pool.query(
    `SELECT DISTINCT usuario_id FROM user_menus WHERE usuario_id IS NOT NULL ORDER BY usuario_id`
  )
  for (const { usuario_id: usuarioId } of comMenuProprio.rows) {
    const dono = usuarios.rows.find((u) => u.id === usuarioId)
    console.log(`- usuario ${usuarioId} (${dono?.name ?? "?"})`)
    await garantirMenu(pool, { usuarioId })
  }

  console.log(`\n=== Verificacao: WMS visivel para todos ===`)
  let semWms = 0
  for (const usuario of usuarios.rows) {
    const menus = await resolverMenusDoUsuario(pool, usuario)
    const tem = menus.rows.some((m) => m.titulo === TITULO)
    if (!tem) {
      semWms++
      console.log(`  FALTA: usuario ${usuario.id} (${usuario.role}, ${usuario.name})`)
    }
  }
  console.log(
    semWms === 0
      ? `  OK: ${usuarios.rowCount} usuarios com o menu ${TITULO}`
      : `  ATENCAO: ${semWms} usuario(s) sem o menu ${TITULO}`
  )

  await pool.end()
  process.exit(semWms === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
