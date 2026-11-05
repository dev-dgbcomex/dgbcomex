# Graphify Knowledge Graph

O projeto tem um grafo de conhecimento em `graphify-out/` com 7276 nós, 25061 arestas e 392 comunidades.

## Como usar

- **Consulta rápida**: carregue `graphify-out/GRAPH_REPORT.md` (1329 linhas) para visão geral das comunidades
- **Consulta detalhada**: carregue `graphify-out/graph.json` e pesquise nós/arestas para entender dependências entre arquivos
- **Perguntas específicas**: aponte o nome do nó (ex: `requireAuth`, `getInfoContent`, `prisma`) que eu encontro no grafo

Sempre consulte o grafo ANTES de responder perguntas sobre arquitetura, fluxos ou dependências do código.

### Como regenerar o grafo (Windows)

O tool **não** está no PyPI como `graphify` — no PyPI ele se chama `graphifyy` (2 "y") ou
instale direto do GitHub (`Graphify-Labs/graphify`, branch `v8`). Use um venv Python ≥ 3.10
(venv fora do repositório) e a CLI `graphify`:

```bash
graphify extract <repo> --code-only --force   # AST + graph.json + manifest.json
graphify cluster-only <repo> --no-label       # comunidades + GRAPH_REPORT.md
graphify export html --node-limit 20000       # graph.html (na raiz do repo)
```

O `.graphifyignore` da raiz restringe a análise a `src/`. Sem `--no-label` o tool usa LLM para
nomear as comunidades (exige API key); sem ele os rótulos ficam como `Community N`.
`graphify-out/` é gitignored — o grafo nunca vai para o commit.

# Multi-Database Setup

O projeto utiliza **2 bancos de dados PostgreSQL**:

| Banco                                | Uso                                             | Variável             |
| ------------------------------------ | ----------------------------------------------- | -------------------- |
| Neon `dgbcomex`                      | Banco principal do app (produção) + marts do BI | `DATABASE_URL`       |
| Warehouse local `dgbcomex_warehouse` | Réplica do Neon + carga do ERP + runtime do WMS | `DATABASE_URL_LOCAL` |

**Arquitetura (local é SUPERSET do Neon)**:

- **Neon**: só o que a aplicação usa em produção — CRM e módulos que **não** vêm do ERP. Fica rápido
  e barato (sem a carga pesada do ERP).
- **Local**: **tudo o que o Neon tem** + a carga do ERP (schemas `raw`/`core`, ~1M linhas) + os marts
  publicados pelo ETL + o runtime do WMS (`wms_*`). A carga do ERP ficaria caro no Neon, então fica só aqui.
- **Fallback**: se o Neon for perdido ou ficar ilegível, o local tem todos os dados do app — basta
  apontar a conexão para o warehouse local. Por isso a réplica precisa rodar sempre e o local
  **nunca pode ter menos** que o Neon (pode ter mais).

**Os dois precisam ter o mesmo schema** (mesmas tabelas, colunas, tipos, constraints e índices nos
schemas `public`/`marts`/`auth`/`etl`).
O warehouse local ainda tem, por arquitetura, tabelas que só existem nele (runtime do WMS, schemas
`raw`/`core` e o `alembic_version` da api-microdata) — ver `docs/wms-modulo.md`.

## IMPORTANTE: Replicação de Mudanças

**TODA mudança no schema do Neon (principal) DEVE ser replicada para o warehouse local.**

### Procedimento obrigatório:

1. Crie a migration: `npx drizzle-kit generate` (ou SQL numerado em `src/lib/db/migrations/`)
2. Aplique no Neon (principal): `npm run db:migrate`
3. **Replique no warehouse local**: `npm run db:replicar-neon` (`scripts/replicar-neon-local.js`)
4. **Verifique**: `npm run db:verificar-local` (`scripts/verify-neon-local.js`) — precisa dar 0 divergências

> A verificação trata o **local como superset**: linhas a mais no local são permitidas (saída `OK (local ⊇ Neon)`).
> Divergência de verdade é o local ter **menos** dados que o Neon — aí o script sai com erro.

A réplica também roda **sozinha a cada 4h** (Agendador de Tarefas do Windows:
`DGBComex - Replicar Neon para Warehouse Local` → `scripts/agendar-replicacao.cmd`, log em
`logs/replicar-neon-local.log`), para o fallback do local nunca ficar defasado.

