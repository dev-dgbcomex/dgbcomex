#!/usr/bin/env node
/**
 * Validação Neon x local (dgbcomex_warehouse)
 * Fase 2 do docs/wms-modulo.md - item 3
 *
 * Compara count(*) por tabela dos schemas public, marts, auth, etl.
 * Critério de aceite: 0 divergência nas tabelas copiadas.
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const SCHEMAS = ['public', 'marts', 'auth', 'etl']

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

    if (divergentes === 0) {
      console.log('')
      console.log('✓ CRITÉRIO DE ACEITE ATINGIDO: 0 divergências')
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

main().catch(e => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
