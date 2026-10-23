#!/usr/bin/env node
/**
 * Cria/atualiza as tabelas do WMS no PostgreSQL local (`dgbcomex_warehouse`).
 *
 * O WMS NÃO usa o Neon. Este script é idempotente (`CREATE TABLE IF NOT EXISTS`).
 *
 * Modelo: ordem de separação do pedido (comercial marca) + peças reservadas/separadas
 * (estoque seleciona). Peças em ordem ativa ficam bloqueadas; ao concluir continuam
 * bloqueadas até a baixa no ERP.
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

    // Modelo antigo (enderecos/estoque/movimentos) foi substituido por separacoes.
    await pool.query(`DROP TABLE IF EXISTS public.wms_movimentos CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS public.wms_estoque CASCADE`)
    await pool.query(`DROP TABLE IF EXISTS public.wms_enderecos CASCADE`)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_separacoes (
        id serial PRIMARY KEY,
        empresa varchar(10) NOT NULL,
        pedido varchar(30) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'LIBERADO',
        cliente_codigo varchar(30),
        cliente_nome varchar(200),
        data_pedido date,
        data_entrega date,
        observacao text,
        motivo_cancelamento text,
        criado_por integer,
        iniciado_por integer,
        concluido_por integer,
        cancelado_por integer,
        criado_em timestamp NOT NULL DEFAULT now(),
        iniciado_em timestamp,
        concluido_em timestamp,
        cancelado_em timestamp,
        atualizado_em timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS wms_separacoes_pedido_ativo_key
         ON public.wms_separacoes (empresa, pedido)
         WHERE status IN ('LIBERADO', 'EM_SEPARACAO')`
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_separacoes_status_idx
         ON public.wms_separacoes (status, atualizado_em DESC)`
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_separacao_pecas (
        id serial PRIMARY KEY,
        separacao_id integer NOT NULL REFERENCES public.wms_separacoes(id) ON DELETE CASCADE,
        item integer NOT NULL,
        empresa varchar(10) NOT NULL,
        nro_rolo varchar(30) NOT NULL,
        nro_peca varchar(30) NOT NULL,
        produto varchar(30),
        situacao varchar(10),
        cor varchar(10),
        desenho varchar(10),
        variante varchar(10),
        categoria varchar(10),
        largura varchar(20),
        sub_lote varchar(40),
        aviso varchar(40),
        gaveta varchar(60),
        metros numeric(18,2),
        peso numeric(18,2),
        status varchar(20) NOT NULL DEFAULT 'RESERVADA',
        adicionado_por integer,
        adicionado_em timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS wms_separacao_pecas_ativa_key
         ON public.wms_separacao_pecas (empresa, nro_rolo, nro_peca)
         WHERE status IN ('RESERVADA', 'SEPARADA')`
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_separacao_pecas_separacao_idx
         ON public.wms_separacao_pecas (separacao_id, item)`
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_separacao_eventos (
        id serial PRIMARY KEY,
        separacao_id integer NOT NULL REFERENCES public.wms_separacoes(id) ON DELETE CASCADE,
        tipo varchar(30) NOT NULL,
        descricao text,
        usuario_id integer,
        payload jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_separacao_eventos_separacao_idx
         ON public.wms_separacao_eventos (separacao_id, created_at)`
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