O `replicar-neon-local.js` é idempotente: cria no local as tabelas que faltam, **alinha colunas e tipos**
das que já existem, **replica PK/UNIQUE/CHECK/FK e índices**, copia os dados que faltam e reseta as sequências.
Ele **nunca apaga** dado do local: o `--reset` só trunca o schema `public` (os schemas `marts`/`etl` são
mantidos pelo ETL local e a carga ERP `raw`/`core` fica intacta).

### ⚠️ O `sync-all-dbs.js` NÃO roda no Neon

`scripts/sync-all-dbs.js` aplica o SQL no warehouse local — **nunca no `DATABASE_URL`**, que é o banco
que a aplicação usa. Já aconteceu: um `ALTER TABLE crm_pessoas ADD COLUMN tipo_pessoa` existia no sync e
no schema, mas não no principal. Resultado: `column "tipo_pessoa" does not exist` e **qualquer consulta
à tabela morria com 500** — derrubou a busca de CNPJ e, na prática, o CRM de pessoas inteiro.

Quando o SQL estiver no `sync-all-dbs.js`, aplique também no Neon:

```bash
node scripts/sync-principal.js          # roda o MESMO SQL do sync-all-dbs.js no DATABASE_URL
node scripts/criar-tabelas-faltantes.js # tabelas inteiras que faltam (também chamado pelo db:migrate)
```

### Para alterações manuais de schema (SQL direto):

Se precisar rodar SQL manualmente (ALTER TABLE, CREATE TABLE, etc.), execute nos DOIS:

- Neon (principal, `DATABASE_URL`)
- Warehouse local (`DATABASE_URL_LOCAL`)

### Verificação de integridade:

```bash
npm run db:comparar      # node scripts/compare-schemas.js -> estrutura (colunas/tipos) public
npm run db:verificar-local # node scripts/verify-neon-local.js -> contagem de linhas por tabela
```

Compara colunas/tipos entre o Neon e o warehouse local e lista diferenças.

## Sync de FKs de `clientes_representantes` (2026-08-14)

- O schema (Drizzle) declara `clientes_representantes.cliente_id` e `.representante_id` com `onDelete: "cascade"`, mas o `pdm_textil` tinha as FKs como **NO ACTION** (o warehouse local já estava CASCADE).
- **Fix aplicado**: `node scripts/sync-fk-clientes-representantes.js` — idempotente, percorre os 2 bancos (Neon e warehouse local), e onde a regra não é CASCADE faz DROP + ADD do constraint com `ON DELETE CASCADE` (transação por FK).
- A partir daqui, deletar um `cliente` ou `representante` apaga os vínculos da tabela de junção automaticamente no banco (o código das rotas também já apaga explicitamente em transação).

## Backup/Restore e fix de FKs (2026-08-06)

- **Causa raiz**: `scripts/backup-db.mjs` remove colunas com default `nextval`; `scripts/restore-db.mjs` restaura com FKs dormentes → ids renumerados e referências de FKs apontando para ids antigos (corrompidos).
- **Fix aplicado**: `scripts/fix-remap.mjs` gera `backups/fix-fk-remap.sql` (33 seções, 8538 tuplas) aplicado por `scripts/apply-fix.mjs` (transação única + DROP/ADD do constraint `crm_cidades_nome_estado_id_key` + DELETE `user_email_config` id=1). Backup pré-fix: `backups/pre-fix-2026-08-06.sql`.
- **Pós-fix**: 0 órfãos nas 49 FKs declaradas (`scripts/diag-orphans-final.js`). Decisões: `chat_participantes` id=96 `ultima_mensagem_lida_id`→NULL; `chat_leituras` id=325 `mensagem_id`→26 (sucessor real da neon 50 = main 26, chat 10). `user_menu_itens` id=713 (`user_menu_id`=19) deixado intacto — quebrado na origem (menu 19 não existe em nenhum banco).
- **Diagnósticos auxiliares**: `scripts/diag-*.js` (mensagem 50, colisões de cidades, duplicatas, órfãos pós-fix, email config, etc.).
- Se o fix for refeito (novo backup/restore), use o mesmo fluxo e SEMPRE re-sincronize os 2 bancos (`node scripts/replicar-neon-local.js`).

# Geocodificação de endereço em visitas (cronograma da viagem)

