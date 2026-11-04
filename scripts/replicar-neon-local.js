#!/usr/bin/env node
/**
 * Replica Neon -> PostgreSQL local (dgbcomex_warehouse)
 *
 * Escopo: schemas public, marts, auth, etl (D2).
 * Fase 2 do docs/wms-modulo.md
 *
 * Uso:
 *   node scripts/replicar-neon-local.js           # copia/incrementa (idempotente)
 *   node scripts/replicar-neon-local.js --reset   # TRUNCATE + copia do zero
 *   node scripts/replicar-neon-local.js --dry-run # só lista o que seria feito
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const SCHEMAS = ['public', 'marts', 'auth', 'etl']
const RESET = process.argv.includes('--reset')
const DRY = process.argv.includes('--dry-run')

async function main() {
  const srcUrl = process.env.DATABASE_URL
  const dstUrl = process.env.DATABASE_URL_LOCAL

  if (!srcUrl) throw new Error('DATABASE_URL (Neon) não configurada')
  if (!dstUrl) throw new Error('DATABASE_URL_LOCAL não configurada')

  const src = new Pool({ connectionString: srcUrl })
  const dst = new Pool({ connectionString: dstUrl })

  try {
    console.log('=== Replicar Neon -> local (dgbcomex_warehouse) ===')
    console.log('Origem:', srcUrl.replace(/:[^:@]+@/, ':***@'))
    console.log('Destino:', dstUrl.replace(/:[^:@]+@/, ':***@'))
    console.log('Schemas:', SCHEMAS.join(', '))
    console.log('Modo:', RESET ? 'RESET (TRUNCATE)' : 'IDEMPOTENTE', DRY ? '[DRY-RUN]' : '')
    console.log('')

    // 1) Criar schemas + extensões no destino
    for (const s of SCHEMAS) {
      if (DRY) console.log(`[DRY] CREATE SCHEMA IF NOT EXISTS ${s}`)
      else await dst.query(`CREATE SCHEMA IF NOT EXISTS ${s}`)
    }

    if (!DRY) {
      // Garantir extensões comuns usadas pelo app
      const exts = ['uuid-ossp', 'pgcrypto', 'citext']
      for (const e of exts) {
        try {
          await dst.query(`CREATE EXTENSION IF NOT EXISTS "${e}"`)
          console.log(`  [EXT] ${e}`)
        } catch (err) {
          console.log(`  [EXT:SKIP] ${e} (${err.message.split('\n')[0]})`)
        }
      }

      // Copiar ENUMs/types user-defined
      const { rows: enums } = await src.query(
        `
        SELECT n.nspname AS schema, t.typname AS name,
               array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE n.nspname = ANY($1)
        GROUP BY n.nspname, t.typname
        `,
        [SCHEMAS]
      )
      for (const en of enums) {
        try {
          await dst.query(`CREATE SCHEMA IF NOT EXISTS "${en.schema}"`)
          const labels = en.labels.map(l => `'${String(l).replace(/'/g, "''")}'`).join(', ')
          await dst.query(
            `DO $$ BEGIN
               CREATE TYPE "${en.schema}"."${en.name}" AS ENUM (${labels});
             EXCEPTION WHEN duplicate_object THEN null;
             END $$;`
          )
          console.log(`  [TYPE] ${en.schema}.${en.name}`)
        } catch (err) {
          console.log(`  [TYPE:SKIP] ${en.schema}.${en.name} (${err.message.split('\n')[0]})`)
        }
      }
      console.log('')
    } else {
      console.log('[DRY] CREATE EXTENSION IF NOT EXISTS uuid-ossp/pgcrypto/citext')
      console.log('[DRY] Copiar ENUMs de public/marts/auth/etl')
      console.log('')
    }

    // 2) Listar tabelas e views por schema na origem
    const { rows: tables } = await src.query(
      `
      SELECT table_schema, table_name, 'table' AS kind
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema = ANY($1)
      UNION ALL
      SELECT table_schema, table_name, 'view' AS kind
      FROM information_schema.views
      WHERE table_schema = ANY($1)
      ORDER BY table_schema, table_name
      `,
      [SCHEMAS]
    )
    const baseTables = tables.filter(t => t.kind === 'table')
    const views = tables.filter(t => t.kind === 'view')
    console.log(`Tabelas BASE TABLE: ${baseTables.length} | Views: ${views.length}`)
    if (DRY) {
      for (const t of baseTables) console.log(`  [TABLE] ${t.table_schema}.${t.table_name}`)
      for (const t of views) console.log(`  [VIEW ] ${t.table_schema}.${t.table_name}`)
      return
    }

    // 3) Obter definição completa + FKs para ordenar
    const { rows: fks } = await src.query(
      `
      SELECT
        tc.table_schema AS schema,
        tc.table_name AS tabela,
        kcu.column_name AS coluna,
        ccu.table_schema AS ref_schema,
        ccu.table_name AS ref_tabela,
        ccu.column_name AS ref_coluna,
        tc.constraint_name AS nome
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = ANY($1)
      `,
      [SCHEMAS]
    )

    // Topological sort por dependências FK (só BASE TABLE)
    const deps = new Map()
    for (const t of baseTables) {
      deps.set(`${t.table_schema}.${t.table_name}`, new Set())
    }
    for (const fk of fks) {
      const child = `${fk.schema}.${fk.tabela}`
      const parent = `${fk.ref_schema}.${fk.ref_tabela}`
      if (child !== parent && deps.has(child) && deps.has(parent)) {
        deps.get(child).add(parent)
      }
    }
    const order = []
    const visited = new Set()
    function visit(node, stack) {
      if (visited.has(node)) return
      if (stack.has(node)) return // ciclo, ignora
      stack.add(node)
      for (const d of deps.get(node) || []) visit(d, new Set(stack))
      stack.delete(node)
      visited.add(node)
      order.push(node)
    }
    for (const t of baseTables) visit(`${t.table_schema}.${t.table_name}`, new Set())
    console.log(`Ordem de cópia calculada (topológica): ${order.length} tabelas`)

    // 4) Copiar cada tabela base
    const report = []
    for (const key of order) {
      const [schema, tabela] = key.split('.')
      const isTable = baseTables.some(t => t.table_schema === schema && t.table_name === tabela)
      if (!isTable) continue
      await copiarTabela(src, dst, schema, tabela)
      const c1 = await contar(src, schema, tabela)
      const c2 = await contar(dst, schema, tabela)
      report.push({ schema, tabela, src: c1, dst: c2, ok: c1 === c2 })
      if (c1 !== c2) console.log(`  ⚠ ${schema}.${tabela}: src=${c1} dst=${c2}`)
      else console.log(`  ✓ ${schema}.${tabela}: ${c2}`)
    }

    // 5) Copiar views
    console.log('')
    console.log('Copiando views...')
    for (const v of views) {
      try {
        const { rows: [def] } = await src.query(
          `SELECT pg_get_viewdef($1::regclass, true) AS def`,
          [`"${v.table_schema}"."${v.table_name}"`]
        )
        if (!def?.def) continue
        await dst.query(
          `CREATE OR REPLACE VIEW "${v.table_schema}"."${v.table_name}" AS ${def.def}`
        )
        console.log(`  [VIEW] ${v.table_schema}.${v.table_name}`)
      } catch (e) {
        console.log(`  [VIEW:ERR] ${v.table_schema}.${v.table_name}: ${e.message.split('\n')[0]}`)
      }
    }

    console.log('')
    console.log('=== RELATÓRIO ===')
    const divergentes = report.filter(r => !r.ok)
    console.log(`Igual: ${report.length - divergentes.length} / ${report.length}`)
    if (divergentes.length) {
      console.log('DIVERGENTES:')
      for (const r of divergentes) console.log(`  - ${r.schema}.${r.tabela}: src=${r.src} dst=${r.dst}`)
    } else {
      console.log('0 divergências')
    }
  } finally {
    await src.end()
    await dst.end()
  }
}

async function contar(pool, schema, tabela) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM "${schema}"."${tabela}"`)
  return rows[0].c
}

async function copiarTabela(src, dst, schema, tabela) {
  const ident = `"${schema}"."${tabela}"`

  // Se for view, não copiar dados
  const { rows: kind } = await src.query(
    `SELECT c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2`,
    [schema, tabela]
  )
  if (!kind.length) return
  if (kind[0].relkind !== 'r') { console.log(`  [SKIP:${kind[0].relkind}] ${schema}.${tabela} não é tabela base`); return }

  // Verificar se existe no destino
  const { rows: exists } = await dst.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2`,
    [schema, tabela]
  )

  if (exists.length) {
    // No destino a "tabela" pode ser uma VIEW (ex.: marts publicados pelo ETL local).
    // Nao se copia dado nem se mexe na definicao: quem mantem e o ETL.
    const { rows: dstKind } = await dst.query(
      `SELECT c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2`,
      [schema, tabela]
    )
    if (dstKind.length && dstKind[0].relkind === 'v') {
      console.log(`  [SKIP:VIEW] ${schema}.${tabela} (mantida pelo ETL local)`)
      return
    }
  }

  if (!exists.length) {
    // Criar tabela no destino com mesma estrutura
    const ddl = await gerarDDL(src, schema, tabela)
    await dst.query(ddl)
    console.log(`  [CREATE] ${schema}.${tabela}`)
  } else {
    // Tabela ja existe: alinhar colunas (inclui as novas do Neon) e tipos
    await alinharColunas(src, dst, schema, tabela)
  }

  if (RESET) {
    // O local e um SUPERSET: tem carga do ERP (raw/core/etl) e runtime do WMS que
    // o Neon nao tem. Truncar `marts`/`etl` apagaria dado gerado pelo ETL local
    // (watermark, historico de execucoes, marts publicados) — por isso o reset
    // so vale para o schema `public` (espelho do app).
    if (schema !== 'public') {
      console.log(`  [RESET:SKIP] ${schema}.${tabela} (schema mantido pelo ETL local)`)
    } else {
      try { await dst.query(`TRUNCATE TABLE ${ident} RESTART IDENTITY CASCADE`) } catch(e) { console.log(`  [TRUNC:ERR] ${schema}.${tabela}: ${e.message.split('\n')[0]}`) }
    }
  }

  await copiarDados(src, dst, schema, tabela)

  // Constraints (PK, UNIQUE, CHECK, FK) e índices: o warehouse local precisa
  // ter as mesmas garantias do Neon (sem PK/UNIQUE o ON CONFLICT quebra, sem FK
  // a integridade referencial diverge). Roda sempre, mesmo com tabela vazia.
  try { await alinharConstraints(src, dst, schema, tabela) } catch (e) {
    console.log(`  [CONSTRAINT:ERR] ${schema}.${tabela}: ${e.message.split('\n')[0]}`)
  }
}

/** Copia os dados da tabela da origem para o destino (idempotente). */
async function copiarDados(src, dst, schema, tabela) {
  const ident = `"${schema}"."${tabela}"`

  // Pegar colunas
  const { rows: cols } = await src.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`,
    [schema, tabela]
  )
  if (!cols.length) return
  const colList = cols.map(c => `"${c.column_name}"`).join(', ')
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')

  // Colunas json/jsonb: o node-postgres manda array como literal de array do Postgres,
  // entao o valor precisa ir como texto JSON para o Postgres aceitar.
  const { rows: jsonCols } = await src.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema=$1 AND table_name=$2 AND data_type IN ('json','jsonb')`,
    [schema, tabela]
  )
  const colunasJson = new Set(jsonCols.map(c => c.column_name))

  // Pegar dados da origem
  let rows
  try {
    const res = await src.query(`SELECT * FROM ${ident}`)
    rows = res.rows
  } catch (e) {
    console.log(`  [READ:ERR] ${schema}.${tabela}: ${e.message.split('\n')[0]}`)
    return
  }

  if (rows.length === 0) return

  // Inserir em lotes
  const client = await dst.connect()
  try {
    await client.query('BEGIN')
    const sql = `INSERT INTO ${ident} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`
    const batch = 1000
    for (let i = 0; i < rows.length; i += batch) {
      const chunk = rows.slice(i, i + batch)
      for (const row of chunk) {
        const vals = cols.map(c => {
          const valor = row[c.column_name]
          if (colunasJson.has(c.column_name) && valor !== null && valor !== undefined) {
            return JSON.stringify(valor)
          }
          return valor
        })
        await client.query(sql, vals)
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    console.log(`  [INS:ERR] ${schema}.${tabela}: ${e.message.split('\n')[0]}`)
    client.release()
    return
  }
  client.release()

  // Resetar sequências
  try { await resetSequencias(dst, schema, tabela) } catch {}
}

/**
 * Replica constraints (PK/UNIQUE/CHECK/FK) e índices da origem para o destino.
 * Tabelas criadas pela replica (CREATE TABLE sem constraints) ficavam sem PK,
 * sem unique e sem FK — o que quebrava `ON CONFLICT` e a integridade referencial.
 */
async function alinharConstraints(src, dst, schema, tabela) {
  const ident = `"${schema}"."${tabela}"`

  const { rows: srcCons } = await src.query(
    `SELECT con.conname AS nome,
            con.contype AS tipo,
            pg_get_constraintdef(con.oid) AS def
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = $1 AND rel.relname = $2
        AND con.contype IN ('p', 'u', 'c', 'f')
      ORDER BY CASE con.contype
                 WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'c' THEN 3 WHEN 'f' THEN 4
                 ELSE 5 END`,
    [schema, tabela]
  )

  const { rows: dstCons } = await dst.query(
    `SELECT con.conname AS nome,
            con.contype AS tipo,
            pg_get_constraintdef(con.oid) AS def
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = $1 AND rel.relname = $2`,
    [schema, tabela]
  )
  const { rows: dstIdx } = await dst.query(
    `SELECT i.relname AS nome
       FROM pg_class i
       JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE n.nspname = $1 AND i.relkind IN ('i','u')`,
    [schema]
  )
  const dstConsNames = new Set(dstCons.map(c => c.nome))
  const dstIdxNames = new Set(dstIdx.map(i => i.nome))
  const dstHasPk = dstCons.some(c => c.tipo === 'p')
  const dstDefs = new Set(dstCons.map(c => `${c.tipo}::${c.def}`))

  for (const c of srcCons) {
    if (dstConsNames.has(c.nome)) continue
    // PK/UNIQUE: se ja existe um indice com o mesmo nome, a garantia ja existe
    if ((c.tipo === 'p' || c.tipo === 'u') && dstIdxNames.has(c.nome)) continue
    // A tabela ja tem PK (com outro nome): nao da para ter duas
    if (c.tipo === 'p' && dstHasPk) continue
    // Mesma definicao ja existe com outro nome
    if (dstDefs.has(`${c.tipo}::${c.def}`)) continue
    try {
      await dst.query(`ALTER TABLE ${ident} ADD CONSTRAINT "${c.nome}" ${c.def}`)
      console.log(`  [CONSTRAINT] ${schema}.${tabela}.${c.nome} (${c.tipo})`)
    } catch (e) {
      console.log(`  [CONSTRAINT:ERR] ${schema}.${tabela}.${c.nome}: ${e.message.split('\n')[0]}`)
    }
  }

  // Indices "soltos" (nao backed por constraint): PK/UNIQUE ja criados acima
  const { rows: srcIdx } = await src.query(
    `SELECT i.relname AS nome, pg_get_indexdef(ix.indexrelid) AS def
       FROM pg_index ix
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_class c ON c.oid = ix.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1 AND c.relname = $2
        AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = ix.indexrelid)`,
    [schema, tabela]
  )
  for (const idx of srcIdx) {
    if (dstIdxNames.has(idx.nome)) continue
    const def = idx.def.replace(/^CREATE (UNIQUE )?INDEX /, (m, u) => `CREATE ${u || ''}INDEX IF NOT EXISTS `)
    try {
      await dst.query(def)
      console.log(`  [INDEX] ${schema}.${tabela}.${idx.nome}`)
    } catch (e) {
      console.log(`  [INDEX:ERR] ${schema}.${tabela}.${idx.nome}: ${e.message.split('\n')[0]}`)
    }
  }
}

/**
 * Garante que a tabela do destino tenha as mesmas colunas (e tipos) da origem.
 * Sem isso, uma coluna nova criada no Neon nunca chegaria ao warehouse local
 * e a copia dos dados falharia ("column ... does not exist").
 */
async function alinharColunas(src, dst, schema, tabela) {
  const ident = `"${schema}"."${tabela}"`
  const { rows: srcCols } = await src.query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default,
            character_maximum_length, numeric_precision, numeric_scale
       FROM information_schema.columns
      WHERE table_schema=$1 AND table_name=$2
      ORDER BY ordinal_position`,
    [schema, tabela]
  )
  const { rows: dstCols } = await dst.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema=$1 AND table_name=$2`,
    [schema, tabela]
  )
  const dstMap = new Map(dstCols.map((c) => [c.column_name, c]))

  for (const col of srcCols) {
    const tipo = mapType(col)
    const existente = dstMap.get(col.column_name)

    if (!existente) {
      try {
        await dst.query(`ALTER TABLE ${ident} ADD COLUMN IF NOT EXISTS "${col.column_name}" ${tipo}`)
        console.log(`  [ADD COLUMN] ${schema}.${tabela}.${col.column_name} ${tipo}`)
      } catch (e) {
        console.log(`  [ADD COLUMN:ERR] ${schema}.${tabela}.${col.column_name}: ${e.message.split('\n')[0]}`)
        continue
      }
      // Coluna serial: recria a sequencia e o default nextval
      const seq = col.column_default?.match(/nextval\('([^']+)'/)?.[1]
      if (seq) {
        try {
          const partes = seq.split('.')
          const seqSchema = partes.length > 1 ? partes.slice(0, -1).join('.') : schema
          const seqOnly = partes.length > 1 ? partes[partes.length - 1] : seq
          await dst.query(`CREATE SCHEMA IF NOT EXISTS "${seqSchema}"`)
          await dst.query(`CREATE SEQUENCE IF NOT EXISTS "${seqSchema}"."${seqOnly}"`)
          await dst.query(
            `ALTER SEQUENCE "${seqSchema}"."${seqOnly}" OWNED BY "${schema}"."${tabela}"."${col.column_name}"`
          )
          await dst.query(
            `ALTER TABLE ${ident} ALTER COLUMN "${col.column_name}" SET DEFAULT nextval('"${seqSchema}"."${seqOnly}"')`
          )
        } catch (e) {
          console.log(`  [SEQ:ERR] ${schema}.${tabela}.${col.column_name}: ${e.message.split('\n')[0]}`)
        }
      }
    } else if (existente.data_type !== col.data_type) {
      try {
        await dst.query(`ALTER TABLE ${ident} ALTER COLUMN "${col.column_name}" TYPE ${tipo}`)
        console.log(`  [ALTER TYPE] ${schema}.${tabela}.${col.column_name}: ${existente.data_type} -> ${tipo}`)
      } catch (e) {
        console.log(`  [ALTER TYPE:ERR] ${schema}.${tabela}.${col.column_name}: ${e.message.split('\n')[0]}`)
      }
    }

    // Default e NOT NULL: aplicados depois do ADD COLUMN (coluna nova pode ter linhas antigas)
    if (col.column_default && !col.column_default.includes('nextval')) {
      try {
        await dst.query(`ALTER TABLE ${ident} ALTER COLUMN "${col.column_name}" SET DEFAULT ${col.column_default}`)
      } catch (e) {
        console.log(`  [DEFAULT:ERR] ${schema}.${tabela}.${col.column_name}: ${e.message.split('\n')[0]}`)
      }
    }
    if (col.is_nullable === 'NO') {
      try {
        await dst.query(`ALTER TABLE ${ident} ALTER COLUMN "${col.column_name}" SET NOT NULL`)
      } catch (e) {
        console.log(`  [NOT NULL:ERR] ${schema}.${tabela}.${col.column_name}: ${e.message.split('\n')[0]}`)
      }
    }
  }
}

