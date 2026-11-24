-- Vínculo N:N entre faturamentos e pedidos de venda do CRM.
-- Um faturamento do ERP pode faturar vários pedidos; um pedido pode aparecer em várias notas.
CREATE TABLE IF NOT EXISTS crm_faturamento_pedidos (
  faturamento_id INTEGER NOT NULL,
  pedido_venda_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (faturamento_id, pedido_venda_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crm_faturamento_pedidos_faturamento_id_fkey'
  ) THEN
    ALTER TABLE crm_faturamento_pedidos
      ADD CONSTRAINT crm_faturamento_pedidos_faturamento_id_fkey
      FOREIGN KEY (faturamento_id) REFERENCES crm_faturamentos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crm_faturamento_pedidos_pedido_venda_id_fkey'
  ) THEN
    ALTER TABLE crm_faturamento_pedidos
      ADD CONSTRAINT crm_faturamento_pedidos_pedido_venda_id_fkey
      FOREIGN KEY (pedido_venda_id) REFERENCES crm_pedidos_venda(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS crm_faturamento_pedidos_pedido_venda_id_idx
  ON crm_faturamento_pedidos(pedido_venda_id);

-- Backfill dos faturamentos que já tinham o pedido apenas na coluna única.
INSERT INTO crm_faturamento_pedidos (faturamento_id, pedido_venda_id)
SELECT id, pedido_venda_id
FROM crm_faturamentos
WHERE pedido_venda_id IS NOT NULL
ON CONFLICT DO NOTHING;
