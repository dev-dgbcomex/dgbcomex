-- Ações de Prospecção (clone do módulo Visitas)
CREATE TABLE IF NOT EXISTS crm_acoes_prospeccao (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES crm_pessoas(id),
  cliente_id INTEGER REFERENCES clientes(id),
  oportunidade_id INTEGER REFERENCES crm_oportunidades(id),
  contato_id INTEGER REFERENCES crm_contatos(id),
  viagem_id INTEGER REFERENCES crm_viagens(id),
  representante_id INTEGER REFERENCES representantes(id),
  representante_nome VARCHAR(300),
  proposta_id INTEGER REFERENCES crm_propostas(id),
  data_acao DATE NOT NULL,
  hora VARCHAR(5),
  tipo VARCHAR(20) NOT NULL DEFAULT 'PRESENCIAL',
  status VARCHAR(20) NOT NULL DEFAULT 'AGENDADA',
  endereco VARCHAR(300),
  numero VARCHAR(20),
  complemento VARCHAR(200),
  bairro VARCHAR(150),
  cidade VARCHAR(150),
  uf VARCHAR(2),
  cep VARCHAR(10),
  endereco_lat DOUBLE PRECISION,
  endereco_lng DOUBLE PRECISION,
  motivo_cancelamento TEXT,
  nome_avulso VARCHAR(300),
  relato TEXT,
  fotos JSONB DEFAULT '[]'::jsonb,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  criado_por INTEGER REFERENCES usuarios(id),
  duracao_estimada INTEGER,
  google_event_id VARCHAR(500),
  lembrete_dia_anterior_enviado BOOLEAN NOT NULL DEFAULT false,
  lembrete_dia_acao_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS crm_acoes_prospeccao_localizacoes (
  id SERIAL PRIMARY KEY,
  acao_id INTEGER NOT NULL REFERENCES crm_acoes_prospeccao(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  endereco VARCHAR(500),
  observacao TEXT,
  foto_url VARCHAR(500),
  tipo VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
  criado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS crm_acoes_prospeccao_pesquisas (
  id SERIAL PRIMARY KEY,
  acao_id INTEGER NOT NULL REFERENCES crm_acoes_prospeccao(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  token VARCHAR(64) NOT NULL UNIQUE,
  enviado_em TIMESTAMP,
  aberto_em TIMESTAMP,
  respondido_em TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  criado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS crm_acoes_prospeccao_pesquisas_respostas (
  id SERIAL PRIMARY KEY,
  pesquisa_id INTEGER NOT NULL REFERENCES crm_acoes_prospeccao_pesquisas(id) ON DELETE CASCADE,
  pergunta VARCHAR(200) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'ALTERNATIVA',
  resposta TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_empresa_id ON crm_acoes_prospeccao(empresa_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_cliente_id ON crm_acoes_prospeccao(cliente_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_oportunidade_id ON crm_acoes_prospeccao(oportunidade_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_contato_id ON crm_acoes_prospeccao(contato_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_criado_por ON crm_acoes_prospeccao(criado_por);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_localizacoes_acao_id ON crm_acoes_prospeccao_localizacoes(acao_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_localizacoes_criado_por ON crm_acoes_prospeccao_localizacoes(criado_por);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_pesquisas_acao_id ON crm_acoes_prospeccao_pesquisas(acao_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_pesquisas_criado_por ON crm_acoes_prospeccao_pesquisas(criado_por);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_crm_acoes_prospeccao_pesquisas_respostas_pesquisa_id ON crm_acoes_prospeccao_pesquisas_respostas(pesquisa_id);

--> statement-breakpoint
INSERT INTO status (nome, rotulo, tipo, cor, ordem) VALUES
  ('AGENDADA', 'Agendada', 'ACAO_PROSPECCAO', '#3b82f6', 1),
  ('REALIZADA', 'Realizada', 'ACAO_PROSPECCAO', '#22c55e', 2),
  ('CANCELADA', 'Cancelada', 'ACAO_PROSPECCAO', '#ef4444', 3),
  ('EM_ANDAMENTO', 'Em Andamento', 'ACAO_PROSPECCAO', '#6366f1', 4)
ON CONFLICT (nome, tipo) DO NOTHING;

--> statement-breakpoint
INSERT INTO campo_visibilidade (cadastro, campo, roles_ocultos) VALUES ('CRM_ACAO_PROSPECCAO_DETALHE', 'proposta_vinculada', '["COMERCIAL"]'::jsonb)
ON CONFLICT (cadastro, campo) DO NOTHING;
