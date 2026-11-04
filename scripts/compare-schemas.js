const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const SCHEMA = 'public'

// Tabelas que existem SO no warehouse local e nao no Neon, por arquitetura:
// - `alembic_version`: controle de migracao da api-microdata (roda no local).
// - `wms_*`: dados de runtime do WMS (escrita local, via api-microdata).
// Ver docs/wms-modulo.md.
const TABELAS_SO_NO_LOCAL = new Set([
  'alembic_version',
  'wms_carga_pedidos_estado',
  'wms_coletor_config',
  'wms_coletor_sincronizacao',
  'wms_kanban_ordem',
  'wms_pedido_eventos',
  'wms_pedidos_arquivados',
  'wms_pedidos_situacao',
  'wms_separacao_eventos',
  'wms_separacao_pecas',
  'wms_separacoes',
  'wms_situacoes_pedido',
])

async function getSchemas(pool) {
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = $1 ORDER BY table_name
  `, [SCHEMA])
  const result = {}
  for (const { table_name } of tables.rows) {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position
    `, [SCHEMA, table_name])
    const cons = await pool.query(`
      SELECT con.contype AS tipo,
             pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = $1 AND rel.relname = $2 AND con.contype IN ('p','u','c','f')
    `, [SCHEMA, table_name])
    const idx = await pool.query(`
      SELECT i.relname AS nome, pg_get_indexdef(ix.indexrelid) AS def
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1 AND c.relname = $2
        AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = ix.indexrelid)
    `, [SCHEMA, table_name])
    result[table_name] = {
      cols: cols.rows,
      cons: cons.rows.map(c => `${c.tipo}::${c.def}`),
      idx: idx.rows.map(i => ({ nome: i.nome, def: i.def })),
    }
  }
  return result
}

async function main() {
  const databases = [
    { name: 'neon', url: process.env.DATABASE_URL },
    { name: 'warehouse_local', url: process.env.DATABASE_URL_LOCAL },
  ]

  const allSchemas = {}
  for (const db of databases) {
    if (!db.url) { console.log(db.name + ': URL not set'); continue }
    const pool = new Pool({ connectionString: db.url })
    try {
      allSchemas[db.name] = await getSchemas(pool)
    } catch (e) {
      console.error(db.name + ': ERROR ' + e.message)
    } finally {
      await pool.end()
    }
  }

  // Compare
  const dbNames = Object.keys(allSchemas)
  const reference = allSchemas[dbNames[0]]
  
  // Tables diff
  const allTables = new Set()
  for (const name of dbNames) {
    for (const t of Object.keys(allSchemas[name])) allTables.add(t)
  }

  const diffs = []
  const avisos = []
  for (const table of [...allTables].sort()) {
    const refCols = reference[table]
    for (const dbName of dbNames.slice(1)) {
      const otherCols = allSchemas[dbName][table]
      if (!refCols && otherCols) {
        if (dbName === 'warehouse_local' && TABELAS_SO_NO_LOCAL.has(table)) continue
        diffs.push(`${dbName}: EXTRA table ${table}`)
        continue
      }
      if (refCols && !otherCols) {
        diffs.push(`${dbName}: MISSING table ${table}`)
        continue
      }
      if (!refCols || !otherCols) continue
      
      // Compare columns
      const refMap = {}
      for (const c of refCols.cols) refMap[c.column_name] = c
      const otherMap = {}
      for (const c of otherCols.cols) otherMap[c.column_name] = c

      for (const col of Object.keys(refMap)) {
        if (!otherMap[col]) {
          diffs.push(`${dbName}: table ${table} MISSING column ${col}`)
        } else if (refMap[col].data_type !== otherMap[col].data_type) {
          diffs.push(`${dbName}: table ${table}.${col} type ${otherMap[col].data_type} (expected ${refMap[col].data_type})`)
        }
      }
      for (const col of Object.keys(otherMap)) {
        if (!refMap[col]) {
          diffs.push(`${dbName}: table ${table} EXTRA column ${col}`)
        }
      }

      // Compare constraints (PK/UNIQUE/CHECK/FK) e índices
      const refCons = new Set(refCols.cons)
      const otherCons = new Set(otherCols.cons)
      for (const c of refCons) {
        if (!otherCons.has(c)) diffs.push(`${dbName}: table ${table} MISSING constraint ${c}`)
      }
      for (const c of otherCons) {
        if (!refCons.has(c)) diffs.push(`${dbName}: table ${table} EXTRA constraint ${c}`)
      }

      // Indices: comparados pelo nome (a definicao textual pode diferir em
      // detalhes de cast sem mudar a semantica do indice)
      const refIdx = new Map(refCols.idx.map(i => [i.nome, i.def]))
      const otherIdx = new Map(otherCols.idx.map(i => [i.nome, i.def]))
      for (const [nome, def] of refIdx) {
        if (!otherIdx.has(nome)) {
          diffs.push(`${dbName}: table ${table} MISSING index ${nome}`)
        } else if (otherIdx.get(nome) !== def) {
          avisos.push(`${dbName}: table ${table} index ${nome} com definicao diferente (mesmos nomes/colunas)`)
        }
      }
      for (const nome of otherIdx.keys()) {
        if (!refIdx.has(nome)) diffs.push(`${dbName}: table ${table} EXTRA index ${nome}`)
      }
    }
  }

  if (diffs.length === 0) {
    console.log('All databases are IDENTICAL')
  } else {
    console.log('DIFFERENCES FOUND:')
    diffs.forEach(d => console.log('  - ' + d))
  }
  if (avisos.length) {
    console.log('\nAVISOS (sem impacto estrutural):')
    avisos.forEach(a => console.log('  ~ ' + a))
  }
  
  // Also output table counts
  for (const name of dbNames) {
    const count = Object.keys(allSchemas[name] || {}).length
    console.log(name + ': ' + count + ' tables')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
