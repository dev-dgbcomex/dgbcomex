const { Pool } = require('pg')
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_koWrfvlxY39Q@ep-still-mouse-achqqvp3-pooler.sa-east-1.aws.neon.tech/dgbcomex?sslmode=require&channel_binding=require",
})
pool.query("SELECT id,nome,base_url FROM integracoes WHERE nome LIKE 'bi%' LIMIT 15")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); })
