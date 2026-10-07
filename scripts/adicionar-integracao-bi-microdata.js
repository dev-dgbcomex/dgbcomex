// Registra as integrações dos KPIs da api-microdata (tela "bi") no banco do dgbcomex.
// Idempotente: se a integração (nome) já existir, não duplica.
// Siga o fluxo normal: são inseridas na tabela `integracoes` e servem para a tela /bi/integracoes.
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

const KPIS = [
  { nome: "Faturamento do Dia", baseUrl: `${API_BASE}/faturamento/{data}` },
  { nome: "Faturamento Dia (diário)", baseUrl: `${API_BASE}/faturamento-dia/{data}` },
  { nome: "Contas Pagas", baseUrl: `${API_BASE}/contas-pagas/{data}` },
  { nome: "Custos Administrativos Anual", baseUrl: `${API_BASE}/custos-administrativos-anual` },
  { nome: "Custos Administrativos Mensal", baseUrl: `${API_BASE}/custos-administrativos-mensal` },
  { nome: "Descontos", baseUrl: `${API_BASE}/descontos/{data}` },
  { nome: "Devoluções", baseUrl: `${API_BASE}/devolucoes/{data}` },
  { nome: "Estornos", baseUrl: `${API_BASE}/estornos/{data}` },
  { nome: "Contas a Receber Programado", baseUrl: `${API_BASE}/contas-receber-programado` },
  { nome: "Contas a Pagar Programado", baseUrl: `${API_BASE}/contas-pagar-programado` },
]

const AUTH_CONFIG = {
  login_url: LOGIN_URL,
  email: EMAIL,
  senha: SENHA,
  email_field: "email",
  senha_field: "senha",
  token_field: "token",
}

function aplicarIntegracao(pool, kpi) {
  return pool.query(
    `SELECT id FROM integracoes WHERE nome = $1`,
    [kpi.nome]
  ).then(({ rowCount, rows }) => {
    if (rowCount > 0) {
      console.log(`  (ja existe) ${kpi.nome} id=${rows[0].id}`)
      return rows[0].id
    }
    return pool.query(
      `INSERT INTO integracoes (nome, base_url, tipo_auth, auth_config, telas, mapping, ativo, created_at, updated_at)
       VALUES ($1, $2, 'login', $3::jsonb, $4::jsonb, '{}'::jsonb, true, now(), now()) RETURNING id`,
      [kpi.nome, kpi.baseUrl, JSON.stringify(AUTH_CONFIG), JSON.stringify(["bi"])]
    ).then(({ rows }) => {
      console.log(`  + ${kpi.nome} id=${rows[0].id}`)
      return rows[0].id
    })
  })
}

async function aplicarBanco(name, url) {
  const pool = new Pool({ connectionString: url })
  try {
    console.log(`--- ${name} (api: ${API_BASE}, login: ${EMAIL}) ---`)
    for (const kpi of KPIS) {
      await aplicarIntegracao(pool, kpi)
    }
  } catch (e) {
    console.error(`[${name}] ERROR - ${e.message}`)
  } finally {
    await pool.end()
  }
}

async function main() {
  const urls = [process.env.DATABASE_URL]
  for (const url of urls) {
    if (url) await aplicarBanco("neon", url)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})