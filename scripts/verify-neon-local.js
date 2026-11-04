#!/usr/bin/env node
/**
 * Validação Neon x local (dgbcomex_warehouse)
 * Fase 2 do docs/wms-modulo.md - item 3
 *
 * Compara count(*) por tabela dos schemas public, marts, auth, etl.
 * Critério de aceite: 0 divergência nas tabelas copiadas.
 *
 * Arquitetura (superset):
 *   - Neon  = dado do app (CRM e módulos que não vêm do ERP) -> rápido para a aplicação.
 *   - local = TUDO do Neon + carga do ERP (schemas raw/core/etl) + runtime do WMS.
 *   - Se o Neon for perdido, o local ainda tem todos os dados (fallback).
 * Por isso o local pode TER MAIS tabelas/linhas: o que não pode é ter MENOS.
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const SCHEMAS = ['public', 'marts', 'auth', 'etl']
const SCHEMAS_ERP_LOCAL = ['raw', 'core']

async function main() {
  const srcUrl = process.env.DATABASE_URL
  const dstUrl = process.env.DATABASE_URL_LOCAL

  if (!srcUrl) throw new Error('DATABASE_URL (Neon) não configurada')
  if (!dstUrl) throw new Error('DATABASE_URL_LOCAL não configurada')

  const src = new Pool({ connectionString: srcUrl })
  const dst = new Pool({ connectionString: dstUrl })

  try {
    console.log('=== Verificação Neon x local ===')
    console.log('')

    let total = 0
    let iguais = 0
    let divergentes = 0
    const divs = []

    for (const schema of SCHEMAS) {
      const { rows: tables } = await src.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE' ORDER BY table_name`,
        [schema]
      )

      for (const t of tables) {
        total++
        const q = `SELECT COUNT(*)::int AS c FROM "${schema}"."${t.table_name}"`
        let c1, c2
        try { const a = await src.query(q); c1 = a.rows[0].c } catch (e) { c1 = 'ERR' }
        try { const b = await dst.query(q); c2 = b.rows[0].c } catch (e) { c2 = 'ERR' }

        if (c1 === c2) {
          iguais++
        } else {
          divergentes++
          divs.push({ schema, tabela: t.table_name, src: c1, dst: c2 })
          console.log(`DIVERGENTE: ${schema}.${t.table_name} | Neon=${c1} | Local=${c2}`)
        }
      }
    }

    console.log('')
    console.log('=== Resultado ===')
    console.log(`Tabelas verificadas: ${total}`)
    console.log(`Iguais: ${iguais}`)
    console.log(`Divergentes: ${divergentes}`)

    // Superset: o que o local tem a mais (ERP + WMS) — esperado, não é divergência
    const extras = await extrasLocal(dst, src)
    if (extras.tabelas.length) {
      console.log('')
      console.log(`Local tem ${extras.tabelas.length} tabela(s) a mais (carga ERP / runtime WMS):`)
      for (const t of extras.tabelas) console.log(`  - ${t}`)
    }

    // Carga do ERP (raw/core): existe só no local e é o motivo de ele existir
    const erp = await cargaErp(dst)
    console.log('')
    console.log(`Carga ERP no local (raw/core): ${erp.tabelas} tabelas, ${erp.linhas} linhas`)
    if (erp.linhas === 0) {
      console.log('⚠️  ATENÇÃO: carga ERP vazia no local — o fallback perde os dados do ERP')
    }

    if (divergentes === 0) {
      console.log('')
      console.log('✓ CRITÉRIO DE ACEITE ATINGIDO: 0 divergências (local ⊇ Neon)')
      process.exit(0)
    } else {
      console.log('')
      console.log('✗ DIVERGÊNCIAS ENCONTRADAS')
      process.exit(1)
    }
  } finally {
    await src.end()
    await dst.end()
  }
}

/** Tabelas que existem no local e não no Neon (ERP/WMS) — esperado no superset. */
async function extrasLocal(dst, src) {
  const tabelas = []
  for (const schema of SCHEMAS) {
    const a = await src.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'`,
      [schema]
    )
    const b = await dst.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'`,
      [schema]
    )
    const doNeon = new Set(a.rows.map(r => r.table_name))
    for (const { table_name } of b.rows) {
      if (!doNeon.has(table_name)) tabelas.push(`${schema}.${table_name}`)
    }
  }
  return { tabelas }
}

/** Volume da carga ERP (schemas raw/core) presente só no local. */
async function cargaErp(dst) {
  let tabelas = 0
  let linhas = 0
  for (const schema of SCHEMAS_ERP_LOCAL) {
    const existe = await dst.query(`SELECT to_regnamespace($1) IS NOT NULL AS ok`, [schema])
    if (!existe.rows[0].ok) continue
    const tabs = await dst.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'`,
      [schema]
    )
    for (const { table_name } of tabs.rows) {
      try {
        const c = await dst.query(`SELECT COUNT(*)::int AS c FROM "${schema}"."${table_name}"`)
        tabelas++
        linhas += c.rows[0].c
      } catch {}
    }
  }
  return { tabelas, linhas }
}

main().catch(e => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
