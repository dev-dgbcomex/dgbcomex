CREATE TABLE IF NOT EXISTS public.crm_resumos_ia (
  id serial PRIMARY KEY,
  entidade_tipo varchar(10) NOT NULL,
  entidade_id integer NOT NULL,
  resumo text NOT NULL,
  insights text,
  sugestoes text,
  classificacao varchar(10) NOT NULL,
  motivo_classificacao text,
  contexto jsonb DEFAULT '{}'::jsonb,
  provedor varchar(40),
  modelo varchar(120),
  tentativas integer DEFAULT 0,
  criado_por integer REFERENCES public.usuarios(id),
  criado_por_nome varchar(255),
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_resumos_ia_entidade
  ON public.crm_resumos_ia (entidade_tipo, entidade_id, created_at DESC);
