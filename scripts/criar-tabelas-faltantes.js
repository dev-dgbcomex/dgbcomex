// Cria as tabelas que o schema Drizzle declara e que o banco nunca recebeu.
//
// Como: comparando as 123 tabelas de `src/lib/db/schema` com o
// `information_schema`. Qualquer consulta a uma tabela ausente quebrava com 500 — foi
// o que derrubou a busca de CNPJ, que le `crm_pessoas` depois de chamar a API externa.
//
// Idempotente (tudo e CREATE TABLE/INDEX IF NOT EXISTS).
//   node scripts/criar-tabelas-faltantes.js            -> DATABASE_URL
//   node scripts/criar-tabelas-faltantes.js <url>      -> outro banco
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Pool } = require("pg")

const ALVO = process.argv[2] || process.env.DATABASE_URL
if (!ALVO) {
  console.error("Informe o DATABASE_URL alvo (ou defina no .env.local)")
  process.exit(1)
}

/** Cada item é [rótulo, sql, ...índices]. */
const TABELAS = [
  [
    "email_agendados",
    `create table if not exists email_agendados (
       id serial primary key,
       nome varchar(255) not null default '',
       para varchar(50) not null,
       assunto varchar(500) not null default '',
       preheader varchar(255) default '',
       html text not null default '',
       listas json,
       modo_envio varchar(20) default 'bcc',
       remetente varchar(20) default 'sistema',
       agendado_para timestamp,
       status varchar(20) not null default 'rascunho',
       enviado_em timestamp,
       erro text,
       criado_por integer references usuarios(id),
       created_at timestamp default now(),
       updated_at timestamp default now()
     )`,
    "create index if not exists idx_email_agendados_status on email_agendados (status)",
    "create index if not exists idx_email_agendados_agendado_para on email_agendados (agendado_para)",
  ],
  [
    "crm_email_config",
    `create table if not exists crm_email_config (
       id serial primary key,
       host varchar(255) not null default 'smtp.gmail.com',
       port integer not null default 587,
       "user" varchar(255) not null,
       pass varchar(255) not null,
       from_name varchar(255) default 'PDM PRO TEXTIL - CRM',
       reply_to varchar(255),
       ativo boolean default true,
       created_at timestamp default now(),
       updated_at timestamp default now()
     )`,
  ],
  [
    "crm_notificacoes",
    `create table if not exists crm_notificacoes (
       id serial primary key,
       titulo varchar(255) not null,
       mensagem text,
       tipo varchar(50) not null default 'lead_nuevo',
       lida boolean not null default false,
       link varchar(500),
       metadados jsonb default '{}'::jsonb,
       created_at timestamp default now()
     )`,
    "create index if not exists idx_crm_notificacoes_lida on crm_notificacoes (lida)",
  ],
  [
    "crm_visitas_localizacoes",
    `create table if not exists crm_visitas_localizacoes (
       id serial primary key,
       visita_id integer not null references crm_visitas(id) on delete cascade,
       latitude double precision not null,
       longitude double precision not null,
       endereco varchar(500),
       observacao text,
       foto_url varchar(500),
       tipo varchar(20) not null default 'LOCAL',
       criado_por integer references usuarios(id),
       created_at timestamp default now()
     )`,
    "create index if not exists idx_crm_visitas_localizacoes_visita_id on crm_visitas_localizacoes (visita_id)",
  ],
  [
    "crm_pesquisas_satisfacao",
    `create table if not exists crm_pesquisas_satisfacao (
       id serial primary key,
       visita_id integer not null references crm_visitas(id) on delete cascade,
       email varchar(255) not null,
       nome varchar(255),
       token varchar(64) not null unique,
       enviado_em timestamp,
       aberto_em timestamp,
       respondido_em timestamp,
       status varchar(20) not null default 'PENDENTE',
       criado_por integer references usuarios(id),
       created_at timestamp default now()
     )`,
    "create index if not exists idx_crm_pesquisas_satisfacao_visita_id on crm_pesquisas_satisfacao (visita_id)",
    "create index if not exists idx_crm_pesquisas_satisfacao_status on crm_pesquisas_satisfacao (status)",
  ],
  [
    "crm_pesquisas_respostas",
    `create table if not exists crm_pesquisas_respostas (
       id serial primary key,
       pesquisa_id integer not null references crm_pesquisas_satisfacao(id) on delete cascade,
       pergunta varchar(200) not null,
       tipo varchar(20) not null default 'ALTERNATIVA',
       resposta text,
       created_at timestamp default now()
     )`,
    "create index if not exists idx_crm_pesquisas_respostas_pesquisa_id on crm_pesquisas_respostas (pesquisa_id)",
  ],
  [
    "logs",
    `create table if not exists logs (
       id serial primary key,
       tipo varchar(50) not null,
       acao varchar(100) not null,
       descricao text,
       entidade varchar(100),
       entidade_id integer,
       dados jsonb,
       erro text,
       usuario_id integer references usuarios(id),
       usuario_nome varchar(255),
       created_at timestamp default now()
     )`,
    "create index if not exists idx_logs_created_at on logs (created_at)",
    "create index if not exists idx_logs_entidade on logs (entidade, entidade_id)",
  ],
  [
    "accounts",
    `create table if not exists accounts (
       id serial primary key,
       user_id integer not null references usuarios(id) on delete cascade,
       type varchar(50) not null,
       provider varchar(50) not null,
       provider_account_id varchar(100) not null,
       refresh_token text,
       access_token text,
       expires_at integer,
       token_type varchar(50),
       scope text,
       id_token text,
       session_state text,
       created_at timestamp default now()
     )`,
    "create unique index if not exists idx_accounts_provider on accounts (provider, provider_account_id)",
  ],
  [
    "crm_acoes_prospeccao",
    `create table if not exists crm_acoes_prospeccao (
       id serial primary key,
       empresa_id integer references crm_pessoas(id),
       cliente_id integer references clientes(id),
       oportunidade_id integer references crm_oportunidades(id),
       contato_id integer references crm_contatos(id),
       viagem_id integer references crm_viagens(id),
       representante_id integer references representantes(id),
       representante_nome varchar(300),
       proposta_id integer references crm_propostas(id),
       data_acao date not null,
       hora varchar(5),
       tipo varchar(20) not null default 'PRESENCIAL',
       status varchar(20) not null default 'AGENDADA',
       endereco varchar(300),
       numero varchar(20),
       complemento varchar(200),
       bairro varchar(150),
       cidade varchar(150),
       uf varchar(2),
       cep varchar(10),
       endereco_lat double precision,
       endereco_lng double precision,
       motivo_cancelamento text,
       nome_avulso varchar(300),
       relato text,
       fotos jsonb default '[]'::jsonb,
       check_in_time timestamp,
       check_out_time timestamp,
       check_in_lat double precision,
       check_in_lng double precision,
       check_out_lat double precision,
       check_out_lng double precision,
       criado_por integer references usuarios(id),
       duracao_estimada integer,
       google_event_id varchar(500),
       lembrete_dia_anterior_enviado boolean not null default false,
       lembrete_dia_acao_enviado boolean not null default false,
       created_at timestamp default now(),
        updated_at timestamp default now()
      )`,
    "alter table crm_acoes_prospeccao add column if not exists origem_visita_id integer",
    "create unique index if not exists idx_crm_acoes_prospeccao_origem_visita_id on crm_acoes_prospeccao (origem_visita_id) where origem_visita_id is not null",
    "create index if not exists idx_crm_acoes_prospeccao_empresa_id on crm_acoes_prospeccao (empresa_id)",
    "create index if not exists idx_crm_acoes_prospeccao_cliente_id on crm_acoes_prospeccao (cliente_id)",
    "create index if not exists idx_crm_acoes_prospeccao_oportunidade_id on crm_acoes_prospeccao (oportunidade_id)",
    "create index if not exists idx_crm_acoes_prospeccao_contato_id on crm_acoes_prospeccao (contato_id)",
    "create index if not exists idx_crm_acoes_prospeccao_criado_por on crm_acoes_prospeccao (criado_por)",
  ],
  [
    "crm_acoes_prospeccao_localizacoes",
    `create table if not exists crm_acoes_prospeccao_localizacoes (
       id serial primary key,
       acao_id integer not null references crm_acoes_prospeccao(id) on delete cascade,
       latitude double precision not null,
       longitude double precision not null,
       endereco varchar(500),
       observacao text,
       foto_url varchar(500),
       tipo varchar(20) not null default 'LOCAL',
       criado_por integer references usuarios(id),
       created_at timestamp default now()
     )`,
    "create index if not exists idx_crm_acoes_prospeccao_localizacoes_acao_id on crm_acoes_prospeccao_localizacoes (acao_id)",
    "create index if not exists idx_crm_acoes_prospeccao_localizacoes_criado_por on crm_acoes_prospeccao_localizacoes (criado_por)",
  ],
  [
    "crm_acoes_prospeccao_pesquisas",
    `create table if not exists crm_acoes_prospeccao_pesquisas (
       id serial primary key,
       acao_id integer not null references crm_acoes_prospeccao(id) on delete cascade,
       email varchar(255) not null,
       nome varchar(255),
       token varchar(64) not null unique,
       enviado_em timestamp,
       aberto_em timestamp,
       respondido_em timestamp,
       status varchar(20) not null default 'PENDENTE',
       criado_por integer references usuarios(id),
       created_at timestamp default now()
     )`,
    "create index if not exists idx_crm_acoes_prospeccao_pesquisas_acao_id on crm_acoes_prospeccao_pesquisas (acao_id)",
    "create index if not exists idx_crm_acoes_prospeccao_pesquisas_criado_por on crm_acoes_prospeccao_pesquisas (criado_por)",
  ],
  [
    "crm_acoes_prospeccao_pesquisas_respostas",
    `create table if not exists crm_acoes_prospeccao_pesquisas_respostas (
       id serial primary key,
       pesquisa_id integer not null references crm_acoes_prospeccao_pesquisas(id) on delete cascade,
       pergunta varchar(200) not null,
       tipo varchar(20) not null default 'ALTERNATIVA',
       resposta text,
       created_at timestamp default now()
     )`,
    "create index if not exists idx_crm_acoes_prospeccao_pesquisas_respostas_pesquisa_id on crm_acoes_prospeccao_pesquisas_respostas (pesquisa_id)",
  ],
]

/**
 * Aplica o bloco no banco informado. Exporta para o `migrate.js` reaproveitar — os
 * dois caminhos (npm run db:migrate e este script) rodam exatamente o mesmo SQL.
 */
async function criarTabelas(url) {
  const pool = new Pool({ connectionString: url })
  const alvo = url.split("@")[1]?.split("?")[0] || "(local)"
  console.log(`--- ${alvo} ---`)
  try {
    for (const [nome, ddl, ...indices] of TABELAS) {
      await pool.query(ddl)
      for (const indice of indices) await pool.query(indice)
      console.log(`  ok ${nome}`)
    }
    const { rows } = await pool.query(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_name = any($1) order by table_name`,
      [TABELAS.map(([nome]) => nome)]
    )
    console.log(
      `  presentes: ${rows.length}/${TABELAS.length} -> ${rows.map((r) => r.table_name).join(", ")}`
    )
  } finally {
    await pool.end()
  }
}

async function main() {
  await criarTabelas(ALVO)
}

if (require.main === module) {
  main().catch((e) => {
    console.error("ERRO:", e.message)
    process.exit(1)
  })
}

module.exports = { criarTabelas, TABELAS }