INSERT INTO "notificacao_regras" (tipo, roles) VALUES ('ATIVIDADE_COMERCIAL', '["COMERCIAL","CRM"]'::jsonb)
ON CONFLICT (tipo) DO NOTHING;
