-- BI: ordem dos cards de integração por usuário (arrastar/salvar em /bi/integracoes)
--> statement-breakpoint
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bi_ordem_cards JSONB DEFAULT '[]'::jsonb;
