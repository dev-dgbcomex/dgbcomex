ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS status varchar(30) DEFAULT 'ATIVO';

UPDATE public.clientes SET status = 'ATIVO' WHERE status IS NULL;

ALTER TABLE public.clientes ALTER COLUMN status SET NOT NULL;

INSERT INTO public.status (nome, rotulo, tipo, cor, ordem, ativo, exibir_kanban)
VALUES
  ('NOVO', 'Novo', 'LEAD', '#3b82f6', 1, true, false),
  ('QUALIFICADO', 'Qualificado', 'LEAD', '#10b981', 2, true, false),
  ('CONVERTIDO_CLIENTE', 'Cliente', 'LEAD', '#22c55e', 3, true, false),
  ('PERDIDO', 'Perdido', 'LEAD', '#ef4444', 4, true, false),
  ('INATIVO', 'Inativo', 'LEAD', '#94a3b8', 5, true, false),
  ('ATIVO', 'Ativo', 'CLIENTE', '#22c55e', 1, true, false),
  ('INATIVO', 'Inativo', 'CLIENTE', '#94a3b8', 2, true, false)
ON CONFLICT (nome, tipo) DO NOTHING;
