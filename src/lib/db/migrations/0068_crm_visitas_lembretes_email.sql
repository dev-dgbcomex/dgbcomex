ALTER TABLE crm_visitas ADD COLUMN IF NOT EXISTS lembrete_dia_anterior_enviado boolean NOT NULL DEFAULT false;
ALTER TABLE crm_visitas ADD COLUMN IF NOT EXISTS lembrete_dia_visita_enviado boolean NOT NULL DEFAULT false;