- `crm_visitas` tem `endereco_lat`/`endereco_lng` (coordinates do endereço, salvas no cadastro).
- Ao **criar/editar** uma visita (`POST /api/crm/visitas` e `PUT /api/crm/visitas/[id]`), o sistema geocodifica o endereço (visita → pessoa/empresa → cliente) via Nominatim e **persiste as coordenadas** na própria visita (1 geocode por endereço; vale para recorrências).
- A rota `GET /api/crm/visitas/dashboard/viagem` usa a ordem: **check-in/check-out → `endereco_lat/lng` (fonte `"endereco"`) → geocode runtime (fonte `"geocodificada"`)**.
- `src/lib/crm/geocode.ts` tem geocoder Nominatim com cache/dedup/fila (~1 req/s); `src/lib/crm/endereco.ts` monta o texto do endereço.
- **Estratégia de geocodificação**: **structured search** (parâmetros `street`/`city`/`state`/`country`) — o `q` livre do Nominatim é instável e retorna o centro da cidade quando o endereço completo falha. Cadeia: rua+número → rua → cidade+UF → fallback `q`. `geocodificarCamposEndereco(campos)` recebe `EnderecoCampos`; `geocodificarEndereco(texto)` é fallback/compat.
- **Histórico**: backfill inicial (commit `fe4719c9`/`22c4df9f`) gravou 26/37 visitas no centro das cidades por flakiness do `q`; corrigido com `node scripts/geocode-visitas.js --precisar` (structured) que atualizou 19 visitas para nível de rua.
- O mapa (`viagem-rota-mapa.tsx`) **agrupa pins coincidentes** via `src/lib/crm/agrupar-pontos.ts` (`agruparPontos` por `toFixed(3)`, popup lista as visitas do grupo).
- **Backfill**: `node scripts/geocode-visitas.js` (opcional `--db=`, `--limit=`, `--dry-run`, `--precisar`) percorre os 2 bancos (Neon e warehouse local) e preenche `endereco_lat/lng` de visitas sem coordenadas (idempotente/resumível). As colunas também estão no `scripts/sync-all-dbs.js`.

# Email em Massa — Agendamento e Envio

## Fluxo

`email_agendados` (agendado) → `POST /api/admin/email-massa/agendados/executar` (vira disparo) → `email_disparos` (status `fila`) → `POST /api/admin/email-massa/processar` (envia via SMTP) → `email_enviados`.

## Como enviar/agendar

- **Enviar agora (manual)**: aba Programar Disparo → botão "Enviar agora" em um item `agendado` → `POST /api/admin/email-massa/agendados/[id]/enviar` (cria o disparo e inicia o `processar`). Barra de progresso via polling de `GET /api/admin/email-massa/disparos/[id]` (componente `envio-progresso.tsx`).
- **Agendamento automático**: `email_agendados` com `agendadoPara` vencido é convertido em disparo pelo `executar` e enviado pelo `processar`.

## Crons (2 camadas)

| Fonte          | Onde                                | Frequência                                     | Obs                                                                   |
| -------------- | ----------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| Vercel         | `vercel.json`                       | 1x/dia (09:00Z `executar`, 09:30Z `processar`) | Plano Hobby limita a **1x/dia em UTC** (±59min de atraso)             |
| GitHub Actions | `.github/workflows/email-massa.yml` | **a cada 15 min**                              | Resolve a limitação do Hobby; dá para rodar manual via "Run workflow" |

## CRON_SECRET (senha do cron)

- É a **mesma senha** configurada em **2 lugares**:
  1. **Vercel** → projeto → Settings → Environment Variables (`CRON_SECRET`)
  2. **GitHub** → repo → Settings → Secrets and variables → Actions (`CRON_SECRET`)
- Sem ela: o GitHub Actions recebe **401** e o agendamento automático a cada 15 min não roda; ainda funcionam o "Enviar agora" (sessão admin) e o cron diário do Vercel.
- Os endpoints `executar`/`processar` aceitam **Bearer `CRON_SECRET`** **OU** sessão de admin (`ADMIN`/`SUDO`/`CRM`).
- **Atenção (fuso)**: cron do Vercel roda em **UTC**. Um agendamento para 09:00 Brasília (12:00Z) só é pego por um cron que rode **depois** das 12:00Z — no Hobby, o 1x/dia é insuficiente para horários da tarde/noite.

# Notificações — regras por tipo e perfis globais

