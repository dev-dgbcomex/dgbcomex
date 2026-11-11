-- ============================================
-- Contato e visita aceitam vinculo com CLIENTE (ou nenhum vinculo)
-- As tabelas foram criadas com empresa_id NOT NULL, mas o CRM permite:
--   - contato de cliente (cliente_id) ou contato avulso (sem vinculo)
--   - visita de cliente (cliente_id) ou visita avulsa (nome_avulso)
-- Sem o DROP NOT NULL, o INSERT/UPDATE falha com 23502 (500 na API).
-- ============================================

ALTER TABLE crm_contatos ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE crm_visitas ALTER COLUMN empresa_id DROP NOT NULL;
