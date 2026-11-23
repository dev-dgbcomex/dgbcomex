-- Faturamentos do CRM vinculados ao pedido de venda do CRM
ALTER TABLE crm_faturamentos ADD COLUMN IF NOT EXISTS pedido_venda_id INTEGER;

ALTER TABLE crm_faturamentos
ADD CONSTRAINT crm_faturamentos_pedido_venda_id_fkey
FOREIGN KEY (pedido_venda_id) REFERENCES crm_pedidos_venda(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_faturamentos_pedido_venda_id_idx
ON crm_faturamentos(pedido_venda_id);

-- Vincula faturamentos existentes ao pedido do ERP pelo código da referência externa
UPDATE crm_faturamentos f
SET pedido_venda_id = p.id
FROM crm_pedidos_venda p
WHERE f.origem = 'ERP'
  AND f.pedido_venda_id IS NULL
  AND f.referencia_externa IS NOT NULL
  AND p.origem = 'ERP'
  AND p.referencia_externa IS NOT NULL
  AND substring(f.referencia_externa from '^([^/]+/[^/]+)') = p.referencia_externa;
