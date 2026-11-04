# Multi-Database Setup - PDM Têxtil

## Visão Geral

O projeto PDM Têxtil utiliza **2 bancos de dados PostgreSQL**:

| Banco de Dados | Uso | Variável de Ambiente |
|---|---|---|
| Neon `dgbcomex` | Banco principal do app (produção) + marts do BI | `DATABASE_URL` |
| Warehouse local `dgbcomex_warehouse` | Réplica do Neon + carga do ERP + runtime do WMS | `DATABASE_URL_LOCAL` |

### O local é um SUPERSET do Neon

- **Neon** guarda só o que a aplicação usa em produção: CRM e módulos que **não** vêm do ERP.
  Fica rápido e barato, sem a carga pesada do ERP.
- **Local** guarda **tudo o que o Neon tem** **mais**:
  - carga do ERP nos schemas `raw`/`core` (~1M linhas);
  - marts publicados pelo ETL local;
  - runtime do WMS (`wms_*`) e o `alembic_version` da api-microdata.
- **Fallback**: se o Neon for perdido ou ficar ilegível, o local tem todos os dados do app — basta
  apontar a conexão (`DATABASE_URL`) para o warehouse local. Por isso o local **nunca pode ter menos**
  que o Neon; ter mais é esperado e correto.

O mesmo schema (tabelas, colunas, tipos, constraints e índices) precisa existir nos dois, nos schemas
`public`, `marts`, `auth` e `etl`. As tabelas `wms_*` + `alembic_version` + schemas `raw`/`core` existem
**só no local**, por arquitetura — não devem ser removidas nem replicadas para o Neon.

Ver `docs/wms-modulo.md` para o módulo de WMS.

## Configuração do Servidor

- **Neon**: `DATABASE_URL` (host pooler `*.sa-east-1.aws.neon.tech`)
- **Warehouse local**: `DATABASE_URL_LOCAL` (PostgreSQL local, `localhost:5432`, banco `dgbcomex_warehouse`)
- **Driver**: PostgreSQL (via `postgres` driver / postgres-js e `pg` nos scripts)

## URLs de Conexão (exemplo — usar valores reais no .env.local)

```
DATABASE_URL="postgresql://usuario:senha@host.neon.tech:5432/dgbcomex?sslmode=require"
DATABASE_URL_LOCAL="postgresql://usuario:senha@localhost:5432/dgbcomex_warehouse"
```

## Scripts de Migração

### Criar o banco do warehouse local

```bash
node scripts/create-databases.js
```

Este script garante que o banco `dgbcomex_warehouse` existe no servidor local.

### Migrar os dois bancos

```bash
npm run db:migrate:all
# ou
node scripts/migrate-all.js
```

Aplica as migrations do Drizzle + `scripts/migrate.js` no Neon **e** no warehouse local.

### Migrar apenas o Neon (principal)

```bash
npm run db:migrate
```

## IMPORTANTE: Replicação de Mudanças

**TODA mudança feita no esquema do Neon (principal) DEVE ser replicada para o warehouse local.**

### Procedimento para Novas Migrações

1. **Crie a migration** (SQL numerado em `src/lib/db/migrations/` ou `npx drizzle-kit generate`):
   ```bash
   npx drizzle-kit generate
   ```

2. **Aplique no Neon (principal)**:
   ```bash
   npm run db:migrate
   ```

3. **Replique no warehouse local**:
   ```bash
   npm run db:replicar-neon
   # node scripts/replicar-neon-local.js
   ```
   O script é idempotente: cria tabelas faltantes, **alinha colunas/tipos**, **replica PK/UNIQUE/CHECK/FK
   e índices**, copia dados que faltam e reseta as sequências.

4. **Verifique** (precisa dar 0 divergências):
   ```bash
   npm run db:verificar-local   # contagem de linhas por tabela
   npm run db:comparar          # estrutura (colunas/tipos) do schema public
   ```

### SQL direto (ALTER TABLE, CREATE TABLE...)

Rode **nos dois**:

- Neon (principal, `DATABASE_URL`)
- Warehouse local (`DATABASE_URL_LOCAL`)

Quando o SQL estiver em `scripts/sync-all-dbs.js`, aplique também no Neon com
`node scripts/sync-principal.js` — ele lê o **mesmo arquivo**, então os dois nunca divergem.

> ⚠️ `scripts/sync-all-dbs.js` roda **apenas no warehouse local**. O `DATABASE_URL` é o banco que a
> aplicação usa: rodar SQL errado nele derruba a aplicação (já aconteceu com `crm_pessoas.tipo_pessoa`).

### Estrutura de Arquivos

```
pdmtextil/
├── src/lib/db/
│   ├── index.ts              # Conexão principal com o banco
│   ├── schema/               # Definições de tabelas Drizzle
│   │   ├── usuarios.ts
│   │   ├── clientes.ts
│   │   └── ... (50+ arquivos)
│   └── migrations/           # Migrations SQL do Drizzle
│       ├── 0000_careful_iron_monger.sql
│       ├── 0001_new_tables.sql
│       └── ... (60+ migrations)
├── scripts/
│   ├── create-databases.js        # Cria o banco do warehouse local
│   ├── migrate-all.js             # Migra Neon + warehouse local (Drizzle + custom)
│   ├── migrate.js                 # Migra apenas o Neon (principal)
│   ├── replicate-neon-local.js     # Replica Neon -> warehouse local (idempotente)
│   ├── verify-neon-local.js       # Compara contagem de linhas Neon x local (+ inventário do "a mais")
│   ├── compare-schemas.js         # Compara colunas/tipos/constraints/índices Neon x local
│   ├── sync-all-dbs.js            # SQL idempotente no warehouse local
│   ├── sync-principal.js          # Mesmo SQL do sync-all-dbs.js no Neon
│   ├── add-user-menus.sql         # SQL auxiliar: tabelas de menus
│   └── add-perfil-menus.sql       # SQL auxiliar: colunas de perfil
├── drizzle.config.ts         # Configuração do Drizzle Kit
└── .env.local                # URLs de conexão
```

## Verificação de Integridade

```bash
npm run db:comparar          # estrutura (colunas/tipos/constraints/índices) -> "All databases are IDENTICAL"
npm run db:verificar-local   # linhas por tabela -> 0 divergências + inventário do "a mais" (ERP/WMS)
```

Ou manualmente:

```sql
-- Conectar a cada banco e executar:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Troubleshooting

### Erro de Conexão

1. Verifique se o servidor está acessível
2. Confirme as credenciais no `.env.local`
3. Teste a conexão usando um script simples com `postgres` driver

### Migração Falhou

1. Verifique os logs de erro
2. Execute a migração manualmente no banco problemático
3. Verifique se há conflitos de schema

### Bancos Fora de Sincronia

1. Rode `npm run db:replicar-neon` (idempotente) para sincronizar
2. Use `npm run db:verificar-local` e `npm run db:comparar` para conferir
3. Em caso de dúvida, rode `node scripts/replicar-neon-local.js --reset` — ele só trunca o schema
   `public` (espelho do app); `marts`/`etl` (ETL local) e `raw`/`core` (carga ERP) ficam intactos

### Neon indisponível (fallback)

O warehouse local tem **todo** o dado do app (é superset do Neon). Para operar sem o Neon:

1. Rode `npm run db:replicar-neon` antes (para o local estar o mais atualizado possível)
2. Aponte `DATABASE_URL` para a URL do warehouse local (`DATABASE_URL_LOCAL`)
3. Ao voltar o Neon, reverta a configuração e rode `npm run db:replicar-neon` para repor o Neon

## Notas Importantes

- **Produção**: o Neon é o ambiente de produção; o warehouse local serve para análise local, carga ERP e fallback
- **Backup**: o local é a cópia de segurança do dado do app — mantenha a réplica sempre atualizada
- **Segurança**: nunca commite credenciais no repositório
- **Testes**: sempre teste mudanças no Neon (principal) primeiro