async function gerarDDL(src, schema, tabela) {  // Usar pg_dump-like via informações do catálogo - simplificado mas funcional
  const { rows: cols } = await src.query(
    `
    SELECT 
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale
    FROM information_schema.columns c
    WHERE c.table_schema=$1 AND c.table_name=$2
    ORDER BY c.ordinal_position
    `,
    [schema, tabela]
  )

  const parts = []
  for (const col of cols) {
    let type = mapType(col)
    let def = ''
    if (col.column_default && !col.column_default.includes('nextval')) {
      def = ` DEFAULT ${col.column_default}`
    }
    const notNull = col.is_nullable === 'NO' ? ' NOT NULL' : ''
    parts.push(`  "${col.column_name}" ${type}${notNull}${def}`)
  }

  // PK
  const { rows: pk } = await src.query(
    `
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema=$1 AND tc.table_name=$2
    ORDER BY kcu.ordinal_position
    `,
    [schema, tabela]
  )
  if (pk.length) {
    parts.push(`  PRIMARY KEY (${pk.map(p => `"${p.column_name}"`).join(', ')})`)
  }

  let sql = `CREATE TABLE IF NOT EXISTS "${schema}"."${tabela}" (\n${parts.join(',\n')}\n)`
  // Adicionar sequências para colunas com serial/nextval
  for (const col of cols) {
    if (col.column_default && col.column_default.includes('nextval')) {
      const seqName = col.column_default.match(/nextval\('([^']+)'/)?.[1]
      if (seqName) {
        // Sequência pode estar em schema diferente; criar no mesmo schema da tabela
        const parts = seqName.split('.')
        const seqSchema = parts.length > 1 ? parts.slice(0, -1).join('.') : schema
        const seqOnly = parts.length > 1 ? parts[parts.length - 1] : seqName
        sql += `;\nCREATE SCHEMA IF NOT EXISTS "${seqSchema}"`
        sql += `;\nCREATE SEQUENCE IF NOT EXISTS "${seqSchema}"."${seqOnly}"`
        sql += `;\nALTER SEQUENCE "${seqSchema}"."${seqOnly}" OWNED BY "${schema}"."${tabela}"."${col.column_name}"`
        sql += `;\nALTER TABLE "${schema}"."${tabela}" ALTER COLUMN "${col.column_name}" SET DEFAULT nextval('"${seqSchema}"."${seqOnly}"')`
      }
    }
  }
  return sql
}

