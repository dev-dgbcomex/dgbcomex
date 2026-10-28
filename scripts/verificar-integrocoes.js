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
    
    // Verificar se existe a tabela integrocoes
    const existe = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'integrocoes'
    `)
    console.log(`\nTabela 'integrocoes' existe: ${existe.rows.length > 0}`)
    
    // Verificar colunas da tabela integrocoes
    if (existe.rows.length > 0) {
      const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'integrocoes'
        ORDER BY ordinal_position
      `)
      console.log("\nColunas da tabela integrocoes:")
      for (const c of cols.rows) {
        console.log(`  ${c.column_name}: ${c.data_type}`)
      }
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
