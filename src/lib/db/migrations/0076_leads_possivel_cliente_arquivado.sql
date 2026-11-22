ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS arquivado_em timestamp;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS arquivado_por integer REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS arquivado_por_nome varchar(255);

CREATE INDEX IF NOT EXISTS idx_crm_leads_arquivado ON public.crm_leads (arquivado);

INSERT INTO public.status (nome, rotulo, tipo, cor, ordem, ativo, exibir_kanban)
VALUES ('POSSIVEL_CLIENTE', 'Possível Cliente', 'LEAD', '#8b5cf6', 3, true, true)
ON CONFLICT (nome, tipo) DO NOTHING;

UPDATE public.status
SET exibir_kanban = true,
    ativo = true
WHERE tipo = 'LEAD'
  AND nome IN ('NOVO', 'QUALIFICADO', 'POSSIVEL_CLIENTE', 'PERDIDO', 'INATIVO');

UPDATE public.status
SET exibir_kanban = false,
    rotulo = 'Cliente',
    ordem = 6
WHERE tipo = 'LEAD'
  AND nome = 'CONVERTIDO_CLIENTE';