function mapType(col) {
  if (col.data_type === 'character varying') {
    return col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar'
  }
  if (col.data_type === 'character') {
    return col.character_maximum_length ? `char(${col.character_maximum_length})` : 'char'
  }
  if (col.data_type === 'numeric') {
    if (col.numeric_precision) return `numeric(${col.numeric_precision},${col.numeric_scale || 0})`
    return 'numeric'
  }
  if (col.data_type === 'USER-DEFINED') return col.udt_name
  if (col.data_type === 'ARRAY') return `${col.udt_name.replace('_', '')}[]`
  return col.data_type
}

async function resetSequencias(dst, schema, tabela) {
  const ident = `"${schema}"."${tabela}"`
  const { rows } = await dst.query(
    `
    SELECT c.column_name, c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema=$1 AND c.table_name=$2 AND c.column_default LIKE 'nextval%'
    `,
    [schema, tabela]
  )
  for (const col of rows) {
    const seqMatch = col.column_default.match(/nextval\('([^']+)'/)
    if (!seqMatch) continue
    const seq = seqMatch[1]
    try {
      await dst.query(
        `SELECT setval($1, COALESCE((SELECT MAX("${col.column_name}") FROM ${ident}), 1))`,
        [seq]
      )
    } catch {}
  }
}

main().catch(e => {
  console.error('ERRO:', e.message)
  console.error(e.stack?.split('\n').slice(0, 5).join('\n'))
  process.exit(1)
})
