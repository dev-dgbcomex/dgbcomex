const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })
const src = new Pool({ connectionString: process.env.DATABASE_URL })
const dst = new Pool({ connectionString: process.env.DATABASE_URL_LOCAL })

const tabelas = ['public.usuarios', 'public.integracoes', 'public.notificacao_regras']

async function main() {
  for (const t of tabelas) {
    const [schema, tabela] = t.split('.')
    const ident = `"${schema}"."${tabela}"`
    console.log('copiando', t)
    const { rows: cols } = await src.query(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`, [schema, tabela])
    const jsonCols = new Set(
      cols
        .filter(c => c.data_type === 'json' || c.data_type === 'jsonb' || c.udt_name === 'json' || c.udt_name === 'jsonb')
        .map(c => c.column_name)
    )
    const colList = cols.map(c => `"${c.column_name}"`).join(', ')
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
    const { rows } = await src.query(`SELECT * FROM ${ident}`)
    console.log('rows:', rows.length)
    const sql = `INSERT INTO ${ident} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`
    const client = await dst.connect()
    try {
      await client.query('BEGIN')
      for (const row of rows) {
        const vals = cols.map(c => {
          const v = row[c.column_name]
          if (jsonCols.has(c.column_name)) {
            if (v === null || v === undefined) return null
            if (typeof v === 'object') return JSON.stringify(v)
            if (typeof v === 'string') {
              try {
                JSON.parse(v)
                return v
              } catch {
                return JSON.stringify(v)
              }
            }
            return JSON.stringify(v)
          }
          return v
        })
        await client.query(sql, vals)
      }
      await client.query('COMMIT')
      console.log('ok')
    } catch (e) {
      await client.query('ROLLBACK')
      console.log('ERR:', e.message)
    } finally {
      client.release()
    }
    // reset seq
    for (const col of cols) {
      try {
        const { rows: d } = await src.query(`SELECT column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3`, [schema, tabela, col.column_name])
        if (d[0]?.column_default?.includes('nextval')) {
          const m = d[0].column_default.match(/nextval\('([^']+)'/)
          if (m) await dst.query(`SELECT setval($1, COALESCE((SELECT MAX("${col.column_name}") FROM ${ident}), 1))`, [m[1]])
        }
      } catch {}
    }
    const { rows: c1 } = await src.query(`SELECT COUNT(*)::int as c FROM ${ident}`)
    const { rows: c2 } = await dst.query(`SELECT COUNT(*)::int as c FROM ${ident}`)
    console.log('src/dst:', c1[0].c, c2[0].c)
  }
}
main().then(() => { process.exit(0) }).catch(e => { console.error(e.message); process.exit(1) })
