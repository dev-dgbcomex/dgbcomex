# Histórico de Sessões - Machine Learning

> **INSTRUÇÕES PERMANENTES:** A cada nova sessão, ANTES de executar qualquer tarefa, leia este arquivo por completo. Este documento registra TODO o histórico de interações entre usuário e assistente.

---

## Como Usar Este Arquivo

1. **Nova Sessão:** Ao iniciar, leia este arquivo automaticamente
2. **Durante Sessão:** Ao final de cada interação significativa, atualize este documento
3. **Referência:** Quando o usuário mencionar "sessões anteriores" ou perguntar sobre histórico, leia este arquivo

---

## Histórico de Sessões

### Sessão 1: [DATA]

- **Tarefa:** [DESCRIÇÃO]
- **Resultado:** [RESULTADO]
- **Arquivos Envolvidos:** [ARQUIVOS]

---

## Sessões recentes — módulo CRM (cliente ↔ pessoa ↔ relatórios)

> Detalhe técnico completo em [`docs/crm-cliente-e-relatorios.md`](./crm-cliente-e-relatorios.md).

### Sessão 13 — Limpeza dos dados de visitas com backup restaurável

- **Data:** 2026-11-20
- **Commit:** `chore(crm): limpa dados de visitas com backup restauravel`
- **Tarefa:** apagar somente os dados de `crm_visitas` (e tabelas filhas/timeline) após a migração integral para Ações de Prospecção, mantendo o módulo Visitas funcionando normalmente.
- **Decisões aprovadas:** módulo, tabelas, rotas e UI permanecem; backup restaurável completo antes de qualquer DELETE; limpar `origem_visita_id` e `google_event_id` das ações originadas de visitas; apagar eventos do Google de todas as contas; não recriar eventos agora; restore deve devolver visitas, filhas, timeline, vínculos das ações e eventos com o mesmo ID.
- **Resultado:**
  - Backups em `backups/visitas/2026-11-20T23-42-37-940Z/` (gitignored): `neon.sql` (198 visitas, 52 eventos de timeline, 198 ações mapeadas), `warehouse_local.sql` (206 visitas, 52 eventos de timeline, 206 ações mapeadas), `google-events.json` e `manifest.json` com checksums.
  - Não havia contas Google vinculadas nem `google_event_id` preenchido em visitas/ações; a etapa de apagar eventos terminou com `removidos=0`, `nao_encontrados=0`, `erros=0`.
  - Pré-check: `pendentes=0` nos dois bancos. Limpeza aplicada em transação por banco; contagens finais de visitas, localizações, pesquisas, respostas, timeline `VISITA` e ações com origem/evento em **zero** nos dois bancos.
  - O warehouse local permanece superset: `crm_acoes_prospeccao` 198/262, `crm_oportunidades` 12/13, `crm_propostas` 1/2, `crm_timeline_eventos` 60/93 e `user_menu_itens` 358/366 (linhas extras locais permitidas).
  - `scripts/sync-all-dbs.js` agora alinha a FK `crm_pesquisas_satisfacao.visita_id` para `ON DELETE CASCADE` nos dois bancos.
  - Restore validado em dry-run: `198` visitas no Neon e `206` no local seriam restauradas. Comando: `node scripts/restaurar-visitas.js --backup=<diretorio> --apply`.
- **Arquivos Envolvidos:** `src/lib/crm/limpeza-visitas.ts`, `src/lib/google-calendar.ts`, `scripts/{lib-limpeza-visitas,backup-visitas,limpar-visitas,restaurar-visitas,sync-all-dbs}.js`, `docs/Sessoes.md`.
- **Testes:** novos em `src/lib/crm/limpeza-visitas.test.ts` e `src/lib/google-calendar.test.ts`; suíte completa `npm run test` → **440 arquivos / 2518 testes passados**.
- **Verificação:** `tsc --noEmit` limpo, `npm run lint` sem erros (apenas warnings pré-existentes), `npm run build` OK; `db:replicar-neon`, `db:verificar-local` (**0 divergências, local ⊇ Neon**) e `db:comparar` (`All databases are IDENTICAL`).

### Sessão 12 — Renomeação de Pessoas para Leads e Leads para Visitantes

