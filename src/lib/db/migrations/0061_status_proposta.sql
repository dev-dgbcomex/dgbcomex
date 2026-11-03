INSERT INTO "status" (nome, rotulo, tipo, cor, ordem, ativo, exibir_kanban) VALUES
  ('ENVIADA', 'Enviada', 'PROPOSTA', '#3b82f6', 1, true, true),
  ('ACEITA', 'Aceita', 'PROPOSTA', '#22c55e', 2, true, true),
  ('RECUSADA', 'Recusada', 'PROPOSTA', '#ef4444', 3, true, true),
  ('REVISAO', 'Em Revisão', 'PROPOSTA', '#f59e0b', 4, true, true)
ON CONFLICT DO NOTHING;
