// Registra a integracao da disponibilidade comercial (api-microdata) no banco.
// Idempotente: se a integracao (nome) ja existir, nao duplica.
// A tela e /comercial/disponibilidade e usa o proxy /api/integracao/[id]/detalhe.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const LOGIN_URL = process.env.MICRODATA_API_URL_LOGIN || ""
const EMAIL = process.env.MICRODATA_SERVICE_EMAIL || "bi@dgbcomex.com"
const SENHA = process.env.MICRODATA_SERVICE_SENHA

if (!SENHA) {
  console.error("Defina MICRODATA_SERVICE_SENHA no .env.local")
  process.exit(1)
}

const NOME = "Disponibilidade Comercial"
const CAMINHO = "/estoque-disponibilidade"

/**
 * O host tem que ser o **publico**, igual as integracoes de BI ja cadastradas.
 *
 * O `baseUrl` vai dentro da URL que a Vercel chama: se ficar em `127.0.0.1`, do
 * servidor da Vercel isso aponta para a propria Vercel, a conexao e recusada e o
 * proxy responde 500 "Erro interno" — que e exatamente o sintoma que a tela deu.
 * Por isso o host vem do `MICRODATA_API_URL` (que precisa ser o publico); se nao
 * estiver definido, o script copia o host de uma integracao que ja funciona.
 */
async function descobrirHost(pool) {
  if (LOGIN_URL) return LOGIN_URL.replace(/\/auth\/login$/, "")
  const { rows } = await pool.query(
    "select base_url from integracoes where base_url not like 'http://127.0.0.1%' limit 1"
  )
  if (rows[0]) return new URL(rows[0].base_url).origin
  throw new Error(
    "Sem host publico: defina MICRODATA_API_URL com a URL externa da api-microdata " +
      "(ex.: http://<host>.mynetname.net:58245) ou cadastre a integracao a mao."
  )
}

/** Sempre origem + caminho: a tela identifica a integracao pelo caminho da URL. */
const baseCompleta = (host) => `${host}${CAMINHO}`

/**
 * O `auth_config.login_url` importa tanto quanto o `base_url`: e ele que o proxy usa
 * para pegar o token (`autenticarIntegracao`). Deixar em `127.0.0.1` faz o login
 * falhar na Vercel com 502 mesmo com o `base_url` certo — os dois andam juntos.
 */
const authConfigCompleto = (host) => ({
  login_url: `${host}/auth/login`,
  email: EMAIL,
  senha: SENHA,
  email_field: "email",
  senha_field: "senha",
  token_field: "token",
})

function aplicar(pool, baseUrl, host) {
  const auth = JSON.stringify(authConfigCompleto(host))
  return pool
    .query(`SELECT id FROM integracoes WHERE nome = $1`, [NOME])
    .then(({ rowCount, rows }) => {
      if (rowCount > 0) {
        return pool
          .query(
            `update integracoes set base_url = $1, auth_config = $2::jsonb, telas = $3::jsonb
             where id = $4 returning id, base_url`,
            [baseUrl, auth, JSON.stringify(["comercial"]), rows[0].id]
          )
          .then(({ rows: atual }) => {
            console.log(`  ~ atualizada ${NOME} id=${atual[0].id} -> ${atual[0].base_url}`)
            return atual[0].id
          })
      }
      return pool
        .query(
          `INSERT INTO integracoes (nome, base_url, tipo_auth, auth_config, telas, mapping, ativo, created_at, updated_at)
           VALUES ($1, $2, 'login', $3::jsonb, $4::jsonb, '{}'::jsonb, true, now(), now()) RETURNING id`,
          [NOME, baseUrl, auth, JSON.stringify(["comercial"])]
        )
        .then(({ rows: ins }) => {
          console.log(`  + ${NOME} id=${ins[0].id} -> ${baseUrl}`)
          return ins[0].id
        })
    })
}

async function main() {
  for (const url of [process.env.DATABASE_URL, process.env.DATABASE_URL_PDM_PRO_TEXTIL]) {
    if (!url) continue
    const pool = new Pool({ connectionString: url })
    try {
      console.log(`--- banco ${url.split("@")[1]?.split("?")[0] || "?"} ---`)
      const host = await descobrirHost(pool)
      await aplicar(pool, baseCompleta(host), host)
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