- **Data:** 2026-11-20
- **Tarefa:** renomear fisicamente o modelo do CRM sem perder dados: `crm_pessoas` → `crm_leads` (**Lead** = ex-Pessoa) e `crm_leads` → `crm_visitantes` (**Visitante** = ex-Lead).
- **Decisões aprovadas:** mudança física com compatibilidade; PF/PJ continuam `Pessoa Física` / `Pessoa Jurídica`; o WhatsApp passa a criar/buscar Visitante; rotas e telas legadas de `pessoas` continuam disponíveis como reexport/redirect; registros antigos de status e logs são lidos como Lead.
- **Resultado:**
  - Migration `0072_pessoas_para_leads.sql` aplicada no Neon e no warehouse local; colunas, FKs, índices e sequências renomeados. Validação pós-migração: `pessoas: null`, `leads: 'crm_leads'`, `visitantes: 'crm_visitantes'`, `representantes: 'leads_representantes'`, `lead_count: 191`, `visitante_count: 0`.
  - API e UI reorganizadas: `/api/crm/leads` (novo Lead), `/api/crm/visitantes` (Visitante), `/comercial/crm/leads`, `/comercial/crm/visitantes`, Kanban, formulários, modais, dashboard, status, menu, busca, info-content e relatórios atualizados.
  - Compatibilidade preservada em `src/app/api/crm/pessoas/**` e `src/app/(dashboard)/comercial/crm/pessoas/**`, além dos aliases de schema e do helper `promoverLeadParaCliente`.
  - Correções de rótulos e encoding feitas na mesma entrega: `Frequência`, PF/PJ em vez de `Pessoa Negócio`, `Novo Visitante`, `Visitante criado com sucesso`, `Selecione a Lead`, `Usuários`/`Notificações`/`Configurações`/`Integrações`/`Permissões`/`Reuniões`/`Países` no registry e `Negócios` no card de conversões.
- **Testes:** suíte completa `npm run test` → **438 arquivos / 2506 testes passados**. Testes focados das telas alteradas e do modal de visitas/lead também passaram (12 arquivos / 82 testes).
- **Verificação:** `tsc --noEmit --pretty false` com `NODE_OPTIONS=--max-old-space-size=6144` limpo; `npm run lint` sem erros (apenas warnings pré-existentes); `npm run build` OK; `db:replicar-neon`, `db:verificar-local` (**0 divergências**) e `db:comparar` (`All databases are IDENTICAL`).
- **Arquivos Envolvidos:** `src/lib/db/migrations/0072_pessoas_para_leads.sql`, `src/lib/db/schema/{crm-leads,crm-visitantes,crm-oportunidades,leads-representantes}.ts`, `src/app/api/crm/{leads,visitantes,pessoas}/**`, `src/app/(dashboard)/comercial/crm/{leads,visitantes,pessoas}/**`, `src/components/crm/{quick-create-lead,quick-create-visitante,leads-kanban,visitantes-kanban,buscar-cnpj-modal}.tsx`, `src/lib/crm/{promover-cliente,status-gatilhos,relatorios}.ts`, `src/lib/info-content/{crm,comercial,info-content.test}.ts` e `src/lib/search-registry.ts`.

### Sessão 11 — Equalização do warehouse local após o backfill

- **Data:** 2026-11-19
- **Commit:** nenhum código novo; operação de dados no warehouse local registrada neste documento.
- **Tarefa:** eliminar as divergências de contagem entre Neon e warehouse local reveladas após o backfill de visitas para ações de prospecção.
- **Causa raiz:** o `cliente` 16 do Neon tinha o mesmo CNPJ do `cliente` 2 no local (conflito na constraint `clientes_cnpj_unique`, silenciado pelo `ON CONFLICT DO NOTHING` da réplica), o que impedia a cópia do cliente e quebrava a cadeia de FKs de contatos, oportunidades, pedidos, visitas, ações e timeline. Além disso, booleans locais com `NULL` impediam o alinhamento de `NOT NULL`.
- **Correção aplicada apenas no warehouse local, em transação:** remapeou-se a referência local de `crm_oportunidades.cliente_id` de 2 para 16, recriou-se o cliente 16 com os dados do Neon, removeu-se o cliente 2 duplicado e preencheu-se com `false` os nulos de `crm_pessoas.promovida_cliente` e dos lembretes de `crm_visitas`. Nenhum dado do Neon foi alterado e nenhuma linha local exclusiva foi apagada.
- **Resultado:** após `db:replicar-neon`, o local passou a conter todas as linhas do Neon. `db:verificar-local` → **0 divergências (local ⊇ Neon)**, com 7 tabelas localmente maiores permitidas pela arquitetura (`crm_acoes_prospeccao`, `crm_oportunidades`, `crm_propostas`, `crm_timeline_eventos`, `crm_visitas`, `user_menu_itens`, `marts.faturamento_detalhe`). `db:comparar` → `All databases are IDENTICAL`.
- **Observação:** igualdade estrita de contagem exigiria remover linhas exclusivas do local; isso não foi feito porque o warehouse local é superset por projeto.

