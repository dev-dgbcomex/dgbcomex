// Cria o item de menu "Disponibilidade" em todos os menus de CRM que ja tem o comercial.
// Idempotente: se o item existir, nao duplica. Os menus sao por role e por perfil
// (user_menus com role null + perfil_menus), entao o caminho e achar todo menu CRM
// com item /comercial/ e acrescentar nele.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const URL_ITEM = "/comercial/disponibilidade"
const TITULO = "Disponibilidade"
const ORDEM = 2 // antes de Pessoas, que e a leitura do dia do comercial

const BANCOS = [
  ["principal", process.env.DATABASE_URL],
  ["pdm_pro_textil", process.env.DATABASE_URL_PDM_PRO_TEXTIL],
  ["pdm_ibirapuera", process.env.DATABASE_URL_PDM_IBIRAPUERA],
]

async function aplicar(pool) {
  const menus = await pool.query(
    `select distinct m.id, m.role, m.titulo
     from user_menus m
     join user_menu_itens i on i.user_menu_id = m.id
     where i.url like '/comercial/%'
       and (m.role is null or m.role in ('ADMIN', 'COMERCIAL', 'CRM'))`
  )

  if (menus.rowCount === 0) {
    console.log("  nenhum menu de comercial encontrado")
    return
  }

  for (const menu of menus.rows) {
    const jaTem = await pool.query(
      "select id from user_menu_itens where user_menu_id = $1 and url = $2",
      [menu.id, URL_ITEM]
    )
    if (jaTem.rowCount > 0) {
      console.log(`  (ja existe) menu ${menu.id} [${menu.role ?? "perfil"}]`)
      continue
    }
    const ins = await pool.query(
      `insert into user_menu_itens (user_menu_id, titulo, url, ordem, ativo, created_at, updated_at)
       values ($1, $2, $3, $4, true, now(), now()) returning id`,
      [menu.id, TITULO, URL_ITEM, ORDEM]
    )
    console.log(`  + menu ${menu.id} [${menu.role ?? "perfil"}] ${TITULO} (id=${ins.rows[0].id})`)
  }
}

async function main() {
  for (const [nome, url] of BANCOS) {
    if (!url) continue
    const pool = new Pool({ connectionString: url })
    try {
      console.log(`--- ${nome} ---`)
      await aplicar(pool)
    } catch (e) {
      console.error(`  ERRO: ${e.message}`)
    } finally {
      await pool.end()
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})