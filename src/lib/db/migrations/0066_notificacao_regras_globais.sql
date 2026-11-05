-- ============================================
-- Regra global de notificacoes (perfis que recebem TUDO)
-- O tipo reservado "TODOS" em notificacao_regras guarda os perfis que
-- recebem todas as notificacoes do sistema, inclusive as que nao tem regra
-- por tipo. Configuravel em Admin > Notificacoes.
-- ============================================

INSERT INTO notificacao_regras (tipo, roles)
VALUES ('TODOS', '["ADMIN","SUDO"]'::jsonb)
ON CONFLICT (tipo) DO NOTHING;