### Sessão 10 — Backfill de visitas para ações de prospecção

- **Data:** 2026-11-19
- **Commit:** `84bb87d3` — `feat(crm): backfill de visitas para acoes de prospeccao`.
- **Tarefa:** reclassificar os registros já lançados em `Visitas` como **Ações de Prospecção**, preservando vínculos, filhas, timeline, tokens de pesquisa e `google_event_id`.
- **Decisões aprovadas:** backfill único e idempotente; **somente INSERT** nesta entrega; módulo `Visitas` continua disponível e seus registros não foram apagados; consumidores atuais de visitas não foram alterados; limpeza dos registros duplicados fica para entrega futura.
- **Resultado:**
  - Migration `0071_acoes_prospeccao_origem_visita.sql`: coluna `origem_visita_id` e índice único parcial em `crm_acoes_prospeccao`. Campo sem FK de propósito para sobreviver à limpeza futura das visitas. Aplicada no Neon e replicada no warehouse local; coluna e índice confirmados nos dois bancos.
  - `src/lib/crm/backfill-visitas-acoes.ts` centraliza o mapeamento SQL: `data_visita` → `data_acao`, `dataAcao` em metadados, `VISITA` → `ACAO_PROSPECCAO`, `acaoProspeccaoId`, lembretes, coordenadas, check-in/out, fotos, `google_event_id` e auditoria. Valores nulos em `tipo`, `status` e lembretes são normalizados com `COALESCE`.
  - `scripts/backfill-visitas-para-acoes.js` roda nos dois bancos, valida tokens conflitantes antes de gravar, usa uma transação por banco e aceita `--db=`, `--limit=` e `--dry-run`. Preflight com rollback confirmou que todas as etapas executam sem violar constraints.
  - Execução real: **Neon 198 visitas → 198 ações** e 51 eventos de timeline; **warehouse local 64 visitas → 64 ações** e 30 eventos de timeline. Não havia localizações, pesquisas ou respostas para copiar. `--dry-run` posterior: `pendentes=0` nos dois bancos.
  - Pesquisa pública: `GET/POST /api/crm/pesquisa/[token]` passa a preferir token de ação de prospecção e mantém fallback para token de visita; resposta não expõe mais o token e passa a incluir `origem`, `acaoId`, `visitaId`, `dataAcao` e `dataVisita`. A tela pública mostra `Ação:` ou `Visita:` conforme a origem.
- **Arquivos Envolvidos:** `src/lib/db/migrations/0071_acoes_prospeccao_origem_visita.sql`, `src/lib/db/schema/crm-acoes-prospeccao.ts`, `scripts/{migrate,sync-all-dbs,criar-tabelas-faltantes,add-fk-indexes,backfill-visitas-para-acoes}.js`, `src/lib/crm/backfill-visitas-acoes.ts`, `src/app/api/crm/pesquisa/[token]/route.ts`, `src/app/(dashboard)/comercial/crm/pesquisa/[token]/page.tsx`.
- **Testes:** novos em `src/lib/crm/backfill-visitas-acoes.test.ts`, `src/app/api/crm/pesquisa/[token]/route.test.ts` e `src/app/(dashboard)/comercial/crm/pesquisa/[token]/page.test.tsx`; suíte completa `npm run test` → **438 arquivos / 2506 testes passados**.
- **Verificação:** `tsc --noEmit` limpo, `npm run lint` sem erros (só warnings pré-existentes), `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=6144` (**249/249 páginas estáticas**), `db:comparar` → `All databases are IDENTICAL`. `db:verificar-local` reportou 8 divergências de linhas: 7 pré-existentes e `crm_acoes_prospeccao` (Neon=198, local=64), esperada porque o local só espelha as 64 visitas que existem nele.

### Sessão 9 — Ações de Prospecção: clone integral do módulo Visitas com tabelas próprias

