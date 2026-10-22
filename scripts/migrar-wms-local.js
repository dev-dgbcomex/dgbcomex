#!/usr/bin/env node
/**
 * Cria/atualiza as tabelas do WMS no PostgreSQL local (`dgbcomex_warehouse`).
 *
 * O WMS NÃO usa o Neon. Este script é idempotente (`CREATE TABLE IF NOT EXISTS`).
 *
 * Uso: node scripts/migrar-wms-local.js
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const url = process.env.DATABASE_URL_LOCAL
  if (!url) throw new Error('DATABASE_URL_LOCAL não configurada')

  const pool = new Pool({ connectionString: url })
  try {
    console.log('=== Migrando WMS no banco local ===')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_enderecos (
        id serial PRIMARY KEY,
        codigo varchar(60) NOT NULL,
        tipo varchar(20) NOT NULL DEFAULT 'PULMAO',
        zona varchar(60),
        rua varchar(30),
        predio varchar(30),
        nivel varchar(30),
        apto varchar(30),
        capacidade numeric(12,2),
        ativo boolean NOT NULL DEFAULT true,
        observacoes text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS wms_enderecos_codigo_key ON public.wms_enderecos (codigo)`
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_estoque (
        id serial PRIMARY KEY,
        endereco_id integer NOT NULL REFERENCES public.wms_enderecos(id) ON DELETE RESTRICT,
        empresa varchar(10),
        nro_rolo varchar(30) NOT NULL,
        nro_peca varchar(30) NOT NULL,
        produto varchar(30),
        categoria varchar(10),
        cor varchar(10),
        desenho varchar(10),
        variante varchar(10),
        largura varchar(20),
        metros numeric(18,2),
        peso numeric(18,2),
        situacao varchar(10),
        lote_interno varchar(40),
        data_entrada date,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS wms_estoque_rolo_peca_key ON public.wms_estoque (nro_rolo, nro_peca)`
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_estoque_endereco_idx ON public.wms_estoque (endereco_id)`
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_movimentos (
        id serial PRIMARY KEY,
        tipo varchar(20) NOT NULL,
        estoque_id integer REFERENCES public.wms_estoque(id) ON DELETE SET NULL,
        endereco_origem_id integer REFERENCES public.wms_enderecos(id) ON DELETE SET NULL,
        endereco_destino_id integer REFERENCES public.wms_enderecos(id) ON DELETE SET NULL,
        usuario_id integer,
        metros numeric(18,2),
        peso numeric(18,2),
        observacao text,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_movimentos_created_idx ON public.wms_movimentos (created_at)`
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_movimentos_estoque_idx ON public.wms_movimentos (estoque_id)`
    )

    const { rows } = await pool.query(
      `select table_name from information_schema.tables where table_schema='public' and table_name like 'wms_%' order by table_name`
    )
    console.log('Tabelas WMS no local:', rows.map((r) => r.table_name).join(', '))
    console.log('OK')
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
