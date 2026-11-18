CREATE TABLE IF NOT EXISTS campo_visibilidade (
  id SERIAL PRIMARY KEY,
  cadastro VARCHAR(80) NOT NULL,
  campo VARCHAR(80) NOT NULL,
  roles_ocultos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT campo_visibilidade_cadastro_campo_key UNIQUE (cadastro, campo)
);

INSERT INTO campo_visibilidade (cadastro, campo, roles_ocultos)
VALUES ('CRM_VISITA_DETALHE', 'proposta_vinculada', '["COMERCIAL"]'::jsonb)
ON CONFLICT (cadastro, campo) DO NOTHING;