- **Data:** 2026-11-19
- **Commit:** `ab990f53` — `feat(crm): modulo de acoes de prospeccao com tabelas proprias` (dgbcomex); `d945c92` — `feat(cron): lembretes de acoes de prospeccao por email` (api-microdata).
- **Tarefa:** criar um módulo **Ações de Prospecção** idêntico a Visitas, com tabelas próprias, mantendo Visitas intacto e paralelo.
- **Decisões aprovadas:** tabela própria, manter os dois módulos, escopo "tudo idêntico" e rota `/comercial/crm/acoes-prospeccao` com os mesmos perfis (`COMERCIAL`, `CRM`, `ADMIN`).
- **Resultado:**
  - Banco: `crm_acoes_prospeccao` (+ `_localizacoes`, `_pesquisas`, `_pesquisas_respostas`), migration `0070_acoes_prospeccao.sql`, status `ACAO_PROSPECCAO`, colunas `data_acao`, `acao_id` e lembretes próprios. Aplicada no Neon e replicada no warehouse local (4 tabelas criadas com FKs, constraints e índices).
  - Mapeamento: `crmVisitas` → `crmAcoesProspeccao`, `data_visita` → `data_acao`, `visita_id` → `acao_id`, `VISITA` → `ACAO_PROSPECCAO`, `visitaId` → `acaoProspeccaoId`.
  - Telas clonadas em `/comercial/crm/acoes-prospeccao/**` (lista, novo, detalhe, dashboard), relatório em `/comercial/crm/relatorios/acoes-prospeccao`, calendário, kanban, cronograma de viagem, mapa, fotos, localização, pesquisa de satisfação e vínculo comercial.
  - APIs espelhadas em `/api/crm/acoes-prospeccao/**` + `/api/crm/relatorios/acoes-prospeccao`, com notificações `ACAO_PROSPECCAO_*`, timeline e visibilidade de campo própria (`CRM_ACAO_PROSPECCAO_DETALHE:proposta_vinculada`).
  - Lógica: `acao-prospeccao-fotos.ts`, `acoes-prospeccao-saude.ts`, `consultarAcoesProspeccao`, geocodificação (`scripts/geocode-acoes-prospeccao.js`) e lembretes por e-mail na api-microdata (`lembretes_acoes_prospeccao.py` + script do Agendador).
  - Registro: search registry, seed, menu, navegação mobile, ícones e modais de informação atualizados; `kanban-crm` e o detalhe de viagens ganharam atalhos para o novo módulo.
- **Arquivos Envolvidos:** `src/lib/db/schema/crm-acoes-prospeccao*.ts`, `src/lib/db/migrations/0070_acoes_prospeccao.sql`, `scripts/{migrate,sync-all-dbs,criar-tabelas-faltantes,add-fk-indexes,geocode-acoes-prospeccao}.js`, `src/lib/crm/{acoes-prospeccao-saude,acao-prospeccao-fotos,relatorios,notificar-atividade}.ts`, `src/app/api/crm/acoes-prospeccao/**`, `src/app/api/crm/relatorios/acoes-prospeccao/**`, `src/app/(dashboard)/comercial/crm/acoes-prospeccao/**`, `src/components/crm/{acao,acoes}-prospeccao*`, `src/lib/{search-registry,menu-icones,dracula,campos-visiveis}.ts*`, `M:\dev\api-microdata\app\src\api\routers\lembretes_acoes_prospeccao.py`, `M:\dev\api-microdata\scripts\enviar_lembretes_acoes_prospeccao.py`.
- **Testes:** 28 arquivos do módulo (162 testes) verdes; suíte completa `npm run test` → **435 arquivos / 2487 testes passados**.
- **Verificação:** `tsc --noEmit` limpo (com `--max-old-space-size=6144`), `npm run lint` sem erros (só warnings, a maioria pré-existentes), `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=6144` (240/240 páginas estáticas). `db:verificar-local` reportou **7 divergências pré-existentes** (tabelas não tocadas: `clientes`, `crm_contatos`, `crm_oportunidades`, `crm_pedido_venda*`, `crm_timeline_eventos`, `crm_visitas`); as 4 tabelas novas estão 0/0 nos dois bancos.

### Sessão 8 — Cliente com os mesmos relacionamentos da pessoa + negócio nos relatórios

