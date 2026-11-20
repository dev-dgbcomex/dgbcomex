DO $$
BEGIN
  IF to_regclass('public.crm_leads') IS NOT NULL AND to_regclass('public.crm_visitantes') IS NULL THEN
    ALTER TABLE public.crm_leads RENAME TO crm_visitantes;
  END IF;

  IF to_regclass('public.crm_pessoas') IS NOT NULL AND to_regclass('public.crm_leads') IS NULL THEN
    ALTER TABLE public.crm_pessoas RENAME TO crm_leads;
  END IF;

  IF to_regclass('public.pessoas_representantes') IS NOT NULL AND to_regclass('public.leads_representantes') IS NULL THEN
    ALTER TABLE public.pessoas_representantes RENAME TO leads_representantes;
  END IF;
END $$;

--> statement-breakpoint
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('crm_oportunidades', 'lead_id', 'visitante_id'),
      ('crm_visitantes', 'pessoa_id', 'lead_id'),
      ('crm_visitantes', 'empresa_id', 'lead_id_legado'),
      ('crm_acoes_prospeccao', 'empresa_id', 'lead_id'),
      ('crm_contatos', 'empresa_id', 'lead_id'),
      ('crm_oportunidades', 'empresa_id', 'lead_id'),
      ('crm_propostas', 'empresa_id', 'lead_id'),
      ('crm_tarefas', 'empresa_id', 'lead_id'),
      ('crm_timeline_eventos', 'empresa_id', 'lead_id'),
      ('crm_visitas', 'empresa_id', 'lead_id'),
      ('crm_whatsapp_mensagens', 'empresa_id', 'lead_id'),
      ('leads_representantes', 'pessoa_id', 'lead_id')
    ) AS v(tabela, antigo, novo)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = item.tabela AND column_name = item.antigo
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = item.tabela AND column_name = item.novo
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', item.tabela, item.antigo, item.novo);
    END IF;
  END LOOP;
END $$;

--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('public.crm_leads_id_seq') IS NOT NULL AND to_regclass('public.crm_visitantes_id_seq') IS NULL THEN
    ALTER SEQUENCE public.crm_leads_id_seq RENAME TO crm_visitantes_id_seq;
  END IF;

  IF to_regclass('public.crm_empresas_id_seq') IS NOT NULL AND to_regclass('public.crm_leads_id_seq') IS NULL THEN
    ALTER SEQUENCE public.crm_empresas_id_seq RENAME TO crm_leads_id_seq;
  END IF;

  IF to_regclass('public.crm_visitantes') IS NOT NULL THEN
    ALTER TABLE public.crm_visitantes ALTER COLUMN id SET DEFAULT nextval('public.crm_visitantes_id_seq'::regclass);
  END IF;

  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    ALTER TABLE public.crm_leads ALTER COLUMN id SET DEFAULT nextval('public.crm_leads_id_seq'::regclass);
  END IF;
END $$;

--> statement-breakpoint
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('crm_visitantes', 'crm_leads_pkey', 'crm_visitantes_pkey'),
      ('crm_visitantes', 'crm_leads_responsavel_id_fkey', 'crm_visitantes_responsavel_id_fkey'),
      ('crm_visitantes', 'crm_leads_pessoa_id_fkey', 'crm_visitantes_lead_id_fkey'),
      ('crm_leads', 'crm_empresas_pkey', 'crm_leads_pkey'),
      ('crm_leads', 'crm_pessoas_pkey', 'crm_leads_pkey'),
      ('crm_leads', 'crm_empresas_cnpj_key', 'crm_leads_cnpj_key'),
      ('crm_leads', 'crm_pessoas_cnpj_key', 'crm_leads_cnpj_key'),
      ('crm_leads', 'crm_empresas_cliente_id_fkey', 'crm_leads_cliente_id_fkey'),
      ('crm_leads', 'crm_pessoas_cliente_id_fkey', 'crm_leads_cliente_id_fkey'),
      ('crm_leads', 'crm_empresas_responsavel_id_fkey', 'crm_leads_responsavel_id_fkey'),
      ('crm_leads', 'crm_pessoas_responsavel_id_fkey', 'crm_leads_responsavel_id_fkey'),
      ('crm_leads', 'crm_pessoas_promovido_por_fkey', 'crm_leads_promovido_por_fkey'),
      ('crm_oportunidades', 'crm_oportunidades_lead_id_fkey', 'crm_oportunidades_visitante_id_fkey'),
      ('crm_acoes_prospeccao', 'crm_acoes_prospeccao_empresa_id_fkey', 'crm_acoes_prospeccao_lead_id_fkey'),
      ('crm_contatos', 'crm_contatos_empresa_id_fkey', 'crm_contatos_lead_id_fkey'),
      ('crm_oportunidades', 'crm_oportunidades_empresa_id_fkey', 'crm_oportunidades_lead_id_fkey'),
      ('crm_propostas', 'crm_propostas_empresa_id_fkey', 'crm_propostas_lead_id_fkey'),
      ('crm_tarefas', 'crm_tarefas_empresa_id_fkey', 'crm_tarefas_lead_id_fkey'),
      ('crm_timeline_eventos', 'crm_timeline_eventos_empresa_id_fkey', 'crm_timeline_eventos_lead_id_fkey'),
      ('crm_visitas', 'crm_visitas_empresa_id_fkey', 'crm_visitas_lead_id_fkey'),
      ('crm_whatsapp_mensagens', 'crm_whatsapp_mensagens_empresa_id_fkey', 'crm_whatsapp_mensagens_lead_id_fkey'),
      ('leads_representantes', 'pessoas_representantes_pessoa_id_fkey', 'leads_representantes_lead_id_fkey')
    ) AS v(tabela, antigo, novo)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public' AND rel.relname = item.tabela AND con.conname = item.antigo
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public' AND rel.relname = item.tabela AND con.conname = item.novo
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', item.tabela, item.antigo, item.novo);
    END IF;
  END LOOP;
END $$;

--> statement-breakpoint
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('idx_crm_pessoas_promovida_cliente', 'idx_crm_leads_promovida_cliente'),
      ('idx_crm_leads_responsavel_id', 'idx_crm_visitantes_responsavel_id'),
      ('idx_crm_leads_pessoa_id', 'idx_crm_visitantes_lead_id'),
      ('idx_pessoas_representantes_pessoa_id', 'idx_leads_representantes_lead_id')
    ) AS v(antigo, novo)
  LOOP
    IF to_regclass('public.' || item.antigo) IS NOT NULL AND to_regclass('public.' || item.novo) IS NULL THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', item.antigo, item.novo);
    END IF;
  END LOOP;
END $$;
