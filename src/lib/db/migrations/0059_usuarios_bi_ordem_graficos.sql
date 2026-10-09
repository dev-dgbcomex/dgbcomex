-- BI: ordem dos gráficos do detalhe de faturamento por usuário (arrastar/salvar em /bi/integracoes/faturamento)
-- statement-breakpoint
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bi_ordem_graficos JSONB DEFAULT '[]'::jsonb;