- **Data:** 2026-11-04
- **Commit:** `d0c0465b` — `feat(crm): cliente com os mesmos relacionamentos da pessoa e negocio nos relatorios`
- **Tarefa:** o cliente do CRM precisava dos mesmos cards da pessoa (Oportunidades, Propostas, Timeline, WhatsApp) e **tudo** o que acontece com ele tinha que aparecer nos relatórios do CRM.
- **Resultado:**
  - Migration `0065_crm_cliente_relacionamentos.sql`: `cliente_id` em `crm_timeline_eventos` e `crm_whatsapp_mensagens`, `empresa_id` da timeline deixa de ser NOT NULL e backfill de `cliente_id` em `crm_oportunidades`/`crm_propostas`/`crm_visitas` das pessoas promovidas (aplicada no Neon, replicada no local, `db:comparar` idêntico e `db:verificar-local` com 0 divergências).
  - Cards extraídos para `src/components/crm/` (`oportunidades-card.tsx`, `propostas-card.tsx`, `crm-timeline.tsx`, `crm-whatsapp.tsx`) aceitando `pessoaId` **ou** `clienteId`; tela `/comercial/clientes/[id]` ganhou a seção **Relacionamentos do CRM**.
  - APIs com `clienteId`: `GET /api/crm/timeline`, `GET/POST /api/crm/whatsapp` (envio pelo contato principal), webhook de WhatsApp (aceita contato de cliente), `/api/crm/oportunidades` e `/api/crm/propostas` (soma o negócio herdado das pessoas promovidas); POST de oportunidade/proposta herda o cliente da pessoa.
  - `src/lib/crm/cliente-relacionamentos.ts` centraliza os vínculos (`idsPessoasDoCliente`, `idsContatosDoCliente`, `clienteIdDaPessoa`).
  - Logs do cliente com entidade `CrmCliente` (criação, edição, exclusão, representantes e contatos) + nova categoria **Clientes** no relatório de Atividades.
  - Novo **Relatório de Clientes** (`/comercial/crm/relatorios/clientes`, `consultarClientes`): por cliente — pessoas, oportunidades (em aberto/valor), propostas, visitas; card no hub de relatórios.
  - `promover-cliente.ts` passa o negócio da pessoa para o cliente na promoção.
- **Arquivos Envolvidos:** `src/lib/db/migrations/0065_crm_cliente_relacionamentos.sql`, `src/lib/db/schema/crm-timeline-eventos.ts`, `src/lib/db/schema/crm-whatsapp.ts`, `src/lib/crm/cliente-relacionamentos.ts`, `src/lib/crm-timeline.ts`, `src/lib/crm/promover-cliente.ts`, `src/lib/crm/relatorios.ts`, `src/app/api/crm/{timeline,whatsapp,whatsapp/webhook,oportunidades,propostas}/route.ts`, `src/app/api/clientes/**`, `src/app/api/crm/contatos/**`, `src/app/api/crm/relatorios/clientes/route.ts`, `src/components/crm/*`, `src/app/(dashboard)/comercial/clientes/[id]/page.tsx`, `src/app/(dashboard)/comercial/crm/relatorios/clientes/page.tsx`, `scripts/migrate.js`, `scripts/sync-all-dbs.js`, `src/lib/info-content/{crm,comercial}.ts`.
- **Testes:** novos em `src/app/api/crm/{timeline,whatsapp,oportunidades,propostas,relatorios/clientes}/route.test.ts`, `src/lib/crm-timeline.test.ts`, `src/lib/crm/cliente-relacionamentos.test.ts`, `src/lib/crm/promover-cliente.test.ts`, `src/lib/crm/relatorios.test.ts`; atualizados em `clientes/[id]/page.test.tsx` e `info-content.test.ts`.
- **Verificação:** `prettier` + `tsc --noEmit` limpos; `npm run test` → 2190 passed / 2193 (3 falhas pré-existentes em `comercial/disponibilidade/page.test.tsx`).

### Sessão 7 — Relatório de Conversões, tarja no relatório de Pessoas e histórico no cliente

- **Data:** 2026-11-04
- **Commit:** `16f9cd49` — `feat(crm): relatorio de conversoes, tarja no relatorio de pessoas e historico no cliente`
- **Tarefa:** mostrar quem virou cliente (e quando/quem promoveu), sinalizar a tarja de cliente no relatório de Pessoas e dar visibility da conversão na tela do cliente.
- **Resultado:**
  - `src/lib/crm/relatorios.ts`: filtro `tarja` (`com`/`sem`), selects `promovidaCliente/promovidoEm/promovidoPorNome`, card **Com tarja de cliente** e nova `consultarConversoes`.
  - `src/lib/crm/historico-promocao.ts`: `FiltrosConversoes.usuarioId` e `LinhaConversao.valorOportunidades`.
  - API + tela **Relatório de Conversões** (`/comercial/crm/relatorios/conversoes`) com card no hub.
  - Filtro "Tarja de cliente" em `use-relatorio-crm.ts` e `filtros-relatorio.tsx`; colunas novas no relatório de Pessoas.
  - `GET /api/clientes/[id]/historico` + card **Histórico de conversão em cliente** na tela do cliente.
