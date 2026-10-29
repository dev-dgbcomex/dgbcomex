import { Pool } from "pg"

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_koWrfvlxY39Q@ep-still-mouse-achqqvp3-pooler.sa-east-1.aws.neon.tech/dgbcomex?sslmode=require&channel_binding=require",
})

pool.query("SELECT id,nome,base_url FROM integracoes WHERE nome LIKE '%faturamento%' OR nome LIKE '%contas%' LIMIT 5")
  .then(r => { console.log(r.rows); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); })
