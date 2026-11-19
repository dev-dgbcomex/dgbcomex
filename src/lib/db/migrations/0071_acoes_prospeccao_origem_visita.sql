-- Rastreio da visita reclassificada como ação de prospecção.
-- Sem FK de propósito: o vínculo sobrevive quando os registros de visita forem limpos.
ALTER TABLE crm_acoes_prospeccao ADD COLUMN IF NOT EXISTS origem_visita_id INTEGER;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_origem_visita_id
  ON crm_acoes_prospeccao (origem_visita_id)
  WHERE origem_visita_id IS NOT NULL;
