ALTER TABLE crm_pedidos_venda ADD COLUMN IF NOT EXISTS status_erp VARCHAR(30);
ALTER TABLE crm_pedidos_venda ADD COLUMN IF NOT EXISTS status_erp_codigo VARCHAR(10);
ALTER TABLE crm_pedidos_venda ADD COLUMN IF NOT EXISTS status_erp_atualizado_em TIMESTAMP;
