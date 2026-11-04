-- ============================================
-- crm_pessoas: tarja de promocao para cliente
-- A tarja marca a pessoa que ja virou cliente: ela sai da listagem
-- (por padrao) mas continua nos relatorios com todo o historico.
-- ============================================

ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS promovida_cliente boolean NOT NULL DEFAULT false;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS promovido_em timestamp;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS promovido_por integer REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE crm_pessoas ADD COLUMN IF NOT EXISTS promovido_por_nome varchar(255);

CREATE INDEX IF NOT EXISTS idx_crm_pessoas_promovida_cliente ON crm_pessoas (promovida_cliente);

-- Backfill: quem ja estava vinculado a um cliente recebe a tarja.
-- A data usa a criacao do cliente (quando a conversao aconteceu de fato).
UPDATE crm_pessoas p
SET promovida_cliente = true,
    promovido_em = COALESCE(c.created_at, p.updated_at, p.created_at)
FROM clientes c
WHERE p.cliente_id = c.id
  AND p.promovida_cliente = false;
