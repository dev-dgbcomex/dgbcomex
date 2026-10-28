import { Pool } from "pg"

const connectionString = "postgresql://neondb_owner:npg_koWrfvlxY39Q@ep-still-mouse-achqqvp3-pooler.sa-east-1.aws.neon.tech/dgbcomex?sslmode=require&channel_binding=require"

const pool = new Pool({ connectionString })

async function main() {
  const client = await pool.connect()
  try {
    const cols = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'integrocoes'
      ORDER BY ordinal_position
    `)
    console.log("Colunas da tabela integrocoes:")
    for (const c of cols.rows) {
      console.log(`  ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} default=${c.column_default}`)
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