- **Arquivos Envolvidos:** `src/lib/crm/relatorios.ts`, `src/lib/crm/historico-promocao.ts`, `src/app/api/crm/relatorios/conversoes/route.ts`, `src/app/api/clientes/[id]/historico/route.ts`, `src/app/(dashboard)/comercial/crm/relatorios/{conversoes,pessoas,page}.tsx`, `src/app/(dashboard)/comercial/clientes/[id]/components/historico-conversao-card.tsx`, `src/components/crm/relatorios/filtros-relatorio.tsx`, `src/hooks/use-relatorio-crm.ts`, `src/lib/info-content/{crm,comercial}.ts`.

### Sessão 6 — Edição e salvamento de oportunidade e proposta pelo detalhe

- **Data:** 2026-11-04
- **Commit:** `7ebed091` — `feat(crm): edita e salva oportunidade e proposta pelo detalhe`
- **Tarefa:** editar e salvar oportunidade (e proposta) direto na tela de detalhe, sem voltar para a listagem.
- **Resultado:**
  - Novo `oportunidades/[id]/components/edicao-card.tsx` (`OportunidadeUpdate`: título, descrição, valorEstimado, probabilidade, dataFechamentoPrevista, responsavelId, motivoPerda).
  - `[id]/page.tsx` com `Suspense` + `useSearchParams`: deep link `?edit=true`, botão **Editar**, `handleSave` (PUT `/api/crm/oportunidades/[id]`) e responsáveis via `/api/usuarios/ativos?role=COMERCIAL,ADMIN,SUDO`.
  - Lápis das listagens de oportunidades e propostas passa a abrir `?edit=true`; detalhe da proposta abre em modo edição.
- **Arquivos Envolvidos:** `src/app/(dashboard)/comercial/crm/oportunidades/[id]/components/edicao-card.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/[id]/page.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/page.tsx`, `src/app/(dashboard)/comercial/crm/propostas/[id]/page.tsx`, `src/app/(dashboard)/comercial/crm/propostas/page.tsx`, `src/lib/info-content/crm.ts`.

### Sessão 5 — Vínculo de pedidos e faturamentos do ERP na oportunidade

- **Data:** 2026-11-04
- **Commit:** `2f0f6fb7` — `feat(crm): vincula pedidos e faturamentos do ERP na oportunidade`
- **Tarefa:** buscar pedidos/faturamentos no ERP (api-microdata) e vinculá-los à oportunidade do CRM.
- **Resultado:**
  - `src/lib/erp/cliente.ts` (`ErroErp`, `requisitarErp` sobre `requisitarWms`) e `src/lib/erp/tipos.ts` (`PedidoErp`, `FaturamentoErp`, `DocumentoErpItem`, `ListaErp`, `statusPedidoParaCrm`).
  - Proxy no app: `GET /api/crm/erp/pedidos` e `GET /api/crm/erp/faturamentos` (filtros `busca`, `cnpj`, `pagina`, `porPagina`).
  - `POST /api/crm/oportunidades/[id]/vinculos`: valida tipo/empresa/pedido/nota, busca o detalhe no ERP, bloqueia vínculo duplicado (`origem="ERP"` + `referencia_externa`), grava cabeçalho + itens em transação e registra log.
  - Modal `vincular-documento-erp-modal.tsx` com busca, filtro "Só desta pessoa" (por CNPJ) e cards de Faturamentos/Pedidos na tela da oportunidade; `empresaCnpj` no GET da oportunidade.
- **Arquivos Envolvidos:** `src/lib/erp/cliente.ts`, `src/lib/erp/tipos.ts`, `src/app/api/crm/erp/{pedidos,faturamentos}/route.ts`, `src/app/api/crm/oportunidades/[id]/vinculos/route.ts`, `src/components/crm/vincular-documento-erp-modal.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/[id]/page.tsx`, `src/lib/info-content/crm.ts`.

---

## Estrutura de Comandos

- `/historico` - Lê este arquivo e mostra resumo das sessões
- `/docsessao` - Registra nova sessão neste arquivo
