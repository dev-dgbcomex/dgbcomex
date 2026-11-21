CREATE UNIQUE INDEX IF NOT EXISTS clientes_cnpj_normalizado_unique
  ON public.clientes (regexp_replace(cnpj, '\D', '', 'g'));

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_cnpj_normalizado_unique
  ON public.crm_leads (regexp_replace(cnpj, '\D', '', 'g'))
  WHERE cnpj IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_cpf_normalizado_unique
  ON public.crm_leads (regexp_replace(cpf, '\D', '', 'g'))
  WHERE cpf IS NOT NULL;

UPDATE public.crm_timeline_eventos
   SET descricao = regexp_replace(descricao, '^Visita ', 'Ação de prospecção ')
 WHERE tipo = 'ACAO_PROSPECCAO'
   AND descricao LIKE 'Visita %';
