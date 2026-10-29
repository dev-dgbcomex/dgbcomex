import { Pool } from "pg"

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_koWrfvlxY39Q@ep-still-mouse-achqqvp3-pooler.sa-east-1.aws.neon.tech/dgbcomex?sslmode=require&channel_binding=require",
})

const BASE = "http://94550ac37bb5.sn.mynetname.net:58245"
const authConfig = {
  email: "adm.systextil@systextil.com.br",
  senha: "Syst#2025#Syst",
  login_url: `${BASE}/auth/login`,
}

const integracoes = [
  { nome: "api-microdata-wms-auth", baseUrl: `${BASE}/auth/login`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-pedidos", baseUrl: `${BASE}/wms/pedidos`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-dashboard", baseUrl: `${BASE}/wms/dashboard`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-situacoes", baseUrl: `${BASE}/wms/situacoes`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-separacoes", baseUrl: `${BASE}/wms/separacoes`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-estoque", baseUrl: `${BASE}/wms/estoque`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-gavetas", baseUrl: `${BASE}/wms/gavetas`, tipoAuth: "login", telas: ["wms"] },
  { nome: "api-microdata-wms-coletor", baseUrl: `${BASE}/wms/coletor`, tipoAuth: "login", telas: ["wms"] },
]

async function main() {
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
  console.log("Concluído")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => pool.end())
