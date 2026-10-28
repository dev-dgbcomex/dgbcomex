import { Pool } from "pg"

const connectionString = "postgresql://neondb_owner:npg_koWrfvlxY39Q@ep-still-mouse-achqqvp3-pooler.sa-east-1.aws.neon.tech/dgbcomex?sslmode=require&channel_binding=require"

const pool = new Pool({ connectionString })

async function main() {
  const client = await pool.connect()
  try {
    // Listar todas as tabelas que contenham 'integ'
    const todas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%integ%'
      ORDER BY table_name
    `)
    console.log("Tabelas com 'integ':")
    for (const r of todas.rows) {
      console.log(`  - ${r.table_name}`)
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
