import { Pool } from "pg"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

const BASE = "http://94550ac37bb5.sn.mynetname.net:58245"

// Credenciais do serviço: ficam no .env.local (MICRODATA_SERVICE_EMAIL /
// MICRODATA_SERVICE_SENHA), nunca no código.
const email = process.env.MICRODATA_SERVICE_EMAIL
const senha = process.env.MICRODATA_SERVICE_SENHA
if (!email || !senha) {
  throw new Error(
    "MICRODATA_SERVICE_EMAIL e MICRODATA_SERVICE_SENHA precisam estar no .env.local"
  )
}

const authConfig = {
  email,
  senha,
  login_url: `${BASE}/auth/login`,
}

/**
 * Uma integração por endpoint (modelo BI): a URL é completa e cada uma tem o
 * próprio login. Nada de "base da API" com o caminho concatenado no código.
 *
 * O endpoint de login não entra aqui: ele é usado por dentro na autenticação de
 * cada uma das outras (ver `authConfig.login_url`), e não é uma API que a pessoa
 * escolhe para importar.
 */
const integracoes = [
  { nome: "api-microdata-wms-pedidos", baseUrl: `${BASE}/wms/pedidos`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-dashboard", baseUrl: `${BASE}/wms/dashboard`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-situacoes", baseUrl: `${BASE}/wms/situacoes`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-separacoes", baseUrl: `${BASE}/wms/separacoes`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-estoque", baseUrl: `${BASE}/wms/estoque`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-gavetas", baseUrl: `${BASE}/wms/gavetas`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-coletor", baseUrl: `${BASE}/wms/coletor`, tipoAuth: "login", telas: ["wms"] },
]

/**
 * Entradas do modelo antigo: a base da API sem caminho e o endpoint de login
 * isolado. Elas não são "APIs disponíveis" para o usuário escolher — a base não
 * existe sozinha, e o login é usado por dentro na autenticação de cada uma.
 */
const legadas = ["api-microdata-wms", "api-microdata-wms-auth"]

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida")
  }

  try {
    for (const int of integracoes) {
      const existente = await pool.query("SELECT id FROM integracoes WHERE nome = $1", [int.nome])
      if (existente.rows.length > 0) {
        await pool.query(
          `UPDATE integracoes SET base_url = $1, tipo_auth = $2, auth_config = $3, telas = $4, ativo = true, updated_at = NOW() WHERE nome = $5`,
          [int.baseUrl, int.tipoAuth, JSON.stringify(authConfig), JSON.stringify(int.telas), int.nome]
        )
        console.log(`Atualizada: ${int.nome}`)
      } else {
        await pool.query(
          `INSERT INTO integracoes (nome, base_url, tipo_auth, auth_config, telas, mapping, ativo, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())`,
          [int.nome, int.baseUrl, int.tipoAuth, JSON.stringify(authConfig), JSON.stringify(int.telas), JSON.stringify({})]
        )
        console.log(`Criada: ${int.nome}`)
      }
    }

    for (const nome of legadas) {
      const { rowCount } = await pool.query(
        "UPDATE integracoes SET ativo = false, updated_at = NOW() WHERE nome = $1 AND ativo = true",
        [nome]
      )
      if (rowCount && rowCount > 0) console.log(`Desativada: ${nome}`)
    }

    console.log("Concluído")
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
