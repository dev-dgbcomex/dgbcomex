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