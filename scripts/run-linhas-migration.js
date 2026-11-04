require('dotenv').config({path:'.env.local'})
const {Client} = require('pg')
const fs = require('fs')
const path = require('path')

const sql = fs.readFileSync(path.join(__dirname, '../src/lib/db/migrations/0031_add_whatsapp_linhas.sql'), 'utf-8')

const dbs = [
  { name: 'neon', url: process.env.DATABASE_URL },
  { name: 'warehouse_local', url: process.env.DATABASE_URL_LOCAL },
]

async function run() {
  for (const db of dbs) {
    if (!db.url) { console.log(`SKIP ${db.name} (no URL)`); continue }
    try {
      const c = new Client({ connectionString: db.url, ssl: false })
      await c.connect()
      await c.query(sql)
      console.log(`OK ${db.name}`)
      await c.end()
    } catch (e) {
      console.error(`ERR ${db.name}: ${e.message}`)
    }
  }
}

run()
