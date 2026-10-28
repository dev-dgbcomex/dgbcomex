import { Pool } from "pg"

const connectionString = "postgresql://neondb_owner:npg_koWrfvlxY39Q@ep-still-mouse-achqqvp3-pooler.sa-east-1.aws.neon.tech/dgbcomex?sslmode=require&channel_binding=require"

const pool = new Pool({ connectionString })

async function main() {
  const client = await pool.connect()
  try {
    // Criar tabela de configuração de integração do WMS se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS wms_config_integracao (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        base_url VARCHAR(500) NOT NULL,
        tipo_auth VARCHAR(20) NOT NULL DEFAULT 'login',
        auth_config JSONB NOT NULL DEFAULT '{}',
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    console.log("Tabela wms_config_integracao criada ou já existente")

    // Verificar se já existe a integração de WMS
    const existente = await client.query(
      "SELECT * FROM wms_config_integracao WHERE nome = $1",
      ["api-microdata-wms"]
    )

    if (existente.rows.length > 0) {
      console.log("Integração WMS já existe:", existente.rows[0])
      await client.query(
        `UPDATE wms_config_integracao 
         SET base_url = $1, tipo_auth = $2, auth_config = $3, ativo = true, updated_at = NOW() 
         WHERE id = $4`,
        [
          "http://10.156.0.124:58245",
          "login",
          JSON.stringify({
            email: "adm.systextil@systextil.com.br",
            senha: "Syst#2025#Syst",
            login_url: "http://10.156.0.124:58245/auth/login"
          }),
          existente.rows[0].id,
        ]
      )
      console.log("Integração WMS atualizada com credenciais do ERP")
    } else {
      const [nova] = await client.query(
        `INSERT INTO wms_config_integracao (nome, base_url, tipo_auth, auth_config, ativo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         RETURNING *`,
        [
          "api-microdata-wms",
          "http://10.156.0.124:58245",
          "login",
          JSON.stringify({
            email: "adm.systextil@systextil.com.br",
            senha: "Syst#2025#Syst",
            login_url: "http://10.156.0.124:58245/auth/login"
          }),
        ]
      )
      console.log("Integração WMS criada:", nova.rows[0])
    }

    const todas = await client.query("SELECT id, nome, base_url, tipo_auth, ativo FROM wms_config_integracao ORDER BY id")
    console.log("\nTodas as integrações de WMS:")
    for (const inc of todas.rows) {
      console.log(`  - ${inc.id}: ${inc.nome} (${inc.base_url}) - ${inc.tipo_auth} - ativo=${inc.ativo}`)
    }
  } catch (err) {
    console.error("Erro:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
