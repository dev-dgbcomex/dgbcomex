import dotenv from "dotenv"
import postgres from "postgres"

dotenv.config({ path: ".env.local" })

const TARGETS = [
  { name: 'neon', url: process.env.DATABASE_URL },
  { name: 'warehouse_local', url: process.env.DATABASE_URL_LOCAL },
]

const NOME = "api_estoques_rolos_nivel2_ultimos6meses_pdm"
const TELA = "conferencia-op-tecido-cru"

async function run() {
  for (const { name, url } of TARGETS) {
    if (!url) {
      console.log(`[${name}] SEM_URL — pulando`)
      continue
    }
    const sql = postgres(url, { max: 1 })
    try {
      const rows = await sql`
        SELECT id, nome, telas FROM integracoes
        WHERE nome ILIKE ${"%" + NOME + "%"}`
      if (rows.length === 0) {
        console.log(`[${name}] integração não encontrada — pulando`)
      } else {
        for (const r of rows) {
          const atual = Array.isArray(r.telas) ? r.telas : []
          if (!atual.includes(TELA)) {
            const novo = [...atual, TELA]
            await sql`
              UPDATE integracoes SET telas = ${JSON.stringify(novo)}::json, updated_at = now()
              WHERE id = ${r.id}`
            console.log(
              `[${name}] id=${r.id} ${r.nome}: telas ${JSON.stringify(atual)} -> ${JSON.stringify(novo)}`
            )
          } else {
            console.log(`[${name}] id=${r.id} ${r.nome}: já possui a tela ${TELA}`)
          }
        }
      }
    } catch (err) {
      console.error(`[${name}] ERRO:`, err.message)
    } finally {
      await sql.end()
    }
  }
}

run()
