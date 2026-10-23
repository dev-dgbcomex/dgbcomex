#!/usr/bin/env node
/**
 * Cria/atualiza as tabelas do WMS no PostgreSQL local (`dgbcomex_warehouse`).
 *
 * O WMS NÃO usa o Neon. Este script é idempotente (`CREATE TABLE IF NOT EXISTS`).
 *
 * Modelo: situação do pedido no kanban (cadastro local, independente do ERP) + ordem de
 * separação + peças reservadas/separadas. Peças em ordem ativa ficam bloqueadas; ao
 * concluir continuam bloqueadas até a baixa no ERP.
 *
 * Uso: node scripts/migrar-wms-local.js
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const SITUACOES = [
  {
    codigo: 'SEM_SEPARACAO',
    nome: 'Sem separação',
    cor: '#94a3b8',
    ordem: 0,
    acao: 'NENHUMA',
    perfis: ['COMERCIAL'],
    sistema: true,
  },
  {
    codigo: 'LIBERADO',
    nome: 'Liberado',
    cor: '#f59e0b',
    ordem: 10,
    acao: 'NENHUMA',
    perfis: ['COMERCIAL'],
    sistema: false,
  },
  {
    codigo: 'EM_SEPARACAO',
    nome: 'Em separação',
    cor: '#2563eb',
    ordem: 20,
    acao: 'CRIAR_ORDEM',
    perfis: ['COMERCIAL', 'EXPEDICAO'],
    sistema: false,
  },
  {
    codigo: 'SEPARADO',
    nome: 'Separado',
    cor: '#16a34a',
    ordem: 30,
    acao: 'CONCLUIR_ORDEM',
    perfis: ['COMERCIAL', 'EXPEDICAO'],
    sistema: false,
  },
  {
    codigo: 'CANCELADO',
    nome: 'Cancelado',
    cor: '#ef4444',
    ordem: 40,
    acao: 'CANCELAR_ORDEM',
    perfis: ['COMERCIAL', 'EXPEDICAO'],
    sistema: false,
  },
]

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

    await pool.query(`ALTER TABLE public.wms_separacoes DROP CONSTRAINT IF EXISTS wms_separacoes_status_check`)
    await pool.query(
      `ALTER TABLE public.wms_separacoes
         ADD CONSTRAINT wms_separacoes_status_check
         CHECK (status IN ('LIBERADO', 'EM_SEPARACAO', 'SEPARADO', 'CANCELADO'))`
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_situacoes_pedido (
        id serial PRIMARY KEY,
        codigo varchar(40) NOT NULL UNIQUE,
        nome varchar(80) NOT NULL,
        cor varchar(20) NOT NULL DEFAULT '#94a3b8',
        ordem integer NOT NULL DEFAULT 0,
        acao varchar(30) NOT NULL DEFAULT 'NENHUMA',
        perfis text[] NOT NULL DEFAULT '{}',
        ativo boolean NOT NULL DEFAULT true,
        sistema boolean NOT NULL DEFAULT false,
        criado_em timestamp NOT NULL DEFAULT now(),
        atualizado_em timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_situacoes_pedido_ordem_idx
         ON public.wms_situacoes_pedido (ativo, ordem, id)`
    )

    for (const situacao of SITUACOES) {
      await pool.query(
        `INSERT INTO public.wms_situacoes_pedido
           (codigo, nome, cor, ordem, acao, perfis, ativo, sistema)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         ON CONFLICT (codigo) DO NOTHING`,
        [
          situacao.codigo,
          situacao.nome,
          situacao.cor,
          situacao.ordem,
          situacao.acao,
          situacao.perfis,
          situacao.sistema,
        ]
      )
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_pedidos_situacao (
        empresa varchar(10) NOT NULL,
        pedido varchar(30) NOT NULL,
        situacao_id integer NOT NULL
          REFERENCES public.wms_situacoes_pedido(id) ON DELETE RESTRICT,
        atualizado_por integer,
        atualizado_em timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY (empresa, pedido)
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_pedidos_situacao_situacao_idx
         ON public.wms_pedidos_situacao (situacao_id)`
    )

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.wms_pedido_eventos (
        id serial PRIMARY KEY,
        empresa varchar(10) NOT NULL,
        pedido varchar(30) NOT NULL,
        situacao_anterior_id integer
          REFERENCES public.wms_situacoes_pedido(id) ON DELETE SET NULL,
        situacao_nova_id integer
          REFERENCES public.wms_situacoes_pedido(id) ON DELETE SET NULL,
        usuario_id integer,
        observacao text,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS wms_pedido_eventos_pedido_idx
         ON public.wms_pedido_eventos (empresa, pedido, created_at DESC)`
    )

    // Ordens antigas passam a ter uma situacao local correspondente (nao sobrescreve).
    await pool.query(`
      INSERT INTO public.wms_pedidos_situacao (empresa, pedido, situacao_id)
      SELECT o.empresa, o.pedido, s.id
      FROM (
        SELECT DISTINCT ON (empresa, pedido) empresa, pedido, status
        FROM public.wms_separacoes
        ORDER BY empresa, pedido, id DESC
      ) o
      JOIN public.wms_situacoes_pedido s ON s.codigo = o.status
      ON CONFLICT (empresa, pedido) DO NOTHING
    `)

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