- Motor: `src/lib/notificar.ts` (`notificar`, `notificarAdmins`, `rolesNotificacaoGlobal`). Grava in-app em `notificacoes` e envia e-mail pelo SMTP do sistema (`email_config`, sem fila — envio síncrono).
- Regras por tipo: tabela `notificacao_regras` (`tipo` UNIQUE + `roles` JSONB). Sem regra do tipo, **ninguém** recebe aquela notificação.
- **Regra global `TODOS`**: linha reservada em `notificacao_regras` com os perfis que recebem **todas** as notificações, inclusive as que não têm regra por tipo (padrão: `["ADMIN","SUDO"]`). Migration `0066_notificacao_regras_globais.sql`; configurável em **Admin › Notificações** (quadro azul) — `GET/PUT /api/admin/notificacao-regras`.
- `notificar()` sempre soma os perfis globais aos da regra do tipo; `notificarErro`/`notificarDelecao` (SUDO) também chegam aos demais globais.
- Envio imediato para os administradores: botão **"Enviar teste para os administradores"** no painel → `POST /api/admin/notificacao-regras/enviar-admins`; ou por linha de comando: `node scripts/enviar-notificacao-admins.js` (`--dry-run`, `--db=local`, `--mensagem="..."`).
- SMTP do sistema: `node scripts/configurar-smtp.js` grava `email_config` nos 2 bancos usando `GMAIL_USER`/`GMAIL_APP_PASSWORD` do `.env.local` (senha criptografada com `ENCRYPTION_KEY`, igual `src/lib/crypto.ts`). O script valida o login antes de gravar e mantém **uma única** config ativa.
- Sem SMTP válido, o e-mail de notificação **falha em silêncio** (o `notificar()` só loga o erro) — a notificação in-app continua criada. Sempre validar com o botão de teste do painel.

# Identidade visual dos cards (tema Dracula)

- `src/lib/dracula.ts` é a fonte única: `corPorTitulo(titulo)` (paleta Dracula + fundo/borda/gradiente) e `iconePorTitulo(titulo)` (ícone representativo). A cor e o ícone saem do **título/rótulo** do card, então o mesmo indicador tem sempre a mesma cara.
- Usado em: painel `/bi/integracoes` (`src/components/bi-integracao/bi-integracao-kpi-card.tsx`), relatórios de BI (`src/components/ui/kpi-card.tsx`, `src/components/ui/chart-card.tsx` com a prop `dracula`, `src/components/bi/cartao-kpi.tsx`) e relatórios do CRM (`src/components/crm/relatorios/cards-relatorio.tsx`).
- Cards novos **não** inventam cor: usam `corPorTitulo` + `iconePorTitulo`. O `ChartCard` só recebe Dracula por opt-in (prop `dracula`), porque ele também vive em dashboards que não devem mudar.

# CRM — Cliente, pessoa e relatórios

**LEIA `docs/crm-cliente-e-relatorios.md`** — referência técnica (modelo de dados, endpoints, telas e regras).

- **Regra central**: tudo o que foi feito com uma **pessoa** que virou **cliente** passa a ser do cliente (timeline, WhatsApp, oportunidades, propostas, visitas e relatórios).
- Vínculo do cliente no funil: `crm_pessoas.cliente_id` + tarja (`promovida_cliente`, `promovido_em`, `promovido_por`, `promovido_por_nome` — migration `0064`).
- Vínculos de timeline/WhatsApp: `cliente_id` em `crm_timeline_eventos` e `crm_whatsapp_mensagens` — migration `0065_crm_cliente_relacionamentos.sql` (Neon + local).
- Helper de vínculos: `src/lib/crm/cliente-relacionamentos.ts` (`idsPessoasDoCliente`, `idsContatosDoCliente`, `clienteIdDaPessoa`).
- Na tela do cliente (`/comercial/clientes/[id]`) os cards de Oportunidades, Propostas, Timeline e WhatsApp são os **compartilhados** em `src/components/crm/` (aceitam `pessoaId` **ou** `clienteId`) — ficam **fora** do `<form>`.
- Qualquer negócio criado em pessoa promovida herda o cliente (`clienteIdDaPessoa`) e gera timeline para os dois lados.
- Relatórios: todo negócio resolve o cliente por `COALESCE(reg.cliente_id, pessoa.cliente_id)`; existe o **Relatório de Clientes** (`consultarClientes`) e a categoria de log `CrmCliente`.
- Histórico cronológico das sessões: `docs/Sessoes.md`.

