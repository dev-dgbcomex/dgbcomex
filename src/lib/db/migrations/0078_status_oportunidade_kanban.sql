INSERT INTO "status" (nome, rotulo, tipo, cor, ordem, ativo, exibir_kanban) VALUES
  ('NOVO', 'Novo', 'OPORTUNIDADE', '#3b82f6', 1, true, true),
  ('QUALIFICACAO', 'Qualificação', 'OPORTUNIDADE', '#8b5cf6', 2, true, true),
  ('PROPOSTA', 'Proposta', 'OPORTUNIDADE', '#f59e0b', 3, true, true),
  ('NEGOCIACAO', 'Negociação', 'OPORTUNIDADE', '#f97316', 4, true, true),
  ('FECHADO_GANHO', 'Ganho', 'OPORTUNIDADE', '#22c55e', 5, true, true),
  ('FECHADO_PERDIDO', 'Perdido', 'OPORTUNIDADE', '#ef4444', 6, true, true)
ON CONFLICT (nome, tipo) DO NOTHING;

UPDATE "status"
SET ativo = true, exibir_kanban = true
WHERE tipo = 'OPORTUNIDADE'
  AND nome IN ('NOVO','QUALIFICACAO','PROPOSTA','NEGOCIACAO','FECHADO_GANHO','FECHADO_PERDIDO');
