CREATE TABLE IF NOT EXISTS public.crm_saude_prospeccao_analises (
  id serial PRIMARY KEY,
  titulo varchar(300) NOT NULL,
  analise text NOT NULL,
  resumo text,
  contexto jsonb DEFAULT '{}'::jsonb NOT NULL,
  filtros jsonb DEFAULT '{}'::jsonb NOT NULL,
  provedor varchar(40),
  modelo varchar(120),
  situacao varchar(20) NOT NULL DEFAULT 'ABERTA',
  enviada_em timestamp,
  criado_por integer REFERENCES public.usuarios(id),
  criado_por_nome varchar(255),
  criado_por_email varchar(255),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_saude_prospeccao_mensagens (
  id serial PRIMARY KEY,
  analise_id integer NOT NULL REFERENCES public.crm_saude_prospeccao_analises(id) ON DELETE CASCADE,
  papel varchar(10) NOT NULL,
  conteudo text NOT NULL,
  dados_usados jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_saude_prospeccao_analises_criado
  ON public.crm_saude_prospeccao_analises (criado_por, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_saude_prospeccao_mensagens_analise
  ON public.crm_saude_prospeccao_mensagens (analise_id, created_at);

UPDATE public.user_menu_itens
SET titulo = 'Saúde da Prospecção',
    url = '/comercial/crm/saude-prospeccao'
WHERE url = '/comercial/crm/leads/dashboard';