# Testes

Suíte de regressão com **vitest + Testing Library** (jsdom por arquivo via comentário `// @vitest-environment jsdom`).

## REGRA OBRIGATÓRIA: toda funcionalidade/tela exige teste

**Nenhuma funcionalidade ou tela nova pode ser entregue sem teste.** Ao criar ou alterar uma página, componente, API route ou lógica reutilizável:

1. **Páginas de lista/form seguindo o padrão de cadastros** → use as factories `list-page-spec`/`form-page-spec` (na pasta `src/test/`) com config na página do teste.
2. **Telas/componentes atípicos** → teste customizado na pasta da página (jsdom, fetch mock via `harness.tsx`).
3. **API routes** → teste com fetch mock/`routeJson` cobrindo sucesso e erro.
4. **Lógica reutilizável (`src/lib`)** → teste unitário puro (node, sem jsdom quando não houver DOM).

O teste deve ser criado **na mesma entrega/commit** da funcionalidade. Regressão da suíte completa (`npm run test`) é critério de aceite: **toda mudança precisa manter a suíte verde**.

## Fluxo obrigatório ao modificar o código

**Qualquer modificação no sistema (feature, bug fix, refactor) segue esta ordem — sem exceção:**

1. **Alterar o código** (tela/componente/API route/lógica).
2. **Atualizar/criar o teste** daquilo que mudou, na mesma entrega:
   - Teste já existe → ajuste-o para refletir o novo comportamento (novo endpoint, textos, campos, fluxos).
   - Não existe → crie seguindo o padrão da seção acima (factory, smoke ou custom).
3. **Rodar o teste do arquivo** modificado: `npx.cmd vitest run <caminho-do-teste>`.
4. **Rodar a suíte completa**: `npm run test` — **não commitar enquanto estiver vermelha**. Se quebrou:
   - Verificar se a quebra é da mudança → corrigir o código OU o teste (decidir pelo que está certo: se o comportamento mudou de propósito, o teste é que deve ser atualizado).
   - Verificar se a quebra é pré-existente/fora do escopo → reportar ao usuário, não mascarar com `.skip`/`.only`.
5. **Só então commitar** — teste verde na mesma entrega do código.
6. **Tela nova** → além do teste, registrar no grafo (`graphify-out/`) se aplicável.
7. **Atualizar o modal de informação ('i')** da tela alterada — obrigatório, ver abaixo.

## REGRA OBRIGATÓRIA: modal de informação em toda tela, sempre atualizado

**Toda tela precisa ter o modal de informação ("i") e ele deve ser atualizado em TODA alteração da tela — sejam quantos cards, colunas, campos, regras ou exemplos a mudança tocar.**

- Conteúdo em `src/lib/info-content/<dominio>.ts` (pasta por domínio agregada no `index.ts`; **não** é mais o arquivo único `info-content.ts`). Renderize `<InfoButton content={getInfoContent(pathname)} />` ao lado do `<h1>`.
- A cada mudança de tela, revise e atualize: `description`, `rules`, `columns`, `fields`, `examples`. **Remova frases obsoletas** (ex.: "a tela recua sozinha", "aviso azul").
- Teste: atualize/crie em `src/lib/info-content/info-content.test.ts` cobrindo os termos-chave da nova dinâmica.
- Guia completo: **`docs/modais-de-informacao.md`**.

## Comandos

- Suíte completa: `npm run test` (ou `npx.cmd vitest run`)
- Módulo de cadastros: `npx.cmd vitest run "src/app/(dashboard)/cadastros"`
- Arquivo único: `npx.cmd vitest run <caminho>`
- Watch: `npm run test:watch`

> **Windows**: use `npx.cmd`/`npm.cmd` (ExecutionPolicy bloqueia `.ps1`).

## Infra

- `vitest.config.ts` — `environment: "node"` global; páginas/componentes declaram jsdom por arquivo.
- `src/test/harness.tsx` — `renderPage()` (com QueryClientProvider, `retry:false`), `createFetchMock(handler)` (mock global de fetch com `{calls}` e `findCall(calls,url,method?)`), `navMock` (`router.push/replace/back/prefetch`, `params`, `pathname`, `reset`), `toastMock`, `routeJson(routes)`. A URL no mock é **exata** (query string inclusa).
- `src/test/setup.tsx` — mocka `next/navigation`, `next/link` (→ `<a>`), `sonner` (→toastMock); beforeEach reseta mocks, stuba `alert`/`confirm` (confirm→true) e stubs de ResizeObserver/IntersectionObserver/matchMedia/scrollIntoView. **Só roda em jsdom** (guarda `typeof window !== "undefined"`).

