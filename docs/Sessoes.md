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
