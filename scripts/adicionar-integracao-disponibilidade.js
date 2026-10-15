// Registra a integracao da disponibilidade comercial (api-microdata) no banco.
// Idempotente: se a integracao (nome) ja existir, nao duplica.
// A tela e /comercial/disponibilidade e usa o proxy /api/integracao/[id]/detalhe.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const API_BASE = process.env.MICRODATA_API_URL || "http://127.0.0.1:58245"
const LOGIN_URL = `${API_BASE}/auth/login`
const EMAIL = process.env.MICRODATA_SERVICE_EMAIL || "bi@dgbcomex.com"
const SENHA = process.env.MICRODATA_SERVICE_SENHA

if (!SENHA) {
  console.error("Defina MICRODATA_SERVICE_SENHA no .env.local")
  process.exit(1)
}

const INTEGRACAO = {
  nome: "Disponibilidade Comercial",
  baseUrl: `${API_BASE}/estoque-disponibilidade`,
}

const AUTH_CONFIG = {
  login_url: LOGIN_URL,
  email: EMAIL,
  senha: SENHA,
  email_field: "email",
  senha_field: "senha",
  token_field: "token",
}

function aplicar(pool) {
  return pool
    .query(`SELECT id FROM integracoes WHERE nome = $1`, [INTEGRACAO.nome])
    .then(({ rowCount, rows }) => {
      if (rowCount > 0) {
        console.log(`  (ja existe) ${INTEGRACAO.nome} id=${rows[0].id}`)
        return rows[0].id
      }
      return pool
        .query(
          `INSERT INTO integracoes (nome, base_url, tipo_auth, auth_config, telas, mapping, ativo, created_at, updated_at)
           VALUES ($1, $2, 'login', $3::jsonb, $4::jsonb, '{}'::jsonb, true, now(), now()) RETURNING id`,
          [
            INTEGRACAO.nome,
            INTEGRACAO.baseUrl,
            JSON.stringify(AUTH_CONFIG),
            JSON.stringify(["comercial"]),
          ]
        )
        .then(({ rows }) => {
          console.log(`  + ${INTEGRACAO.nome} id=${rows[0].id}`)
          return rows[0].id
        })
    })
}

async function main() {
  for (const url of [process.env.DATABASE_URL, process.env.DATABASE_URL_PDM_PRO_TEXTIL]) {
    if (!url) continue
    const pool = new Pool({ connectionString: url })
    try {
      console.log(`--- banco ${url.split("@")[1] || "?"} ---`)
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