## Factories (páginas de cadastros)

- `src/test/list-page-spec.tsx` — 6 testes por lista (renderiza+status, busca, estado vazio, exclui+modal, bloqueio fkError, links novo/edição). Badges contadas com `{ selector: "span" }`; bloqueio usa regex `/não pode ser exclu/`; botão da linha: `getAllByRole("button").find(b => !b.closest("a"))`.
- `src/test/form-page-spec.tsx` — 4 testes por formulário (renderiza novo, valida obrigatórios, cria via POST, edição via PUT). Config inclui `headingNew/headingEdit`, `validationToast`, `successToastNew/Edit`, `editId/editData/editDisplayValue`, `createFields` (placeholder+value), `createBodyAssert`. Labels padrão "Criar"/"Atualizar" (`submitNewLabel`/`submitEditLabel`).

## Padrões importantes

- Testes de página: sempre `navMock.setPathname(...)` e, quando há `:id`, `navMock.setParams({ id })`.
- Validação de `required` no jsdom: **não clique no submit** — dispare `fireEvent.submit(form)` diretamente (`form = container.querySelector("form")!`).
- Edição: `await screen.findByRole("heading", { name: headingEdit })` e `await screen.findByDisplayValue(...)` (o fetch resolve depois do render).
- Formulários atípicos (sem `<form>`, `alert`/`confirm`): teste customizado na pasta da página — ex. `produtos-quimicos/[id]/form.test.tsx`.
- Caso especial: `receitas` (abas), `produto-cru/[id]` (multi-tab, smoke de Capa).

# ✅ CONCLUÍDA: refatoração `any` no módulo Comercial

**LEIA `docs/refactor-comercial-sem-any.md` — registro oficial.**

O módulo `src/app/(dashboard)/comercial` está **100% sem `any`** (0 matches em `grep ': any|\bany\b|\bas any\b'`, incluindo `*.test.tsx`). Não há mais cobrança de retomada.

# Módulo Ativos e Vistorias

**LEIA `docs/ativos-vistorias.md` (spec) e `docs/taxonomia-vistorias.md` (catálogo).**

- Escopo fase 1: **Ativos + vistorias periódicas com checklist** (calendar-based). Fase 2: horas-máquina, ações corretivas/OS, estoque — ver spec.
- 5 entidades: `ativos_categorias` (com setor responsável) → `ativos` (código único, categoria, status, maquina_id opcional p/ `maquinas`) → `ativos_tipos_vistoria` (checklist jsonb + periodicidade + baseLegal) → `ativos_planos_vistoria` (ativo×tipo, unique) → `ativos_vistorias` (ocorrência executada).
- **Agendador**: `src/lib/ativos/agendamento.ts` — ao criar/editar plano ou concluir vistoria, gera ocorrências futuras `PENDENTE` (janela 12 meses). **Atrasada** = `dataProgramada <= hoje` e status ≠ concluída/cancelada.
- API em `src/app/api/ativos/*` (categorias, ativos, tipos-vistoria, planos, vistorias, dashboard). Todas com `requireAuth` + `validateRequest` + `handleApiError`.
- **Multi-banco obrigatório**: o schema `ativos*.ts` deve ser replicado aos 4 bancos (generate → migrate → migrate:all → sync-all-dbs → compare-schemas).
- Seed: `node scripts/seed-vistorias.js` (categorias + tipos da taxonomia, idempotente).
- Testes: `agendamento.test.ts` (unitário) + list/form pages + telas atípicas (tipos-vistoria form, agenda de vistorias, dashboard).

# Commits — sempre

**Ao concluir qualquer entrega, commitar e dar push — sem precisar perguntar.** Vale para os dois repos:

- `M:\dev\dgbcomex` → `main` (remote `github-dgbcomex`).
- `M:\dev\api-microdata` → `main` (remote `github.com:devtiagoabreu/api-microdata`).

Só commitar quando a suíte estiver verde (regra de testes acima) e nunca incluir `.env.local`/segredos. Mensagem no estilo do repo (`feat(escopo): ...`, `fix(...)`, `docs(...)`), em português, com bullets no corpo quando a mudança tiver várias partes.
