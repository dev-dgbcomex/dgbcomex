-- ============================================
-- Relacionamentos do CLIENTE no CRM
-- O cliente passa a ter a mesma vida da pessoa no CRM: timeline, WhatsApp,
-- oportunidades, propostas e visitas ficam linked no cliente, para que tudo
-- o que acontece com ele apareca nos relatorios e na tela do cliente.
-- ============================================

-- crm_timeline_eventos: a timeline aceita cliente_id (empresa_id deixa de ser obrigatorio)
ALTER TABLE crm_timeline_eventos ADD COLUMN IF NOT EXISTS cliente_id integer REFERENCES clientes(id) ON DELETE SET NULL;
ALTER TABLE crm_timeline_eventos ALTER COLUMN empresa_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_timeline_eventos_cliente_id ON crm_timeline_eventos (cliente_id);

-- crm_whatsapp_mensagens: a conversa tambem e do cliente
ALTER TABLE crm_whatsapp_mensagens ADD COLUMN IF NOT EXISTS cliente_id integer REFERENCES clientes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_whatsapp_mensagens_cliente_id ON crm_whatsapp_mensagens (cliente_id);

-- Backfill: o negocio da pessoa promovida passa a apontar para o cliente,
-- para aparecer nos relatorios de oportunidades, propostas e visitas.
UPDATE crm_oportunidades o SET cliente_id = p.cliente_id
FROM crm_pessoas p
WHERE o.empresa_id = p.id AND p.cliente_id IS NOT NULL AND o.cliente_id IS NULL;

UPDATE crm_propostas pr SET cliente_id = p.cliente_id
FROM crm_pessoas p
WHERE pr.empresa_id = p.id AND p.cliente_id IS NOT NULL AND pr.cliente_id IS NULL;

UPDATE crm_visitas v SET cliente_id = p.cliente_id
FROM crm_pessoas p
WHERE v.empresa_id = p.id AND p.cliente_id IS NOT NULL AND v.cliente_id IS NULL;
