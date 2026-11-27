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

### Sessão 42 — Orçamento de tokens na análise de IA

- **Data:** 2026-11-23
- **Commits:** `8a95c262` — `fix(crm): orcamenta tokens da analise ia`, `5f009871` (chave NVIDIA), `f0505fc6` (diagnóstico do provedor) e `364abb66` (prévia de envio à IA)
- **Tarefa:** corrigir o 503 persistente em `POST /api/crm/saude-prospeccao/ia/analises` após reduzir o `max_tokens` de 1100 para 700.
- **Causa raiz:** o Groq free tier limita a saída a 1000 tokens por minuto por modelo; a análise fazia até 3 chamadas de 700 tokens (decisão + até 2 consultas + resposta final), estourando o OTPM e fazendo o `chamarIA` devolver `provedor: "nenhum"`.
- **Decisão aprovada:** separar a decisão sobre consultas curadas da resposta final e forçar a chave da NVIDIA cadastrada em `ai_chaves` para essa análise. A decisão usa `maxTokens: 80` por rodada (no máximo 2) e a resposta final continua com `maxTokens: 700`; pior caso: `80 + 80 + 700 = 860`, abaixo do limite de 1000 do Groq. A NVIDIA Nemotron é usada com `provedor: openai_compatible`, `ordem=1`, sem fallback automático para outro provedor nesta rota.
- **Resultado:**
  - `chamarIA` aceita `chaveId` e, quando informado, usa apenas essa chave (sem fallback).
  - `chamarAnaliseComConsultas` busca a chave `openai_compatible` com `nome`/`modelo` contendo NVIDIA/Nemotron e passa `chaveId` para decisão e resposta final.
  - `POST /api/crm/saude-prospeccao/ia/analises` seleciona essa chave antes de chamar a análise e devolve `detalhe` no 503 para diagnóstico.
  - `chamarAnaliseComConsultas` faz uma chamada curta com instrução explícita (`PRONTO` ou `CONSULTAR: ...`), executa consultas curadas somente quando autorizado e faz uma última chamada em Markdown sem novas consultas.
  - Modal “i” explica o orçamento de tokens e o provedor configurado.
- **Arquivos Envolvidos:** `src/lib/ai/index.ts`, `src/lib/crm/saude-prospeccao-ia.ts`, `src/lib/crm/saude-prospeccao-ia.test.ts`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/route.ts`, `docs/Sessoes.md`.
- **Testes:** `src/lib/crm/saude-prospeccao-ia.test.ts` (3 testes) e rotas/painel da IA (5 arquivos / 71 testes); suíte completa `npm run test` → **488 arquivos / 2843 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (259/259 páginas estáticas).

---

### Sessão 43 — Campos obrigatórios ao mover/alterar status de oportunidades

- **Data:** 2026-11-23
- **Commit:** `b0b2a23b` — `feat(crm): exige valor estimado e probabilidade para status além de Novo/Qualificação`
- **Tarefa:** exigir Valor Estimado e Probabilidade maiores que 1 ao mover ou alterar o status de oportunidades para qualquer estágio diferente de NOVO e QUALIFICACAO, e corrigir o Kanban para exibir colunas de status presentes nos dados mesmo que ausentes da configuração.
- **Decisões aprovadas:** apenas NOVO e QUALIFICACAO ficam isentos; PROPOSTA, NEGOCIACAO, FECHADO_GANHO (alias GANHO), FECHADO_PERDIDO e status customizados exigem os dois campos. O backend valida PATCH/PUT/POST e retorna 409 com `validacaoObrigatoria`; o front abre um modal solicitando o preenchimento antes de mover/alterar, com rollback do card ao cancelar.
- **Resultado:**
  - Novo `src/lib/crm/validacao-oportunidade.ts` com `validarCamposObrigatoriosOportunidade`, `statusExigeCamposObrigatorios` e `normalizarStatusOportunidade`.
  - `PATCH /api/crm/oportunidades/[id]/status`, `PUT /api/crm/oportunidades/[id]` e `POST /api/crm/oportunidades` validam e bloqueiam com 409 quando ausentes/inválidos.
  - Modal `src/components/crm/campos-obrigatorios-oportunidade-modal.tsx` usado no Kanban (`oportunidades-kanban.tsx` e `kanban/page.tsx`) e no detalhe (`[id]/page.tsx`).
  - Kanban exibe colunas faltantes para status presentes nos dados e aplica migration `0078_status_oportunidade_kanban.sql`.
- **Arquivos Envolvidos:** `src/lib/crm/validacao-oportunidade.ts`, `src/lib/crm/validacao-oportunidade.test.ts`, `src/app/api/crm/oportunidades/route.ts`, `src/app/api/crm/oportunidades/[id]/route.ts`, `src/app/api/crm/oportunidades/[id]/status/route.ts`, `src/app/api/crm/oportunidades/route.test.ts`, `src/app/api/crm/oportunidades/[id]/route.test.ts`, `src/app/api/crm/oportunidades/[id]/status/route.test.ts`, `src/components/crm/campos-obrigatorios-oportunidade-modal.tsx`, `src/components/crm/oportunidades-kanban.tsx`, `src/components/crm/oportunidades-kanban.test.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/[id]/page.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/novo/page.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/kanban/page.tsx`, `src/lib/db/migrations/0078_status_oportunidade_kanban.sql`, `src/lib/info-content/crm.ts`, `docs/Sessoes.md`.
- **Testes:** suíte completa `npm run test` → **490 arquivos / 2867 testes passados**; `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=4096`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=4096`; `next lint` apenas warnings pré-existentes.

---

### Sessão 44 — Kanban de leads: requisitos por status e conversão por faturamento

- **Data:** 2026-11-23
- **Commit:** `11df1f80` — `feat(crm): requisitos por status no kanban de leads e normaliza oportunidades`
- **Tarefa:** implementar requisitos de status para leads e oportunidades no Kanban de leads, normalizar status de oportunidades, reutilizar o botão de verificação de pedidos faturados e documentar a regra de conversão em cliente.
- **Decisões aprovadas:** requisitos centralizados no código por enquanto (`src/lib/crm/requisitos-status.ts`); configuração no banco/`/perfil/menus` é futura feature. Lead não é rebaixada: Proposta qualifica apenas Novo/Perdido/Inativo; Negociação ou Ganho leva a lead para Possível Cliente; conversão exige CNPJ e decisão `CONVERTER` via botão/modal existente. Oportunidade exige Valor Estimado e Probabilidade > 1 fora de NOVO/QUALIFICACAO; FECHADO_GANHO exige pedido ERP; FECHADO_PERDIDO exige motivo.
- **Resultado:**
  - Novo `src/lib/crm/requisitos-status.ts` com `validarRequisitosOportunidade`, `validarRequisitosLead` e `contarOportunidadesAceitaPossivelCliente`; testes unitários em `requisitos-status.test.ts`.
  - `automacoes-crm.ts` valida requisitos de lead e oportunidade antes de gravar; adiciona lead para QUALIFICADO em PROPOSTA e para POSSIVEL_CLIENTE em NEGOCIACAO/FECHADO_GANHO, sem rebaixar POSSIVEL_CLIENTE.
  - Rotas `PATCH/PUT` de oportunidades passam `valorEstimado`/`probabilidade` para a automação; rotas de lead continuam bloqueadas quando o status de destino não atende aos requisitos.
  - `LeadsKanban` trata bloqueios com toast/rollback; `OportunidadesKanban` remove colunas de fallback duplicadas e agrupa por status normalizado.
  - Migration `0079_normalizar_status_oportunidades.sql` normaliza `Novo`/`GANHO` etc. para códigos canônicos no Neon e no warehouse local.
  - Tela de Leads reusa `VerificarPedidosFaturados` com `onConvertido` para refetch; `converter-faturados` segue a automação de conversão com validação de requisitos.
  - Modais “i” atualizados (`crm.ts`) para Leads, Oportunidades, Kanban de Oportunidades e Pedidos de Venda; `docs/Sessoes.md` atualizado.
- **Arquivos Envolvidos:** `src/lib/crm/requisitos-status.ts`, `src/lib/crm/requisitos-status.test.ts`, `src/lib/crm/automacoes-crm.ts`, `src/lib/crm/automacoes-crm.test.ts`, `src/app/api/crm/oportunidades/[id]/status/route.ts`, `src/app/api/crm/oportunidades/[id]/route.ts`, `src/components/crm/oportunidades-kanban.tsx`, `src/components/crm/leads-kanban.tsx`, `src/app/(dashboard)/comercial/crm/leads/page.tsx`, `src/lib/db/migrations/0079_normalizar_status_oportunidades.sql`, `src/lib/info-content/crm.ts`, `docs/Sessoes.md`.
- **Testes:** `requisitos-status.test.ts` (17 testes), `automacoes-crm.test.ts` (4 testes) e rotas de oportunidades/leads/pedidos (41 testes) passaram; suíte completa, typecheck, lint e build validados antes do commit.
- **Verificação:** concluída em `11df1f80` (commit e push efetuados).

---

### Sessão 41 — Modal responsivo e provedor da análise de IA

- **Data:** 2026-11-22
- **Commit:** `fix(crm): ajusta modal e provedor da analise ia`
- **Tarefa:** fazer o modal de análise de IA ocupar bem o desktop e se moldar ao mobile, e corrigir o erro “Nenhum provedor de IA disponível” ao gerar a análise em `/comercial/crm/saude-prospeccao`, usando o mesmo provedor/configuração que já funciona no resumo de IA do cliente.
- **Decisões aprovadas:** o modal passa a abrir com quase toda a altura da tela (`92dvh`) e largura de até `96rem`, sobrescrevendo o `sm:max-w-sm` padrão do `DialogContent`; no mobile os componentes são empilhados, o histórico vira uma faixa horizontal e o campo de pergunta/Enviar ocupam a largura. A análise usa `maxTokens: 700`, o mesmo valor do endpoint de resumo de IA do cliente.
- **Resultado:**
  - `DialogContent` com `w-[calc(100%-1rem)]`, `h-[92dvh]`, `sm:max-w-[96rem]`, header com espaço para o botão de fechar e grid interno com sidebar lateral no desktop e faixa horizontal no mobile.
  - Barra de ações com quebra controlada, Markdown com `prose-base` no desktop, balões de conversa com recuos menores no mobile e formulário de pergunta empilhado no mobile.
  - Causa raiz do erro confirmada: o Groq recusava `max_tokens: 1100` com HTTP 429 (`OTPM: Limit 1000`); com 700 a requisição retorna 200. A análise passou a usar as mesmas opções do resumo de IA do cliente.
  - Modal “i” da análise explica o tamanho do modal e o provedor compartilhado.
- **Arquivos Envolvidos:** `src/components/crm/saude-prospeccao/{analise-ia-panel.tsx,analise-ia-panel.test.tsx}`, `src/lib/crm/saude-prospeccao-ia.ts`, `src/lib/crm/saude-prospeccao-ia.test.ts`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** novo teste unitário para `chamarAnaliseComConsultas` com `maxTokens: 700`; ajustes no teste do painel para cobrir as classes responsivas e no teste dos modais. Focados `3 arquivos / 56 testes passados`; suíte completa `npm run test` → **488 arquivos / 2841 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (259/259 páginas estáticas).

---

### Sessão 40 — Saúde da Prospecção, IA e atalhos no CRM

- **Data:** 2026-11-22
- **Commit:** `feat(crm): adiciona saude da prospeccao e atalhos`
- **Tarefa:** consolidar visitas e ações de prospecção por cliente/lead em `/comercial/crm/saude-prospeccao`, com classificação AEC/BEC/Engajados, conversão e análise por IA; renomear a rota antiga; expor o atalho “Saúde da Prospecção” no CRM, Clientes, Leads, Ações de Prospecção, Oportunidades e Kanban de Temperatura; e abrir Oportunidades com o filtro Todas/Minhas em `Todas`.
- **Decisões aprovadas:** Engajados prevalece quando engajamento > 30%; abaixo disso, esforço > 45% classifica como AEC e 45% ou menos como BEC; ações contam como visitas no esforço/engajamento sem espelhamento entre origens; timeline e tarefas não pontuam. A IA usa somente consultas curadas e parametrizadas, sem SQL livre, com no máximo duas consultas por retorno e envio de e-mail somente no botão “Concluir e enviar”. A antiga `/comercial/crm/leads/dashboard` virou redirect e o filtro de Oportunidades passou a carregar `/api/crm/oportunidades` por padrão.
- **Resultado:**
  - Nova página `/comercial/crm/saude-prospeccao` com filtro por responsável, recorte do ano corrente, cards de Visitas R/A/C, Ações R/A/C, AEC, Engajados e BEC, colunas de esforço, engajamento e conversão, exportações CSV/PDF/MD e painel `Analisar com IA`.
  - `src/lib/crm/classificacao-saude.ts` centralizou os limiares; visitas e ações delegam para o helper, mantendo cards e tabelas consistentes.
  - Backend de IA com análise inicial, chat seguro e conclusão: `POST/GET /api/crm/saude-prospeccao/ia/analises`, `GET /api/.../[id]`, `POST /api/.../[id]/mensagens` e `POST /api/.../[id]/concluir`, com acesso ao autor e ADMIN/SUDO/CRM.
  - Migration `0077_saude_prospeccao_ia.sql` criou as tabelas de análises/mensagens, índices e renomeou o item de menu no Neon e no warehouse local.
  - Atalho “Saúde da Prospecção” adicionado ao cabeçalho das seis telas; Oportunidades agora começa em `Todas`, com `Minhas` disponível.
  - Busca global, menu seed e modais “i” das telas afetadas atualizados.
  - Ajuste de alinhamento (`fix(crm): alinha temperatura do resumo ia`): o prompt do resumo IA passou a usar exclusivamente as regras canônicas de temperatura, com a data atual no contexto.
- **Arquivos Envolvidos:**
  `src/app/(dashboard)/comercial/crm/{saude-prospeccao/page.tsx,leads/dashboard/page.tsx,page.tsx,acoes-prospeccao/page.tsx,leads/page.tsx,oportunidades/page.tsx,temperatura/kanban/page.tsx}`, `src/app/(dashboard)/comercial/clientes/page.tsx`, `src/components/crm/{leads/dashboard/cliente-saude-table.tsx,visitas/dashboard/cliente-saude-table.tsx,acoes-prospeccao/dashboard/cliente-saude-table.tsx,saude-prospeccao/analise-ia-panel.tsx}`, `src/lib/crm/{classificacao-saude.ts,visitas-saude.ts,acoes-prospeccao-saude.ts,leads-saude.ts,saude-prospeccao-ia.ts,saude-prospeccao-acesso.ts,resumo-ia-contexto.ts,resumo-ia-contexto.test.ts}`, `src/lib/db/schema/crm-saude-prospeccao-ia.ts`, `src/lib/db/migrations/0077_saude_prospeccao_ia.sql`, `src/app/api/crm/saude-prospeccao/ia/**`, `src/lib/info-content/{crm.ts,crm-dashboard.ts,comercial.ts,info-content.test.ts}`, `src/lib/search-registry.ts`, `src/lib/telas-disponiveis.test.ts`, `scripts/seed-crm-menus.sql`, `docs/Sessoes.md`.
- **Testes:** novos em `saude-prospeccao/page.test.tsx`, `analise-ia-panel.test.tsx` e rotas de IA; ajustes nas tabelas, classificações, redirects e nas seis telas com atalho. Focados `7 arquivos / 133 testes passados`; suíte completa `npm run test` → **487 arquivos / 2840 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (240/240 páginas estáticas); `npm run db:migrate:all`, `npm run db:comparar` (estruturas idênticas) e `npm run db:verificar-local` (**0 divergências**, local ⊇ Neon).

---

### Sessão 39 — Refino visual e filtros do kanban de temperatura

- **Data:** 2026-11-22
- **Commit:** `feat(crm): refina kanban de temperatura`
- **Tarefa:** refinar o kanban de temperatura após o feedback de produção: usar toda a largura, renomear o atalho, aplicar as cores Dracula das faixas com cards em tom intenso, destacar o botão da faixa atual, permitir flutuar, explicar cada coluna com o “i” e ampliar os filtros com segmento, presença/ausência de visitas e ações e ausência de oportunidades/pedidos.
- **Decisões aprovadas:** as cores vêm de `corPorTitulo` (Quentes `#50fa7b`, Mornos `#ffb86c`, Frios `#bd93f9`); a coluna recebe a cor da faixa e o card usa fundo/borda intensos da mesma paleta; o botão da faixa atual permanece visível e ganha `outline` na cor da faixa; cada coluna ganha um “i” com `semaforoConversaoInfo[faixa]`; o botão Flutuar reusa `FloatableKanban` e abre `/kanban-crm?tipo=TEMPERATURA`; a janela standalone detecta a rota e esconde “Voltar ao CRM”; `Com` e `Sem` do mesmo recurso são exclusivos.
- **Resultado:**
  - `DroppableColumn` e `KanbanSkeleton` aceitam `estilo`/`estilos` e `info`, aplicando variáveis CSS Dracula sem alterar os outros kanbans; a rota do kanban usa `max-w-none` no `DashboardShell` e grid `lg:grid-cols-3` com colunas `w-full`.
  - `CardTemperatura` usa `fundoIntensoClaro`, `fundoIntensoEscuro` e `bordaIntensa`; `src/lib/dracula.ts` passou a expor esses campos, mantendo a paleta como fonte única.
  - O atalho e a busca global passam a se chamar “Kanban de Temperatura”; modais “i” do dashboard e do kanban foram atualizados.
  - `TemperaturaFiltros` ganhou `segmento`, `semOportunidade`, `semPedido`, `comVisita`, `semVisita`, `comAcao` e `semAcao`, com `segmentosDisponiveisTemperatura()` derivado dos itens carregados; o select e os botões de filtro usam `aria-pressed`.
  - A janela `/kanban-crm?tipo=TEMPERATURA` renderiza o mesmo kanban em modo flutuante e mantém o botão “Recolocar na aplicação”.
- **Arquivos Envolvidos:** `src/components/crm/{kanban-column.tsx,floatable-kanban.tsx}`, `src/components/layout/{dashboard-shell.tsx,dashboard-shell.test.tsx}`, `src/app/(dashboard)/comercial/crm/{page.tsx,page.test.tsx,temperatura/kanban/page.tsx,temperatura/kanban/page.test.tsx}`, `src/app/kanban-crm/{page.tsx,page.temperatura.test.tsx}`, `src/lib/crm/{temperatura.ts,temperatura.test.ts}`, `src/lib/dracula.ts`, `src/lib/dracula.test.ts`, `src/lib/info-content/{crm.ts,crm-dashboard.ts,info-content.test.ts}`, `src/lib/search-registry.ts`, `docs/Sessoes.md`.
- **Testes:** focados `7 arquivos / 96 testes passados`; suíte completa `npm run test` → **483 arquivos / 2817 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (258/258 páginas estáticas).

---

### Sessão 38 — Temperatura combinada no CRM e kanban de conversão

- **Data:** 2026-11-22
- **Commit:** `feat(crm): adiciona kanban de temperatura`
- **Tarefa:** unir leads e clientes em um único semáforo Quentes/Mornos/Frios no `/comercial/crm` e criar o kanban `/comercial/crm/temperatura/kanban`, com arraste, regras de criação/ajuste de oportunidade e filtros combináveis.
- **Decisões aprovadas:** o atalho `Kanban` passa a abrir a nova rota; lead promovido aparece somente como Cliente; subida cria ou reaproveita oportunidade (`MORNO` → `PROPOSTA`, `QUENTE` → `NEGOCIACAO`); `QUENTE → MORNO` exige mover todas as negociações para proposta e bloqueia se houver ganho/pedido no mês; qualquer ida para `FRIO` bloqueia se houver ganho/pedido no trimestre e exige `FECHADO_PERDIDO` com motivo na última oportunidade. Filtros e busca ficam só no kanban; o dashboard mantém cards e modal atuais, agora combinados.
- **Resultado:**
  - `src/lib/crm/temperatura.ts` centraliza busca sem acentos (nome, razão/fantasia, CPF/CNPJ pontuado ou não, segmento, responsável, contato, e-mail, telefones e cidade), filtros `Tipo`/`Com oportunidade`/`Com pedido` e `planoDaTransicao()` com as regras de oportunidade.
  - `src/lib/crm/temperatura-server.ts` carrega leads ativos não promovidos e clientes com contadores, flags de ganho/pedido e oportunidades resumidas; `GET /api/crm/temperatura` devolve itens e contagem, e `GET /api/crm/dashboard/route.ts` passa a incluir `temperatura`.
  - `POST /api/crm/temperatura/mover` valida destino, usa `validateRequest`, devolve `409 decisaoPendente` quando necessário, chama `processarAutomacaoCRM` e recarrega a listagem; cartão que sai dos filtros ganha aviso no toast.
  - `SemaforoConversao` aceita `entidade="leads-clientes"`, mostra a coluna `Tipo` no modal e abre `/comercial/crm/temperatura/kanban`; a página do CRM ganhou o semáforo combinado e o atalho atualizado.
  - O kanban usa `@dnd-kit/core` com `PointerSensor`/`TouchSensor`, colunas arrastáveis e botões de mover acessíveis; há modal de confirmação para escolher oportunidade existente/nova e decisão de perda da última oportunidade.
  - Modais “i” do CRM, do kanban, das faixas e da busca global foram atualizados; nenhuma migration ou alteração de banco nesta sessão.
- **Arquivos Envolvidos:** `src/lib/crm/{temperatura.ts,temperatura.test.ts,temperatura-server.ts,contadores-listagem.ts,automacoes-crm.ts}`, `src/app/api/crm/temperatura/{route.ts,route.test.ts,mover/route.ts,mover/route.test.ts}`, `src/app/api/crm/dashboard/route.ts`, `src/app/(dashboard)/comercial/crm/{page.tsx,page.test.tsx,temperatura/kanban/page.tsx,temperatura/kanban/page.test.tsx}`, `src/components/crm/{semaforo-conversao.tsx,semaforo-conversao.test.tsx,decisao-automacao-modal.tsx,leads/metricas-modal.tsx,kanban-column.tsx}`, `src/lib/info-content/{crm.ts,crm-dashboard.ts,info-content.test.ts}`, `src/lib/search-registry.ts`, `src/types/dnd-kit.d.ts`, `docs/Sessoes.md`.
- **Testes:** novos em `temperatura.test.ts`, `temperatura/kanban/page.test.tsx`, `temperatura/route.test.ts` e `temperatura/mover/route.test.ts`; ajustes em `page.test.tsx` do CRM, `semaforo-conversao.test.tsx` e `info-content.test.ts`. Focados `7 arquivos / 88 testes passados`; suíte completa `npm run test` → **482 arquivos / 2810 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (258/258 páginas estáticas).

---

### Sessão 34 — Filtro superior de status em visitas e ações de prospecção

- **Data:** 2026-11-22
- **Commit:** `feat(crm): filtra visitas e acoes por status no topo`
- **Tarefa:** permitir filtrar as listagens de visitas e ações de prospecção apenas clicando em botões de status no topo, nos modos Tabela e Calendário das URLs `/comercial/crm/visitas` e `/comercial/crm/acoes-prospeccao`.
- **Decisões aprovadas:** o filtro usa os status ativos configurados em `/api/admin/status`, com fallback para `AGENDADA`, `EM_ANDAMENTO`, `REALIZADA` e `CANCELADA` caso a configuração não carregue. `Todos` limpa o filtro e clicar duas vezes no mesmo status também alterna de volta. O Kanban continua sem filtro superior, apenas agrupando por status.
- **Resultado:**
  - As duas páginas ganharam uma faixa superior com botões `Todos` + statuses, visível apenas fora do Kanban, com `aria-pressed` e cor configurada por status.
  - Tabela e Calendário passam o status ao backend (`?status=`); a paginação volta à página 1 e a seleção em massa é limpa ao trocar o filtro.
  - As APIs já aceitavam `status`, então não houve migration, novo endpoint ou mudança de contrato.
  - Testes de página cobrem filtro na Tabela, filtro no Calendário, limpeza por `Todos` e ausência da faixa no Kanban; os modais “i” explicam a nova dinâmica.
- **Arquivos Envolvidos:** `src/app/(dashboard)/comercial/crm/visitas/page.tsx`, `src/app/(dashboard)/comercial/crm/visitas/page.test.tsx`, `src/app/(dashboard)/comercial/crm/acoes-prospeccao/page.tsx`, `src/app/(dashboard)/comercial/crm/acoes-prospeccao/page.test.tsx`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; testes focados `3 arquivos / 79 testes passados`; suíte completa `npm run test` → **473 arquivos / 2766 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (255/255 páginas estáticas).

---

### Sessão 35 — Automações do ciclo de vida do CRM e conversão por faturamento

- **Data:** 2026-11-22
- **Commit:** `feat(crm): automacoes de ciclo de vida e conversao por faturamento`
- **Tarefa:** centralizar as mudanças de status de Leads e Oportunidades em um único motor de automações, eliminar conversão automática implícita, exigir decisão explícita nos casos ambíguos e permitir verificar/converter leads a partir de pedidos efetivamente faturados no ERP.
- **Decisões aprovadas:** `QUALIFICADO` exige oportunidade vinculada; criar oportunidade em lead `NOVO`/`PERDIDO`/`INATIVO` qualifica automaticamente; `POSSIVEL_CLIENTE` aparece no Kanban e `CONVERTIDO_CLIENTE` fica oculto; `FECHADO_GANHO` exige pedido ERP vinculado; conversão em cliente só acontece pelo fluxo manual de faturamento; perda da última oportunidade abre modal `PERDER_LEAD` (lead `PERDIDO`, sem arquivar) ou `NOVA_OPORTUNIDADE` (rascunho automático e lead `QUALIFICADO`); `PERDIDO`/`INATIVO` recebem tarja `Arquivado`, e voltar para status ativo desarquiva.
- **Resultado:**
  - Criado `src/lib/crm/automacoes-crm.ts` com `processarAutomacaoCRM`, normalização `GANHO → FECHADO_GANHO`, bloqueios, decisões pendentes, efeitos (log, timeline, notificação, atividade comercial) e integração com `executarGatilhos` sem duplicar ações de virar cliente/criar pedido.
  - Rotas de Lead e Oportunidade (`POST/PUT/PATCH`) passaram a chamar o motor; a antiga conversão automática da rota de lead foi removida e as respostas passaram a devolver `automacao`, `avisos`, `bloqueio`, `decisaoPendente` e/ou `gatilhos`.
  - Novas APIs `POST /api/crm/pedidos-venda/verificar-faturados` e `POST /api/crm/pedidos-venda/converter-faturados`: a primeira atualiza o espelho `crm_faturamentos` e cruza `empresa/pedido` com as oportunidades; a segunda converte manualmente as leads candidatas via motor com `decisao: "CONVERTER"`.
  - Novos componentes `DecisaoAutomacaoModal` e `VerificarPedidosFaturados`, integrados ao detalhe/kanban de oportunidades, listagens de oportunidades e pedidos de venda; erro `409` com `decisaoPendente` reabre o modal e reverte o otimismo da UI.
  - Leads ganharam `arquivado`, `arquivadoEm`, `arquivadoPor` e `arquivadoPorNome` (migration `0076_leads_possivel_cliente_arquivado.sql`), filtro na API, tarja na listagem e ocultação no Kanban.
  - Modal “i” de Leads, Oportunidades e Pedidos atualizado com o novo ciclo, inclusive fonte dos faturamentos, arquivamento e motor de automações.
- **Arquivos Envolvidos:** `src/lib/crm/{automacoes-crm.ts,automacoes-crm.test.ts,status-gatilhos.ts,status-gatilhos.test.ts}`, `src/lib/db/migrations/0076_leads_possivel_cliente_arquivado.sql`, `src/lib/db/schema/crm-leads.ts`, `scripts/sync-all-dbs.js`, `src/app/api/crm/leads/**`, `src/app/api/crm/oportunidades/**`, `src/app/api/crm/pedidos-venda/verificar-faturados/**`, `src/app/api/crm/pedidos-venda/converter-faturados/**`, `src/components/crm/{decisao-automacao-modal.tsx,verificar-pedidos-faturados.tsx,automacoes-crm.test.tsx,oportunidades-kanban.tsx,leads-kanban.tsx}`, `src/app/(dashboard)/comercial/crm/{leads,oportunidades,pedidos-venda}/**`, `src/lib/info-content/{crm.ts,info-content.test.ts}`, `docs/Sessoes.md`.
- **Testes:** novos em `automacoes-crm.test.ts`, rotas `verificar-faturados`, `converter-faturados` e `oportunidades/[id]/status`, e componentes de automação; ajustes em `status-gatilhos.test.ts`, telas de leads/oportunidades/pedidos e `info-content.test.ts`. Suíte completa `npm run test` → **478 arquivos / 2781 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (257/257 páginas estáticas); `npm run db:migrate:all` aplicou as migrations no Neon e no warehouse local; `npm run db:replicar-neon` e `npm run db:verificar-local` terminaram com **0 divergências (local ⊇ Neon)**.

---

### Sessão 36 — Dashboard de leads sem visitas derivadas e saúde unificada

- **Data:** 2026-11-22
- **Commit:** `fix(crm): remove visitas derivadas no dashboard de leads`
- **Tarefa:** corrigir `/comercial/crm/leads/dashboard`, onde `Visitas R/A/C`, `Última visita` e `Próxima visita` continuavam preenchidos mesmo sem dados reais em visitas.
- **Decisão aprovada:** cada coluna mostra apenas dados reais da sua origem — ações não são espelhadas como visitas e visitas não são espelhadas como ações. Visitas reais e ações reais entram juntas no esforço, no engajamento, nos itens de engajamento e na conversão com a mesma ponderação; quando não há visitas, a coluna fica `0/0/0` e `—` nas datas.
- **Resultado:**
  - `src/lib/crm/leads-saude.ts` reescrito: removidos `acoesDerivadasDasVisitas()` e `visitasDerivadasDasAcoes()`; novo `mesclarSaudeProspeccao()` preserva visitas/ações reais e recalcula scores com `calcularScoresProspeccao()`.
  - Novos helpers unificados: `obterEngajamentoLeads()`, `calcularConversaoLeads()` (denominador `visitas reais + ações reais`), `obterDetalheScoreLeads()`, `classificarAlertaLeads()` e `filtrarClientesSaudeLeads()` (filtra status/tipo em visitas **ou** ações).
  - `ResumoConversao` ganhou `total` e `rotuloTotal` opcionais; modais compartilhados (`ConversaoModal`, `ScoreDetalheModal`, `ItensEngajamentoModal`) aceitam cálculos e textos de informação customizados sem quebrar os dashboards de visitas e ações.
  - Tabela do dashboard de leads e modais passaram a usar os helpers unificados; exportação e filtros também consideram ações reais.
  - Modal “i” do dashboard e dos modais atualizado: visitas/ações sem espelhamento, mesma métrica, mesma ponderação e conversão sobre registros de prospecção.
- **Arquivos Envolvidos:** `src/lib/crm/leads-saude.ts`, `src/lib/crm/leads-saude.test.ts`, `src/lib/crm/visitas-saude.ts`, `src/components/crm/leads/dashboard/cliente-saude-table.tsx`, `src/components/crm/visitas/dashboard/{conversao-modal,score-detalhe-modal,itens-engajamento-modal}.tsx`, `src/app/(dashboard)/comercial/crm/leads/dashboard/{page,page.test}.tsx`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** focados `7 arquivos / 114 testes passados`; suíte completa `npm run test` → **478 arquivos / 2787 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (257/257 páginas estáticas). Nenhuma migration ou mudança de banco nesta sessão.

---

### Sessão 37 — Últimas visitas e ações com contato e oportunidades

- **Data:** 2026-11-22
- **Commit:** `feat(crm): detalha ultimas visitas e acoes nos dashboards`
- **Tarefa:** nos dashboards de visitas e ações, parar de mostrar só `Visita #id` / `Ação #id` nos cards “Últimas visitas/ações” e exibir nome e documento do lead/cliente/atendimento avulso, além de informar se existe oportunidade e quantas.
- **Decisões aprovadas:** a origem do contato segue a prioridade cliente vinculado → lead → avulso, com selo `Cliente`/`Lead`/`Avulso`; o documento usa CNPJ ou CPF formatado (o atendimento avulso pode ficar sem documento). O contador usa `count(distinct crm_oportunidades.id)` sobre `cliente_id` e `lead_id` (`empresaId`) e garante no mínimo 1 quando a visita/ação tem `oportunidade_id` próprio, evitando duplicidade.
- **Resultado:**
  - `GET /api/crm/visitas/dashboard` e `GET /api/crm/acoes-prospeccao/dashboard` passaram a fazer join com `crm_leads` e `clientes` e a devolver `nome`, `documento`, `tipoEntidade`, `oportunidadeId`, `totalOportunidades` e `temOportunidade` nos 5 registros mais recentes.
  - Os cards agora mostram o nome do contato, selo de origem, documento formatado, data/hora, tipo, selo de oportunidades (`Com oportunidade (N)` / `Sem oportunidade`), status e ações de mapa; o link de edição e o modal de localização usam o mesmo nome.
  - CSV, PDF e Markdown das duas seções ganharam colunas `Nome`, `Tipo de entidade`, `Documento` e `Oportunidades`, mantendo o filtro Todas/Minhas.
  - Tipos compartilhados dos charts, testes das APIs, das duas páginas e dos modais “i” atualizados; nenhuma migration ou alteração de banco.
- **Arquivos Envolvidos:** `src/app/api/crm/{visitas,acoes-prospeccao}/dashboard/{route,route.test}.ts`, `src/app/(dashboard)/comercial/crm/{visitas,acoes-prospeccao}/dashboard/{charts.tsx,page.tsx,page.test.tsx}`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** focados `5 arquivos / 77 testes passados` (reexecutados `2 arquivos / 20 testes` após ajuste de tipo); suíte completa `npm run test` → **478 arquivos / 2787 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (257/257 páginas estáticas). Nenhuma migration ou mudança de banco nesta sessão.

---

### Sessão 33 — Modal do semáforo com métricas e cards de leads alinhados

- **Data:** 2026-11-22
- **Commit:** `feat(crm): detalha modal do semaforo e alinha cards de leads`
- **Tarefa:** ajustar o modal aberto pelos cards Quentes/Mornos/Frios: documento abaixo do nome, colunas `Oportunidades`, `Pedidos`, `Visitas` e `Ações`, com oportunidades separadas em Proposta e Negociação; alinhar os cards de Leads ao padrão já correto dos Clientes.
- **Decisões aprovadas:** `2` e `3` informados pelo usuário são quantidades, não códigos de status; o detalhe usa os rótulos padrão `Proposta`/`Negociação`; sem oportunidades a célula mostra `—`. Nenhuma migration ou novo endpoint: os contadores são derivados em SQL na listagem. A regra do semáforo e os cards de Clientes permanecem intactos.
- **Resultado:**
  - `contadoresCliente()`/`contadoresLead()` agora expõem `totalOportunidadesProposta` e `totalOportunidadesNegociacao`, ambos pela mesma base de oportunidades usada na faixa; o total de oportunidades de Clientes também passou a incluir as pessoas promovidas.
  - Os tipos de Lead/Cliente e o `itensSemaforo` das duas listagens propagam as novas contagens e as já existentes de pedidos, visitas e ações.
  - `SemaforoConversao` passou a abrir um modal `sm:max-w-5xl` com rolagem horizontal, documento abaixo do nome e as quatro colunas de métricas; a coluna de oportunidades mostra, por exemplo, `2 Proposta · 3 Negociação`.
  - Os cards de Leads ganharam `flex-1` no bloco de cadastro/contatos, badges em linha com truncamento, nome e documento truncados e grid `lg:grid-cols-3`, equalizando o alinhamento dos cards de Clientes.
  - Os “i” das faixas e das telas de CRM/Clientes explicam o novo layout do modal; testes de contadores, componente e modais de informação foram atualizados.
- **Arquivos Envolvidos:** `src/lib/crm/contadores-listagem.ts`, `src/lib/crm/contadores-listagem.test.ts`, `src/components/crm/semaforo-conversao.tsx`, `src/components/crm/semaforo-conversao.test.tsx`, `src/app/(dashboard)/comercial/crm/leads/types.ts`, `src/app/(dashboard)/comercial/crm/leads/page.tsx`, `src/app/(dashboard)/comercial/crm/leads/page.test.tsx`, `src/app/(dashboard)/comercial/clientes/types.ts`, `src/app/(dashboard)/comercial/clientes/page.tsx`, `src/app/(dashboard)/comercial/clientes/page.test.tsx`, `src/lib/info-content/{crm,comercial,info-content.test}.ts`, `docs/Sessoes.md`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; testes focados `5 arquivos / 88 testes passados`; suíte completa `npm run test` → **473 arquivos / 2758 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (255/255 páginas estáticas).

### Sessão 32 — Semáforo por mês/trimestre, status Lead/Cliente e cards de clientes completos

- **Data:** 2026-11-22
- **Commit:** `feat(crm): amplia semaforo e status de leads e clientes`
- **Tarefa:** refinar o semáforo com ganhos/pedidos do mês e do trimestre, permitir cadastrar status dos tipos `LEAD` e `CLIENTE` em `/perfil/menus`, e deixar os cards de clientes no mesmo padrão dos leads, com filtro por status, botões de ação e métricas clicáveis.
- **Decisões aprovadas:** “mês quente, trimestre morno”; ganho considera `crm_oportunidades.status` (`FECHADO_GANHO`/`GANHO`) com `updated_at`, e pedido considera `coalesce(data_emissao::timestamp, created_at)`; status cadastral continua apenas informativo e nunca define a faixa; cliente sem status usa `ATIVO`.
- **Resultado:**
  - `contadoresCliente()`/`contadoresLead()` passaram a derivar `QUENTE` de negociação, ganho no mês ou pedido no mês; `MORNO` de proposta, ganho no trimestre ou pedido no trimestre; `FRIO` dos demais casos, com prioridade `QUENTE > MORNO > FRIO`.
  - O total de pedidos dos cards passou a contar apenas pedidos vinculados às oportunidades do próprio registro (ou das pessoas promovidas, em clientes).
  - `LEAD` e `CLIENTE` foram adicionados ao cadastro de status, com `aria-label`s nos seletores; o Kanban de Leads e a tela de Leads usam status do tipo Lead, e o cadastro/edição de cliente usa status do tipo Cliente.
  - `MetricasModal` foi generalizado para lead/cliente (`empresaId`/`clienteId`), e `GET /api/crm/pedidos-venda` passou a aceitar `clienteId`, incluindo as pessoas vinculadas ao cliente.
  - Os cards de clientes agora têm filtro de status, semáforo atualizado, botões `Ver`, `Editar` e `Mapa`, e abrir métricas em modal; os textos dos “i” de CRM/Clientes e `/perfil/menus` foram atualizados.
  - Migração `0075_status_leads_clientes.sql` criada e SQL equivalente inserido em `sync-all-dbs.js`, com aplicação no Neon via `sync-principal.js` e no warehouse local via `sync-all-dbs.js`.
- **Arquivos Envolvidos:** `src/lib/crm/contadores-listagem.ts`, `src/lib/crm/faixa-conversao.ts`, `src/lib/tipos-status.ts`, `src/lib/db/schema/clientes.ts`, `src/lib/db/migrations/0075_status_leads_clientes.sql`, `scripts/sync-all-dbs.js`, `src/components/admin/cadastro-status.tsx`, `src/components/crm/leads-kanban.tsx`, `src/components/crm/leads/metricas-modal.tsx`, `src/components/crm/semaforo-conversao.tsx`, `src/app/(dashboard)/comercial/clientes/page.tsx`, `src/app/(dashboard)/comercial/clientes/[id]/page.tsx`, `src/app/(dashboard)/comercial/crm/leads/page.tsx`, `src/app/api/clientes/route.ts`, `src/app/api/clientes/[id]/route.ts`, `src/app/api/crm/pedidos-venda/route.ts`, `src/lib/info-content/{crm,comercial,outros}.ts`, testes correspondentes e `docs/Sessoes.md`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; testes focados `12 arquivos / 132 testes passados`; suíte completa `npm run test` → **473 arquivos / 2758 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run db:verificar-local` → **0 divergências (local ⊇ Neon)**; `npm run db:comparar` → estruturas idênticas.

### Sessão 31 — Semáforo clicável, lista por faixa e “i” explicativo

- **Data:** 2026-11-21
- **Commit:** `feat(crm): abre lista e info dos cards do semaforo`
- **Tarefa:** tornar os cards Quentes/Mornos/Frios clicáveis em Leads e Clientes, abrindo um modal com a lista da faixa; adicionar um “i” por card com regra e exemplos; manter os três cards com o mesmo tamanho e o número alinhado quando a descrição quebra linha.
- **Decisões aprovadas:** a lista do modal usa os mesmos registros e filtros ativos da tela (`filteredData`), sem novo endpoint; a faixa continua sendo definida apenas por `crm_oportunidades.status` (prioridade `QUENTE > MORNO > FRIO`), com oportunidades herdadas das pessoas promovidas em Clientes.
- **Resultado:**
  - `SemaforoConversao` agora recebe `itens` e `listagem`, abre o modal por clique/Enter/Espaço e impede que o clique no “i” abra a lista.
  - O modal lista nome, documento e status cadastral de cada registro, com link para o detalhe e atalho “Ver todas”; o status cadastral aparece apenas como informação, nunca como critério da faixa.
  - `itensDaFaixa()` centraliza o filtro da lista com a mesma regra de `contarFaixasConversao()` (inclusive `null`/desconhecido → Frio).
  - `semaforoConversaoInfo` traz regra, prioridade, clique, herança em clientes e exemplos práticos para cada faixa; os “i” das duas telas também passaram a explicar o clique e o “i” por card.
  - Cards com `min-h-[9rem]`, descrição `line-clamp-2` e `min-h-[2.25rem]`, e total com `mt-auto`: altura igual e número alinhado mesmo com descrição de duas linhas.
- **Arquivos Envolvidos:** `src/lib/crm/faixa-conversao.ts`, `src/components/crm/semaforo-conversao.tsx`, `src/components/crm/semaforo-conversao.test.tsx`, `src/app/(dashboard)/comercial/{crm/leads,clientes}/page.tsx`, `src/app/(dashboard)/comercial/{crm/leads,clientes}/page.test.tsx`, `src/lib/crm/contadores-listagem.test.ts`, `src/lib/info-content/{crm,comercial}.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; testes focados `5 arquivos / 87 testes passados`; suíte completa `npm run test` → **473 arquivos / 2750 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`.

### Sessão 30 — Semáforo por oportunidade e cards no padrão do BI

- **Data:** 2026-11-21
- **Commit:** `fix(crm): alinha semaforo ao padrao de cards do bi`
- **Tarefa:** reforçar que Quentes/Mornos/Frios são definidos pelo status das oportunidades vinculadas (nunca pelo status cadastral da lead/cliente), válido também para clientes, e trocar o visual dos cards para o mesmo padrão usado em `/bi/integracoes`.
- **Decisões aprovadas:** Quente = oportunidade em `NEGOCIACAO`; Morno = oportunidade em `PROPOSTA`; Frio = sem oportunidade em `NEGOCIACAO` ou `PROPOSTA`. Para clientes, entram as oportunidades do próprio cliente e as herdadas das pessoas promovidas.
- **Resultado:**
  - A consulta já usava `crm_oportunidades.status`; os textos dos cards e dos modais “i” que citavam `Novo`/`Qualificação` (status de lead) foram substituídos pela regra de oportunidade.
  - `SemaforoConversao` agora usa `corPorTitulo`/`iconePorTitulo`, gradiente Dracula, badge de ícone, linha de resumo em `divide-y`, `card-hover`, `rounded-xl` e dark mode — o mesmo padrão dos cards de BI.
  - `src/lib/dracula.ts` ganha ícones específicos para Quentes (`TrendingUp`), Mornos (`Clock`) e Frios (`TrendingDown`).
  - Testes de API/página reforçam que o SQL não referencia `crm_leads.status` nem `clientes.status`.
- **Arquivos Envolvidos:** `src/lib/crm/faixa-conversao.ts`, `src/components/crm/semaforo-conversao.tsx`, `src/lib/dracula.ts`, `src/lib/info-content/{crm,comercial}.ts`, `src/lib/crm/contadores-listagem.test.ts`, `src/components/crm/semaforo-conversao.test.tsx`, `src/app/(dashboard)/comercial/{crm/leads,clientes}/page.test.tsx`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **473 arquivos / 2743 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`.

### Sessão 29 — Correção do contexto vazio no Resumo IA

- **Data:** 2026-11-21
- **Commit:** `fix(crm): corrige contexto do resumo ia`
- **Tarefa:** corrigir resumo gerado para o cliente UG DA AMAZONIA que classificava o relacionamento como FRIO e afirmava que nome, documento, contatos, oportunidades e ações estavam vazios, embora o cadastro tivesse CNPJ, uma oportunidade `FECHADO_GANHO` e sete ações.
- **Causa raiz:** `buscarContextoResumoIA()` lia `db.execute()` como `{ rows: [...] }`, mas o driver `postgres-js` do Drizzle retorna um array de linhas; o contexto consolidado era descartado e `compilarContexto()` recebia `undefined`. A IA recebia, portanto, um cadastro integralmente vazio e seguia a instrução do prompt de dizer que não havia informação.
- **Resultado:**
  - A leitura do resultado agora aceita o `RowList` real do `postgres-js`, com fallback para o formato `rows` por compatibilidade.
  - `compilarContexto()` passa a incluir `email`, `telefone`, `celular`, `site`, `endereco` e `cep` no objeto enviado ao modelo.
  - `calcularPreenchimento()` usa apenas os campos existentes no cadastro de cliente; leads continuam com os 15 campos completos. Isso evita que um cliente preenchido apareça com 0% por campos que não existem na tabela.
  - Os testes passaram a mockar o formato real de `db.execute()` e cobrem um cliente com oportunidade `FECHADO_GANHO`, ações e dados de contato/endereço no contexto.
- **Arquivos Envolvidos:** `src/lib/crm/resumo-ia-contexto.ts`, `src/lib/crm/resumo-ia-contexto.test.ts`, `docs/Sessoes.md`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **473 arquivos / 2743 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`.

### Sessão 28 — Semáforo de conversão nas listagens de Leads e Clientes

- **Data:** 2026-11-21
- **Commit:** `feat(crm): adiciona semaforo de conversao em leads e clientes`
- **Tarefa:** trocar os rótulos “Com tarja/Sem tarja” por “Convertidos/Sem conversão” e adicionar, logo abaixo da busca, três cards com as quantidades de leads/clientes quentes, mornos e frios.
- **Decisões aprovadas:** Quente = uma ou mais oportunidades em Negociação (vermelho); Morno = oportunidade em Proposta (amarelo); Frio = Novo, Qualificação ou sem oportunidade (azul). Cada lead/cliente entra em uma única faixa, com prioridade Quente > Morno > Frio, e as contagens respeitam busca/filtros ativos na tela.
- **Resultado:**
  - `src/lib/crm/faixa-conversao.ts` centraliza o tipo `QUENTE|MORNO|FRIO`, o rol dos cards e `contarFaixasConversao`.
  - `contadoresLead()` e `contadoresCliente()` passam a devolver `faixaConversao` por SQL (CASE com `exists` para Negociação e Proposta); para clientes, a regra inclui oportunidades lançadas diretamente no cliente e as herdadas das pessoas promovidas.
  - `src/components/crm/semaforo-conversao.tsx` renderiza os três cards com rótulo textual, descrição e número colorido/direito, em light e dark.
  - As telas `/comercial/crm/leads` e `/comercial/clientes` exibem o semáforo abaixo de `ListFilters`; a exportação de leads usa “Convertidos/Sem conversão”.
  - Modais “i” das duas listagens atualizados para explicar as faixas, as cores, a prioridade e o recorte dos números.
- **Arquivos Envolvidos:** `src/app/(dashboard)/comercial/{crm/leads,clientes}/page.tsx`, `src/app/(dashboard)/comercial/{crm/leads,clientes}/types.ts`, `src/app/api/{crm/leads,clientes}/route.ts`, `src/lib/crm/{contadores-listagem,faixa-conversao}.ts`, `src/components/crm/semaforo-conversao.tsx`, `src/lib/info-content/{crm,comercial}.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** novo em `semaforo-conversao.test.tsx`; ajustes em `contadores-listagem.test.ts` (inclusive `contarFaixasConversao`), APIs de leads/clientes, páginas de leads/clientes e `info-content.test.ts`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **473 arquivos / 2742 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`.

### Sessão 27 — Resumo IA com histórico e exportação no detalhe de Lead/Cliente

- **Data:** 2026-11-21
- **Commit:** `feat(crm): gera e exporta resumo ia de leads e clientes`
- **Tarefa:** substituir o resumo pontual da lead por um card de Resumo IA com geração manual, histórico reabitável, evento na timeline e exportação em arquivo único ou separado (MD/PDF/TXT), também disponível no detalhe do cliente.
- **Decisões aprovadas:** cada geração roda a consulta consolidada (inclusive resumos anteriores); a IA devolve texto simples com classificação `QUENTE`/`MORNO`/`FRIO`; o markdown é escapado e renderizado como plain text; cada resumo vira evento `RESUMO_IA` clicável na timeline; a exportação usa `md` e `unico` como padrão; apenas a lead espelha os campos legados `resumoIa`/`sugestaoIa`/`dataResumoIa`.
- **Resultado:**
  - Nova tabela `crm_resumos_ia` (migration `0074_crm_resumos_ia.sql`), com índice por `entidade_tipo`, `entidade_id` e `created_at`; DDL replicado em `scripts/migrate.js` via `criar-tabelas-faltantes.js` e em `scripts/sync-all-dbs.js` (o `migrate.js` não executa os `.sql` numerados).
  - `GET /api/crm/ia/resumos` lista até 50 resumos; `POST /api/crm/ia/resumos` gera via `chamarIA` (`temperatura: 0`, `maxTokens: 700`), valida o JSON, salva o resumo, cria o evento de timeline e espelha o legado da lead em transação.
  - `src/lib/crm/resumo-ia-contexto.ts` consolida dados cadastrais, interações, oportunidades, propostas, visitas, ações, faturamento/pedidos, saúde dos registros e resumos anteriores com limites e truncamento; corrigido o campo `o.valor_estimado AS total`.
  - `src/lib/crm/resumo-ia-parser.ts` valida a resposta da IA; `validateRequest` agora preserva o tipo de saída de schemas zod com `transform`.
  - `src/components/crm/resumo-ia-card.tsx` controla geração, histórico, modal de leitura, seleção múltipla e exportação; `resumo-ia-export.ts` gera MD/TXT via Blob e PDF via `jspdf` dinâmico.
  - `CrmTimeline` ganhou `onAbrirResumo` e o helper `resumoIdEventoTimeline`; os detalhes de lead e cliente passam a abrir o resumo pelo evento da timeline.
  - Modais “i” do detalhe de Lead/Cliente e o normalizador de ID numérico em `getInfoContent` atualizados.
- **Arquivos Envolvidos:** `src/lib/db/schema/crm-resumos-ia.ts`, `src/lib/db/migrations/0074_crm_resumos_ia.sql`, `src/lib/db/schema/index.ts`, `src/app/api/crm/ia/resumos/route.ts`, `src/lib/{validation,crm-timeline}.ts`, `src/lib/crm/{resumo-ia-contexto,resumo-ia-parser,resumo-ia-export,href-evento-timeline}.ts`, `src/components/crm/{resumo-ia-card,crm-timeline}.tsx`, `src/app/(dashboard)/comercial/{crm/leads,clientes}/[id]/page.tsx`, `src/lib/info-content/{index,crm,comercial}.ts`, `scripts/{migrate,criar-tabelas-faltantes,sync-all-dbs}.js`, `docs/Sessoes.md`.
- **Testes:** novos em `resumo-ia-contexto.test.ts`, `resumo-ia-parser.test.ts`, `resumo-ia-export.test.ts`, `route.test.ts` (API), `resumo-ia-card.test.tsx`; `crm-timeline.test.tsx` e `info-content.test.ts` atualizados; suíte completa `npm run test` → **472 arquivos / 2740 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK; `npm run db:migrate`, `node scripts/sync-principal.js`, `npm run db:replicar-neon`, `npm run db:comparar` (`All databases are IDENTICAL`) e `npm run db:verificar-local` (0 divergências, local ⊇ Neon); `git diff --check` sem problemas.

### Sessão 20 — Histórico de conversão com Ações e Contatos no detalhe

- **Data:** 2026-11-21
- **Commit:** `fix(crm): troca propostas por acoes no historico de conversao`
- **Tarefa:** ajustar o detalhe de Lead e Cliente para que o histórico de conversão mostre Ações em vez de Propostas, e o card de Contatos ocupe o lugar do card de Visitantes no detalhe da lead.
- **Decisões aprovadas:** o rótulo do indicador no histórico é apenas **Ações** (não “Ações de prospecção”); Propostas deixa de aparecer nesse card, mas continua no restante do sistema; o card de Visitantes é removido do detalhe da lead (a listagem/rotina de visitantes permanece intacta); em Clientes, onde já não havia Visitantes, apenas o histórico é ajustado.
- **Resultado:**
  - Lead: `ContatosCard` sai do topo e passa a ocupar o primeiro lugar do grid inferior, junto de Oportunidades, Ações de Prospecção e Visitas; `VisitantesCard` é removido.
  - API do detalhe da lead passa a devolver `resumo.acoes`; o tipo `Lead` e o card de histórico foram atualizados para exibir a contagem.
  - `consultarHistoricoPromocao` e a API `/api/clientes/[id]/historico` passam a devolver `historico.acoes`; o card de histórico do cliente troca Propostas por Ações.
  - `promoverLeadParaCliente` conta/copia as ações para o cliente na promoção e inclui `acoes` no resumo, log e metadados da timeline; o toast/modal de promoção fala em oportunidades, ações e visitas.
  - Modais “i” do detalhe de Lead e Cliente atualizados para citar ações no histórico.
- **Arquivos Envolvidos:** `src/app/api/crm/leads/[id]/route.ts`, `src/app/api/crm/leads/[id]/promover-cliente/route.test.ts`, `src/app/api/clientes/[id]/historico/route.test.ts`, `src/app/(dashboard)/comercial/crm/leads/[id]/page.tsx`, `src/app/(dashboard)/comercial/crm/leads/[id]/page.test.tsx`, `src/app/(dashboard)/comercial/crm/leads/[id]/types.ts`, `src/app/(dashboard)/comercial/crm/leads/[id]/components/historico-conversao-card.tsx`, `src/app/(dashboard)/comercial/crm/leads/[id]/components/visitantes-card.tsx` (removido), `src/app/(dashboard)/comercial/clientes/[id]/components/historico-conversao-card.tsx`, `src/lib/crm/historico-promocao.ts`, `src/lib/crm/promover-cliente.ts`, `src/lib/crm/promover-cliente.test.ts`, `src/components/crm/promover-cliente-botao.tsx`, `src/lib/info-content/{crm,comercial}.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** ajustes em 6 arquivos focados (72 testes verdes), incluindo detalhe de Lead/Cliente, promoção, histórico da API e modais “i”.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **464 arquivos / 2684 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 26 — Indicadores clicáveis nos cards de leads

- **Data:** 2026-11-21
- **Commit:** `feat(crm): abre detalhes dos indicadores nos cards de leads`
- **Tarefa:** transformar as contagens de Oportunidades, Pedidos, Visitas e Ações exibidas nos cards da listagem `/comercial/crm/leads` em atalhos clicáveis, abrindo modais com os registros vinculados à lead.
- **Decisões aprovadas:** as contagens continuam sendo as mesmas já exibidas (critério `empresaId` da lead, sem mesclar o cliente); cada contagem é um botão com rótulo acessível e foco visível; um único modal genérico normaliza as respostas das quatro APIs existentes; pedidos passam a aceitar filtro `empresaId` pela oportunidade; o rodapé do modal leva ao detalhe da lead.
- **Resultado:**
  - Novo `src/components/crm/leads/metricas-modal.tsx` com `TipoMetricaLead`, estados de carregamento/erro/vazio, resumo de valores e links para oportunidade, pedido de venda, visita, ação de prospecção ou detalhe da lead.
  - `leads/page.tsx` guarda `{ lead, tipo }` no estado local e renderiza o modal uma única vez; os quatro indicadores dos cards viram botões com `aria-label`.
  - `GET /api/crm/pedidos-venda` aceita `?empresaId=` e aplica `eq(crmOportunidades.empresaId, ...)`.
  - Modal “i” da listagem explica que as contagens abrem os registros da lead.
- **Arquivos Envolvidos:** `src/components/crm/leads/metricas-modal.tsx`, `src/components/crm/leads/metricas-modal.test.tsx`, `src/app/(dashboard)/comercial/crm/leads/page.tsx`, `src/app/(dashboard)/comercial/crm/leads/page.test.tsx`, `src/app/api/crm/pedidos-venda/route.ts`, `src/app/api/crm/pedidos-venda/route.test.ts`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** teste de página cobre a abertura dos quatro modais e as URLs chamadas; teste do componente cobre normalização de pedidos, estado vazio e erro; teste da API cobre o filtro `empresaId`; modal “i” atualizado.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **467 arquivos / 2712 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 25 — Correção dos links de Atividades Recentes no dashboard CRM

- **Data:** 2026-11-21
- **Commit:** `fix(crm): corrige links de atividades recentes`
- **Tarefa:** corrigir os links do card 'Atividades Recentes' e do modal 'Ver todas' do dashboard `/comercial/crm`, que abriam `/comercial/crm/acoes-prospeccao/214` e caíam em 'Ação de Prospecção não encontrada'.
- **Decisões aprovadas:** o ID do evento de timeline nunca deve ser usado como ID da entidade; o link passa a ser resolvido pelo ID salvo em `metadados` (`acaoProspeccaoId`, `visitaId`, etc.); a mesma regra já usada pela timeline do CRM foi extraída para um helper puro e reaproveitada pelo dashboard e pelo modal; itens sem metadado válido voltam para `/comercial/crm` em vez de gerar URL quebrada.
- **Resultado:**
  - Criado `src/lib/crm/href-evento-timeline.ts` com `hrefEventoTimeline`, que aceita metadados em objeto ou JSON serializado e resolve os tipos LEAD, VISITANTE, OPORTUNIDADE, VISITA, ACAO_PROSPECCAO, TAREFA, PROPOSTA e CONVERSAO_CLIENTE.
  - `CrmTimeline` deixou de manter uma cópia local do resolvedor e passou a usar o helper compartilhado.
  - `GET /api/crm/dashboard` passa a selecionar `crmTimelineEventos.metadados` e monta `href` com o helper; visitas vindas de `crmVisitas` continuam usando o ID da visita.
  - `GET /api/crm/dashboard/detalhes?bloco=recentes` aplica a mesma regra e sintetiza `visitaId` para as visitas vindas diretamente de `crmVisitas`.
  - Modal 'i' de Atividades Recentes explica que o link usa o ID da entidade nos metadados, não o ID do evento de timeline.
- **Arquivos Envolvidos:** `src/lib/crm/href-evento-timeline.ts`, `src/lib/crm/href-evento-timeline.test.ts`, `src/components/crm/crm-timeline.tsx`, `src/app/api/crm/dashboard/route.ts`, `src/app/api/crm/dashboard/route.test.ts`, `src/app/api/crm/dashboard/detalhes/route.ts`, `src/app/api/crm/dashboard/detalhes/route.test.ts`, `src/app/(dashboard)/comercial/crm/page.test.tsx`, `src/lib/info-content/crm-dashboard.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** testes unitários do helper (incluindo metadados em JSON e ausência de link quebrado), testes das duas APIs com evento `id=214`/`acaoProspeccaoId=87`, teste da página confirmando o `href` da ação recente e teste do modal 'i'; suíte completa `npm run test` → **466 arquivos / 2707 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 24 — Ações Rápidas compactas no topo e em baixo no dashboard CRM

- **Data:** 2026-11-21
- **Commit:** `feat(crm): compacta e duplica acoes rapidas do dashboard`
- **Tarefa:** manter as Ações Rápidas no topo do dashboard `/comercial/crm`, deixar a faixa mais fina, incluir o atalho 'Nova Ação de Prospecção' e repetir a faixa ao final da página por acessibilidade.
- **Decisões aprovadas:** a mesma faixa compacta aparece acima dos seis cards de resumo e depois dos painéis, com altura reduzida (`h-7`), ícones menores e sem blocos de fundo por atalho; a duplicação permite alcançar os atalhos por teclado sem voltar ao topo; os atalhos continuam sendo links simples, sem criar dados; a nova ação aponta para `/comercial/crm/acoes-prospeccao/novo`.
- **Resultado:**
  - O componente `QuickActionsBar` é reutilizado no topo, antes do estado de carregamento e dos cards, e ao final, depois de Atividades Recentes.
  - Os seis atalhos passam a ser 'Novo Lead (Negócio)', 'Nova Oportunidade', 'Nova Ação de Prospecção', 'Kanban', 'Nova Visita' e 'Minhas Tarefas'.
  - O layout usa `flex-wrap` com `px-3 py-2`, rótulo `<h2>` inline, links `h-7` e cores com variante `dark:`; o texto dos links não quebra.
  - Modais 'i' da visão geral e das Ações Rápidas atualizados para descrever as faixas no topo e ao final, o motivo de acessibilidade e o novo atalho.
- **Arquivos Envolvidos:** `src/app/(dashboard)/comercial/crm/page.tsx`, `src/app/(dashboard)/comercial/crm/page.test.tsx`, `src/lib/info-content/crm-dashboard.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** teste das Ações Rápidas atualizado para duas faixas com seis atalhos cada, posições no topo/e ao final e `href` da nova ação; teste dos modais 'i' ampliado com 'seis atalhos', 'faixa compacta', 'topo e ao final' e 'Nova Ação de Prospecção'; suíte completa `npm run test` → **465 arquivos / 2698 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 23 — Ações realizadas e detalhes da previsão no dashboard CRM

- **Data:** 2026-11-21
- **Commit:** `feat(crm): melhora cards e detalhes do dashboard`
- **Tarefa:** mostrar Ações de Prospecção realizadas ao lado de Visitas no dashboard `/comercial/crm` e detalhar a Previsão de Receita (Pipeline) com oportunidades, totais e exportação.
- **Decisões aprovadas:** o card usa somente `crmAcoesProspeccao.status = REALIZADA`, com recortes de hoje e do mês por `dataAcao`; o modal da previsão lista oportunidades **abertas** (`status NOT IN ('FECHADO_PERDIDO','FECHADO_GANHO')`); 'Convertidas' continua com `FECHADO_GANHO`; os totais de quantidade e valor vêm da API e cobrem todos os registros do filtro, não apenas as linhas exibidas.
- **Resultado:**
  - `GET /api/crm/dashboard` passa a devolver `acoesProspeccao: { realizadas, hoje, esteMes }`, `forecastQuantidade`, `conversao.valorConvertido` e `totalPrevisaoConversao: { quantidade, valor }`.
  - O grid de resumo passa a ter seis cards, com 'Ações de Prospecção' entre Visitas e Tarefas Pendentes; o card mostra total, ações hoje e ações no mês.
  - O bloco 'Previsão & Conversão' mostra quantidade e valor das oportunidades abertas, quantidade e valor das convertidas, taxa de conversão e a soma dos dois lados; os clique em 'Previsão de Receita (Pipeline)' e 'Convertidas' abrem modais próprios.
  - `GET /api/crm/dashboard/detalhes` aceita os blocos `acoes-realizadas` e `previsao-abertas`; os blocos `previsao-*` trazem `totalRegistros` e `totalValor`, com limite padrão de 500 linhas para a exportação.
  - O modal de detalhes mostra o total no rodapé e oferece exportação CSV/JSON/PDF para os dois blocos de previsão, mantendo o link 'Ver todas'.
  - Modais 'i' da visão geral, do resumo e da previsão/conversão atualizados; foi corrigido também o helper de testes `sqlParaTexto` para renderizar operadores do Drizzle (`>=`, `NOT IN`) usados nas asserções de SQL.
- **Arquivos Envolvidos:** `src/app/api/crm/dashboard/route.ts`, `src/app/api/crm/dashboard/detalhes/route.ts`, `src/app/(dashboard)/comercial/crm/page.tsx`, `src/app/(dashboard)/comercial/crm/charts.tsx`, `src/components/crm/dashboard/detalhes-modal.tsx`, `src/lib/info-content/crm-dashboard.ts`, `src/test/route-db-mock.ts`, `docs/Sessoes.md`.
- **Testes:** ajustes e novos casos em `src/app/api/crm/dashboard/route.test.ts`, `src/app/api/crm/dashboard/detalhes/route.test.ts`, `src/app/(dashboard)/comercial/crm/page.test.tsx`, `src/app/(dashboard)/comercial/crm/charts.test.tsx`, `src/components/crm/dashboard/detalhes-modal.test.tsx` e `src/lib/info-content/info-content.test.ts`; suíte completa `npm run test` → **465 arquivos / 2698 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit --pretty false` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192` (240/240 páginas estáticas); `git diff --check` sem problemas.

---

### Sessão 22 — Corrige SQL das contagens das listagens

- **Data:** 2026-11-21
- **Commit:** `fix(crm): qualifica colunas nas contagens das listagens`
- **Tarefa:** corrigir o erro 500 de `GET /api/clientes` e `GET /api/crm/leads` introduzido pelas subconsultas de contagem da Sessão 21, que fazia a listagem de Clientes aparecer vazia.
- **Decisões aprovadas:** manter as mesmas quatro contagens e a mesma origem dos dados; corrigir apenas a qualificação dos identificadores no SQL gerado, sem alterar contrato, telas ou modais “i”.
- **Resultado:**
  - `src/lib/crm/contadores-listagem.ts` passa a qualificar a chave externa da tabela principal (`"clientes"."id"` / `"crm_leads"."id"`) e as colunas das subconsultas, inclusive o join de pedidos (`"crm_pedidos_venda"."oportunidade_id" = "crm_oportunidades"."id"`).
  - Antes, o Drizzle renderizava `"oportunidade_id" = "id"` sem qualificar as tabelas no join; como ambas têm `id`, o PostgreSQL rejeitava a consulta com `column reference "id" is ambiguous` e a API devolvia 500.
  - Teste do helper passa a afirmar a presença dos qualificadores e a ausência da forma ambígua, evitando regressão silenciosa em mocks de API.
  - Consulta real no Neon com as duas seleções finais retornou linhas normalmente (`/api/clientes` e `/api/crm/leads` voltam a popular as listagens).
- **Arquivos Envolvidos:** `src/lib/crm/contadores-listagem.ts`, `src/lib/crm/contadores-listagem.test.ts`, `docs/Sessoes.md`.
- **Testes:** focados `3 arquivos / 10 testes passados` (helper e APIs de Clientes/Leads).
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **465 arquivos / 2691 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 21 — Cards como padrão com contagens de relacionamento

- **Data:** 2026-11-21
- **Commit:** `feat(crm): define cards como padrao e troca metricas dos cards`
- **Tarefa:** tornar Cards a visualização padrão nas listagens que oferecem esse modo e substituir as métricas dos cards de Clientes e Leads por Oportunidades, Pedidos, Visitas e Ações.
- **Decisões aprovadas:** Clientes já abriam em Cards; Leads passam a abrir em Cards (Tabela e Kanban continuam disponíveis e a preferência salva/`?view=` ainda pode substituir o padrão); Oportunidades passam a abrir em Cards. Nos cards de Clientes, Solicitações e Amostras saem do card e continuam na Tabela; nos cards de Leads, o Responsável do cadastro sai do card e continua na Tabela e no detalhe.
- **Resultado:**
  - `GET /api/clientes` e `GET /api/crm/leads` passam a devolver `totalOportunidades`, `totalPedidos`, `totalVisitas` e `totalAcoes` por registro; os pedidos são contados via junção com a oportunidade vinculada.
  - Novo helper `src/lib/crm/contadores-listagem.ts` centraliza as subconsultas para cliente e lead.
  - Cards de Clientes mostram as quatro contagens no lugar dos botões de Solicitações/Amostras; Cards de Leads mostram as quatro contagens no lugar de Responsável.
  - Modal “i” das três listagens atualizado: padrão em Cards, origem das contagens e onde continuam Solicitações/Amostras e Responsável.
- **Arquivos Envolvidos:** `src/lib/crm/contadores-listagem.ts`, `src/lib/crm/contadores-listagem.test.ts`, `src/app/api/clientes/route.ts`, `src/app/api/clientes/route.test.ts`, `src/app/api/crm/leads/route.ts`, `src/app/api/crm/leads/route.test.ts`, `src/app/(dashboard)/comercial/clientes/page.tsx`, `src/app/(dashboard)/comercial/clientes/page.test.tsx`, `src/app/(dashboard)/comercial/clientes/types.ts`, `src/app/(dashboard)/comercial/crm/leads/page.tsx`, `src/app/(dashboard)/comercial/crm/leads/page.test.tsx`, `src/app/(dashboard)/comercial/crm/leads/types.ts`, `src/app/(dashboard)/comercial/crm/oportunidades/page.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/page.test.tsx`, `src/lib/info-content/{comercial,crm}.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** focados `7 arquivos / 96 testes passados`, incluindo APIs, helper de contadores, listagens e modais “i”.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **465 arquivos / 2691 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 19 — Cards em Leads e Oportunidades

- **Data:** 2026-11-21
- **Commit:** `feat(crm): adiciona visualizacao em cards em leads e oportunidades`
- **Tarefa:** incluir a visualização em cards nas listagens de Leads e Oportunidades, mantendo as três opções Cards, Tabela e Kanban nessas telas.
- **Decisões aprovadas:** manter os padrões atuais (Kanban em Leads e Tabela em Oportunidades); Cards e Tabela usam os mesmos filtros; a preferência de Leads continua salva em `localStorage`, agora aceitando `cards`.
- **Resultado:**
  - Leads: botão `Cards` adicionado ao seletor e grid de cards com razão social/nome, documento, tipo PF/PJ, tarja de cliente, status, segmento, responsável, cadastro, contato e ações (ver, editar, mapa e promover).
  - Oportunidades: botão `Cards` adicionado ao seletor e grid de cards com título, empresa/cliente, status colorido pelo cadastro, valor estimado, responsável, probabilidade, previsão, cadastro e ações (ver, editar e excluir).
  - Filtros de lista passam a valer também para Cards; Kanban mantém o comportamento atual de quadro.
  - Modal “i” das duas telas explica as três visualizações e remove a informação antiga de que Leads abriria em cards.
- **Arquivos Envolvidos:** `src/app/(dashboard)/comercial/crm/leads/page.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/page.tsx`, `src/lib/info-content/crm.ts`, `docs/Sessoes.md`.
- **Testes:** novos casos em `src/app/(dashboard)/comercial/crm/leads/page.test.tsx` e `src/app/(dashboard)/comercial/crm/oportunidades/page.test.tsx`; ajustes em `src/lib/info-content/info-content.test.ts`.
- **Verificação:** focados `3 arquivos / 73 testes passados`; `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **464 arquivos / 2685 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 18 — Top Leads separado de Top Clientes no dashboard CRM

- **Data:** 2026-11-21
- **Commit:** `fix(crm): separa top leads de top clientes no dashboard`
- **Tarefa:** garantir que o painel `Top Leads (Negócios)` mostre somente leads e que o `Top Clientes` mostre somente clientes no dashboard `/comercial/crm`.
- **Decisões aprovadas:** lead promovida a cliente deixa de aparecer no Top Leads; negócio com `clienteId` preenchido na oportunidade ou na lead também sai do Top Leads e é contado no Top Clientes via `COALESCE(crm_oportunidades.clienteId, crm_pessoas.clienteId)`, mantendo a regra de que pessoa promovida é cliente.
- **Resultado:**
  - API `/api/crm/dashboard`: `topEmpresas` agora usa `INNER JOIN` com `crm_leads`, exige `empresaId`, `clienteId` nulo na oportunidade, `clienteId` nulo na lead e `promovidaCliente = false`; o payload não expõe mais `clienteNome` nesse bloco.
  - API `/api/crm/dashboard/detalhes`: `listarTopLeads()` aplica os mesmos filtros, remove o fallback para cliente e o rodapê `Ver todas` passa a abrir `/comercial/crm/leads`; `listarTopClientes()` permanece com a resolução `COALESCE` para clientes diretos e promovidos.
  - Tela `/comercial/crm`: o card Top Leads usa apenas `empresaNome` e link para `/comercial/crm/leads/[id]`, sem recair para nome/link de cliente.
  - Modal “i” do dashboard explica a separação, os campos `clienteId`/`promovidaCliente` e o exemplo de oportunidade que sai do Top Leads e entra no Top Clientes.
- **Arquivos Envolvidos:** `src/app/api/crm/dashboard/route.ts`, `src/app/api/crm/dashboard/detalhes/route.ts`, `src/app/(dashboard)/comercial/crm/page.tsx`, `src/lib/info-content/crm-dashboard.ts`, `src/test/route-db-mock.ts`, `docs/Sessoes.md`.
- **Testes:** novos/ajustados em `src/app/api/crm/dashboard/route.test.ts`, `src/app/api/crm/dashboard/detalhes/route.test.ts`, `src/app/(dashboard)/comercial/crm/page.test.tsx` e `src/lib/info-content/info-content.test.ts`.
- **Verificação:** focados `4 arquivos / 63 testes passados`; `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **464 arquivos / 2681 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

---

### Sessão 17 — Dashboard de Leads com saúde de visitas e ações lado a lado

- **Data:** 2026-11-21
- **Commit:** `feat(crm): reorganiza dashboards de visitas, acoes e leads`
- **Tarefa:** renomear o Dashboard de Visitas, remover o card de saúde da prospecção dos dashboards de visitas e ações e criar `/comercial/crm/leads/dashboard` com visitas e ações lado a lado, usando a mesma métrica R/A/C.
- **Decisões aprovadas:** a saúde da prospecção passa a viver somente no Dashboard de Leads; o atalho `Saúde da Prospecção` dos dashboards de visitas e ações aponta para a nova rota; `/comercial/crm/acoes-prospeccao/dashboad` foi interpretado como a rota existente `/dashboard`.
- **Resultado:**
  - `visitas/dashboard` passa a se chamar **Dashboard de Visitas**, sem card/query/estados de saúde; atalho leva ao Dashboard de Leads.
  - `acoes-prospeccao/dashboard` espelha o dashboard de visitas, sem card de saúde; atalho leva ao Dashboard de Leads.
  - Corrigido o contrato da API de ações: `porGerente[].visitas` → `porGerente[].acoes`, alinhado ao tipo usado pelos gráficos.
  - Novo `/comercial/crm/leads/dashboard` com filtro Todas/Minhas, tabela `Saúde da prospecção por cliente/pessoa`, colunas **Visitas R/A/C** e **Ações R/A/C** adjacentes, exportações CSV/PDF/MD e modais existentes.
  - `src/lib/crm/leads-saude.ts` mescla as APIs de saúde por `tipo:id` e deriva a métrica ausente para manter as duas colunas sempre preenchidas com a mesma base.
  - Cards AEC/Engajados/EQL/BEC, itens de engajamento, conversão e scores reaproveitam os componentes existentes; modais “i” e menus atualizados.
- **Arquivos Envolvidos:** `src/app/(dashboard)/comercial/crm/{visitas/dashboard,acoes-prospeccao/dashboard,leads/dashboard}/**`, `src/lib/crm/leads-saude.ts`, `src/components/crm/leads/dashboard/cliente-saude-table.tsx`, `src/app/api/crm/acoes-prospeccao/dashboard/route.ts`, `src/lib/info-content/crm.ts`, `src/lib/search-registry.ts`, `scripts/seed-crm-menus.sql`.
- **Testes:** novos em `src/lib/crm/leads-saude.test.ts` e `src/app/(dashboard)/comercial/crm/leads/dashboard/page.test.tsx`; atualizados em `visitas/dashboard/page.test.tsx`, `acoes-prospeccao/dashboard/page.test.tsx`, `acoes-prospeccao/dashboard/route.test.ts` e `info-content.test.ts`.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; suíte completa `npm run test` → **464 arquivos / 2677 testes passados**; `npm run build` OK com `NODE_OPTIONS=--max-old-space-size=8192`; `git diff --check` sem problemas.

### Sessão 16 — Ações rápidas enxutas, cards clicáveis, IA na timeline e Top Clientes

- **Data:** 2026-11-21
- **Commit:** `feat(crm): refina acoes rapidas, cards e IA da timeline`
- **Tarefa:** manter apenas os atalhos essenciais em `/comercial/crm`; melhorar os detalhes de cliente e lead com cards clicáveis, análise/chat de IA sobre a timeline e busca de CNPJ; adicionar painel de Top Clientes ao lado de Top Leads.
- **Decisões aprovadas:** em Ações Rápidas manter somente `Novo Lead (Negócio)`, `Nova Oportunidade`, `Kanban`, `Nova Visita` e `Minhas Tarefas`; alterar clientes **e** leads; cards como visualização padrão com lista/tabela disponível; remover o card de Propostas dos detalhes; IA somente leitura, autenticada e com o conteúdo da timeline tratado como dado; filtros por `clienteId` incluem pessoas promovidas.
- **Resultado:**
  - Dashboard: ações rápidas reduzidas a cinco atalhos; novo painel `Top Clientes` com nome, valor total, valor em aberto, oportunidades e conversão (`X convertidas de Y`), link direto para o cliente e modal de detalhe `top-clientes`.
  - API do dashboard: `topClientes` usa `COALESCE(crm_oportunidades.clienteId, crm_pessoas.clienteId)` para somar negócio direto e herdado; detalhes passam a aceitar o bloco `top-clientes`.
  - Detalhes de cliente e lead: cards de Contatos, Representantes, Oportunidades, Ações de Prospecção e Visitas; nomes e itens com link para o cadastro de origem; Propostas removido dessas telas; Histórico de conversão ajustado para oportunidades e visitas.
  - Timeline clicável: ícones/labels para visitante, ação de prospecção e conversão em cliente; links para lead, oportunidade, visita, ação, tarefa, proposta e conversão; WhatsApp e solicitação permanecem como texto.
  - IA: `POST /api/crm/ia/timeline-chat` com `requireAuth`, zod, até 200 eventos, contexto delimitado por marcadores e instruções para ignorar comandos embutidos; componente `TimelineIaChat` com geração de análise e chat no detalhe de clientes/leads.
  - CNPJ: `Consultar` em clientes/novo e `Buscar CNPJ` em clientes; modal passa a aceitar `tipo: "cliente"`, mostra clientes já cadastrados e cria novo cliente com os dados da Receita Federal.
  - APIs `acoes-prospeccao` e `visitas`: param `clienteId` agora considera `idsPessoasDoCliente` com `inArray` em `empresaId`.
  - Modais “i” de CRM, clientes e dashboard atualizados, incluindo novos cards, IA, CNPJ e Top Clientes; sem alteração de schema.
- **Arquivos Envolvidos:** `src/app/(dashboard)/comercial/crm/page.tsx`, `src/app/api/crm/dashboard/{route.ts,detalhes/route.ts}`, `src/app/(dashboard)/comercial/clientes/{page.tsx,novo/page.tsx,[id]/page.tsx}`, `src/app/(dashboard)/comercial/crm/leads/{page.tsx,novo/page.tsx,[id]/page.tsx}`, `src/app/(dashboard)/comercial/crm/leads/[id]/components/{contatos-card.tsx,representantes-card.tsx}`, `src/components/crm/{buscar-cnpj-modal.tsx,crm-timeline.tsx,timeline-ia-chat.tsx,contatos-vinculados-card.tsx,representantes-vinculados-card.tsx,acoes-prospeccao-card.tsx,visitas-card.tsx}`, `src/app/api/crm/ia/timeline-chat/route.ts`, `src/app/api/crm/{acoes-prospeccao,visitas}/route.ts`, `src/lib/info-content/{crm,comercial,crm-dashboard}.ts`.
- **Testes:** novos/ajustados em páginas de CRM, clientes e leads, modal CNPJ, cards compartilhados, timeline, rota IA, APIs dashboard/ações/visitas e `info-content.test.ts`; focado `5 arquivos / 62 testes` após correções de tipo; suíte completa `npm run test` → **462 arquivos / 2673 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes); `tsc --noEmit` limpo com `NODE_OPTIONS=--max-old-space-size=8192`; `npm run build` OK com 254 páginas estáticas.

### Sessão 15 — Dashboard clicável e documentos CPF/CNPJ normalizados

- **Data:** 2026-11-20
- **Tarefa:** transformar cards, gráficos e painéis do dashboard `/comercial/crm` em atalhos para modais de detalhe, com link por registro e “Ver todas” para as listagens; normalizar CPF/CNPJ em leads/clientes, aceitando somente documentos pontuados e eliminando duplicatas por dígitos.
- **Decisões aprovadas:** modal para todos os blocos do dashboard; Pipeline com `Leads`, `Oportunidades` e `Convertidas` (sem Propostas); “Sem nome” de oportunidades sem lead resolve para o cliente; atividades recentes incluem ações de prospecção e visitas; tarefas sem rota `[id]` abrem a listagem com `?busca=`; CNPJ válido tem 14 dígitos e CPF 11, sem validação de dígitos verificadores; CNPJ pontuado é canônico na mesclagem de duplicatas.
- **Resultado:**
  - Criado `src/lib/documento.ts` (`digitosDocumento`, `formatarDocumento`, `validarDocumento`, `documentoEstaPontuado`) e `scripts/normalizar-documentos.js`, executado com `--apply` em Neon e warehouse local, com backup JSON e 0 duplicatas após a correção.
  - APIs de leads/clientes/importação/promoção passaram a validar, pontuar e checar duplicatas por `regexp_replace(documento, '\D', '', 'g')`; formulários e quick-creates aplicam a mesma máscara.
  - Migration `0073_documentos_normalizados.sql` adiciona índices funcionais e normaliza descrições de ações de prospecção no timeline; SQL replicado por `sync-all-dbs.js` e `sync-principal.js`.
  - Criado `GET /api/crm/dashboard/detalhes` com allowlist de blocos e `src/components/crm/dashboard/detalhes-modal.tsx`; cards, barras do funil, status e “Ver todas” abrem o modal com links para os cadastros.
  - `topEmpresas`, `recentes` e o payload do dashboard foram ajustados para mostrar cliente quando o lead não existe e para incluir ações de prospecção/visitas.
  - Modal “i” do dashboard atualizado com origem, cálculo e exemplos das novas interações.
- **Arquivos Envolvidos:** `src/lib/documento.ts`, `scripts/normalizar-documentos.js`, `src/lib/db/migrations/0073_documentos_normalizados.sql`, `scripts/{migrate.js,sync-all-dbs.js}`, APIs `src/app/api/{crm/leads,clientes,cadastros/clientes}/**`, `src/lib/crm/promover-cliente.ts`, formulários de leads/clientes, `src/components/crm/quick-create-{lead,cliente}.tsx`, `src/app/(dashboard)/comercial/crm/{page.tsx,charts.tsx}`, `src/app/api/crm/dashboard/{route.ts,detalhes/route.ts}`, `src/components/crm/dashboard/detalhes-modal.tsx` e `src/lib/info-content/crm-dashboard.ts`.
- **Testes:** novos/ajustados em `documento.test.ts`, rotas de leads/clientes/detalhes, modal, `page.test.tsx`, `charts.test.tsx` e `info-content.test.ts`; suíte completa `npm run test` → **453 arquivos / 2629 testes passados**.
- **Verificação:** `npm run lint` sem erros (apenas warnings pré-existentes), `tsc --noEmit` limpo, `npm run build` OK; `db:verificar-local` (**0 divergências, local ⊇ Neon**) e `db:comparar` (`All databases are IDENTICAL`).

### Sessão 14 — Dashboard CRM, recorte padrão e acesso comercial

- **Data:** 2026-11-20
- **Commit:** `feat(crm): ajusta dashboard e permissoes comerciais`
- **Tarefa:** remover do dashboard `/comercial/crm` somente os cards de Visitantes, Propostas, Campanhas e Emails Enviados; adicionar botão de informação em todos os blocos do dashboard; abrir visitas e ações de prospecção sempre no recorte “Todas”; conceder acesso total de ver/editar/deletar aos perfis COMERCIAL e CRM, incluindo Clientes e Representantes.
- **Decisões aprovadas:** manter atalhos, consultas/JSON da API e barras do funil dos domínios removidos; “i” no H1, KPIs restantes, gráficos, Top Leads, Atividades Recentes e Ações Rápidas; acesso total para `ADMIN`, `SUDO`, `COMERCIAL` e `CRM`; áreas administrativas sensíveis permanecem restritas a `ADMIN`/`SUDO`.
- **Resultado:**
  - `src/lib/permissoes.ts` centraliza `ROLES_ACESSO_TOTAL`, `podeGerenciarTudo` e `podeGerenciarRegistro`; APIs e UI passaram a usar o helper, preservando autenticação e transações.
  - `roleEhAdministrativa` agora usa o helper, liberando “Proposta Vinculada” para COMERCIAL/CRM sem alterar o banco.
  - Menus role-based de COMERCIAL e CRM receberam `Clientes` (`/comercial/clientes`) e `Representantes` (`/cadastros/representantes`); seed, `migrate.js`, `sync-all-dbs.js` e `seed-crm-menus.sql` atualizados. Após `sync-all-dbs.js` + `sync-principal.js`: `user_menu_itens` Neon=368, local=376.
  - `src/lib/info-content/crm-dashboard.ts` concentra os textos de cada bloco com origem dos dados, regra/cálculo e exemplo; `InfoButton` aceita `label?` para acessibilidade.
  - Dashboard mantém 5 KPIs, 3 gráficos, 2 painéis, Ações Rápidas e todo o payload da API; o “i” dos cards clicáveis usa `stopPropagation` para não navegar.
- **Arquivos Envolvidos:** `src/lib/{permissoes.ts,info-content/crm-dashboard.ts,info-content/crm.ts,campos-visiveis/catalogo.ts,db/seed.ts}`, `src/app/api/**`, `src/app/(dashboard)/comercial/crm/**`, `src/components/ui/info-button.tsx`, `scripts/{migrate.js,sync-all-dbs.js,seed-crm-menus.sql}`.
- **Testes:** novos em `permissoes.test.ts`, `crm-dashboard`/`info-content.test.ts`, `charts.test.tsx`, `info-button.test.tsx` e rotas de API/UI; suíte completa `npm run test` → **448 arquivos / 2611 testes passados**.
- **Verificação:** `npm run lint` sem erros, `tsc --noEmit` limpo, `npm run build` OK; `db:verificar-local` (**0 divergências, local ⊇ Neon**) e `db:comparar` (`All databases are IDENTICAL`).

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

### Sessão 45 — Classificação do Resumo IA passa a ser canônica (QUENTE/MORNO/FRIO)

- **Data:** 2026-11-23
- **Commit:** `11df1f80` (anterior) + `c1721112` — `fix(crm): Resumo IA usa classificação canônica do sistema`
- **Tarefa:** corrigir divergência em que o Resumo IA classificava como FRIO enquanto o sistema classificava como QUENTE (exemplo: cliente 17, pedido `00007095` emitido em 18/11/2026, status `ABERTO`).
- **Resultado:**
  - `src/lib/crm/resumo-ia-contexto.ts`: `ContextoResumoIA` ganha `temperatura` calculada com `faixaConversaoSql("lead"|"cliente")` (mesma regra do semáforo/kanban), `motivo` detalhado e flags canônicas (`temNegociacao`, `temProposta`, `temGanhoMes`, `temPedidoMes`, etc.); `montarMensagensResumo` manda a IA copiar a classificação/motivo e não reclassificar; status do pedido (`ABERTO`/`FATURADO`) não altera a faixa.
  - `src/app/api/crm/ia/resumos/route.ts`: sobrescreve `classificacao`/`motivoClassificacao` da IA com os valores calculados antes de salvar resumo, evento de timeline e espelhamento da lead.
  - `src/lib/crm/resumo-ia-contexto.test.ts`, `src/app/api/crm/ia/resumos/route.test.ts`, `src/lib/info-content/info-content.test.ts` atualizados.
  - `src/lib/info-content/crm.ts` e `src/lib/info-content/comercial.ts`: modais “i” de lead e cliente atualizados (exemplos baseados em oportunidade/pedido do mês, não em recência de contato).
  - `scripts/corrigir-classificacao-resumos-ia.js`: backfill idempotente com `--dry-run` padrão e `--apply` para gravar; corrige `crm_resumos_ia` e eventos `RESUMO_IA` da timeline nos dois bancos; id 6 corrigido para **QUENTE**.
- **Arquivos Envolvidos:** `src/lib/crm/resumo-ia-contexto.ts`, `src/lib/crm/resumo-ia-contexto.test.ts`, `src/app/api/crm/ia/resumos/route.ts`, `src/app/api/crm/ia/resumos/route.test.ts`, `src/lib/info-content/{crm,comercial}.ts`, `src/lib/info-content/info-content.test.ts`, `scripts/corrigir-classificacao-resumos-ia.js`, `docs/Sessoes.md`.
- **Testes:** `npm run test` → 491 arquivos / 2884 testes passados; `tsc --noEmit` limpo; `next build` OK; `next lint` apenas warnings pré-existentes.

---

### Sessão 46 — Verificar pedido faturado sincroniza valor do pedido, vincula faturamento, ganha oportunidade e converte lead

- **Data:** 2026-11-23
- **Commits:** dgbcomex `8162523d` — `feat(crm): verificar pedido faturado sincroniza valor do pedido e vincula faturamento`, `6a8cb200` — `fix(crm): backfill valor_estimado de oportunidades com pedidos ERP vinculados`; api-microdata `e792c53` — `feat(crm): filtro pedido_origem em faturamentos para vincular nota ao pedido do ERP`
- **Tarefa:** implementar “Verificar faturados” para sincronizar o valor do pedido do ERP (não da nota), vincular/gerar o faturamento da nota real na oportunação e no pedido de venda, marcar oportunidade como Fechado Ganho e converter a lead, tudo após confirmação.
- **Resultado:**
  - Migration `0080_faturamentos_pedido_venda.sql`: adiciona `crm_faturamentos.pedido_venda_id` (FK para `crm_pedidos_venda`, `ON DELETE SET NULL`), índice e backfill de faturamentos existentes; aplicada no Neon e warehouse local via `scripts/apply-drizzle-migrations.js`.
  - `src/lib/db/schema/crm-faturamentos.ts`: adiciona `pedidoVendaId`.
  - `src/lib/crm/erp-espelho.ts`: mantém `itensParaCrm` para pedidos e adiciona `itensParaCrmFaturamento` (usa `descricao` como produto nas notas).
  - `src/lib/crm/verificar-pedido-faturado.ts`: preview e aplicação. Pré-condição: pedido vinculado; sem pedido avisa “Vincule ou lance um pedido com o mesmo número de pedido do ERP.”. Sincroniza espelho de pedidos, recalcula `valor_estimado` da oportunidade como soma de todos os pedidos vinculados, cria/atualiza faturamento com `pedido_venda_id`, status `FATURADO`/`PARCIAL` (pergunta no modal para parcial), automação `FECHADO_GANHO` e conversão da lead.
  - `src/app/api/crm/pedidos-venda/verificar-faturados/route.ts`: vira preview (`POST` com `pedidoId`/`pedidoIds`/`oportunidadeId`).
  - `src/app/api/crm/pedidos-venda/aplicar-faturados/route.ts`: nova rota de aplicação após confirmação (`aplicar: true`).
  - `src/app/api/crm/oportunidades/[id]/vinculos/route.ts`: ao vincular pedido, atualiza `valor_estimado` com soma dos pedidos; ao vincular faturamento, preenche `pedidoVendaId`.
  - `api-microdata` `app/src/api/routers/crm.py`: filtro `pedido_origem` em `GET /crm/faturamentos` para localizar nota pelo `nosso_pedido`; teste em `app/tests/test_crm.py`.
  - `src/components/crm/verificar-pedidos-faturados.tsx`: reescrito com preview (valores antes/depois, nota, diferença, status parcial) e aplicação; sem botão de conversão separada.
  - UI: botão “Verificar faturados” no cabeçalho do detalhe da oportunidade (visível também com `?edit=true`) e no detalhe do pedido; removido botão “Vincular do ERP” do card Faturamentos; mantido no card Pedidos.
  - `src/lib/info-content/crm.ts` e `src/lib/info-content/info-content.test.ts` atualizados.
  - Testes novos/atualizados: rotas verificar/aplicar, componente, lib preview, vinculos, info-content.
- **Arquivos Envolvidos:** `src/lib/db/migrations/0080_faturamentos_pedido_venda.sql`, `src/lib/db/schema/crm-faturamentos.ts`, `src/lib/crm/erp-espelho.ts`, `src/lib/crm/verificar-pedido-faturado.ts`, `src/lib/crm/verificar-pedido-faturado.test.ts`, `src/components/crm/verificar-pedidos-faturados.tsx`, `src/components/crm/verificar-pedidos-faturados.test.tsx`, `src/components/crm/automacoes-crm.test.tsx`, `src/app/api/crm/pedidos-venda/verificar-faturados/route.ts`, `src/app/api/crm/pedidos-venda/verificar-faturados/route.test.ts`, `src/app/api/crm/pedidos-venda/aplicar-faturados/route.ts`, `src/app/api/crm/pedidos-venda/aplicar-faturados/route.test.ts`, `src/app/api/crm/oportunidades/[id]/vinculos/route.ts`, `src/app/api/crm/oportunidades/[id]/vinculos/route.test.ts`, `src/app/(dashboard)/comercial/crm/oportunidades/[id]/page.tsx`, `src/app/(dashboard)/comercial/crm/pedidos-venda/[id]/page.tsx`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `M:\dev\api-microdata\app\src\api\routers\crm.py`, `M:\dev\api-microdata\app\tests\test_crm.py`, `docs/Sessoes.md`.
- **Testes:** `npm run test` → 494 arquivos / 2892 testes passados; `tsc --noEmit` limpo; `next build` OK; `next lint` apenas warnings pré-existentes; `pytest app/tests/test_crm.py` 17 passou; `apply-drizzle-migrations.js` aplicou 0080 nos dois bancos; `db:comparar` IDENTICAL; `db:verificar-local` mostra divergências pré-existentes de dados (logs/notificações/pedidos CRM) não relacionadas a esta mudança.

### Sessão 47 — Vincular faturado: vincular pedido já faturado e processar nota real

- **Data:** 2026-11-23
- **Commits:** `acc7c9fa` (correção faturamento traz valor da nota), `a8089050` (botão Vincular faturado), `f327c080`, `54060876`, `cadfa561`, `31bf5b2e`, `ce0d1408`, `cccb4d3a`, `9402834e`, `c956ebd4` (filtros, resiliência da busca e layout responsivo) e `bba954f0` (redeploy Vercel).
- **Tarefa:** criar botão “Vincular faturado” no detalhe da oportunidade que pede o código do pedido, busca notas faturadas pelo `pedido_origem` (`nosso_pedido`), vincula o pedido ao CRM e executa o fluxo do “Verificar faturados” (espelho do pedido, faturamento com itens/valor da nota, valor estimado, status, automações).
- **Resultado:**
  - `src/lib/crm/erp-espelho.ts`: `itensParaCrmFaturamento` agora soma `valor_total + acrescimo_desconto`; adicionado `criarPedidoEspelho` (exportado) para criar/validar duplicidade do espelho do pedido.
  - `src/lib/crm/verificar-pedido-faturado.ts`: `NotaPrevista` expõe `empresa`/`pedido`/`pedidoOrigem`; `obterNotaERP` retorna esses campos; `criarOuAtualizarFaturamento` aceita `pedidoReferencia`/`pedidoErp`; usa o campo `pedido` da nota para o detalhe do faturamento; exporta `somaItensPedido`/`somaOportunidade`.
  - `src/lib/crm/vincular-faturado.ts`: novo. `buscarNotasFaturadasPorPedido`, `previewVincularFaturado`, `aplicarVinculacaoFaturado`. Busca notas por `pedido_origem`, cria/valida pedido vinculado, recalcula `valor_estimado`, vincula faturamento com `pedido_venda_id`, status `FATURADO`/`PARCIAL`, conversão da lead e `FECHADO_GANHO`.
  - `src/app/api/crm/oportunidades/[id]/vincular-faturado/route.ts`: nova rota `POST` com preview (`aplicar` ausente/falso) e aplicação (`aplicar: true`).
  - `src/components/crm/vincular-faturado.tsx`: novo componente com modal, input do código, lista de notas, escolha de nota/status e aplicação.
  - `src/app/(dashboard)/comercial/crm/oportunidades/[id]/page.tsx`: botão “Vincular faturado” no cabeçalho e no card Pedidos de Venda; modal controlado por `vincularFaturado`.
  - `src/lib/info-content/crm.ts` e `src/lib/info-content/info-content.test.ts` atualizados (inclui “Vincular faturado”, corrige lista de pedidos e mensagem do modal).
- **Arquivos Envolvidos:** `src/lib/crm/erp-espelho.ts`, `src/lib/crm/verificar-pedido-faturado.ts`, `src/lib/crm/vincular-faturado.ts`, `src/lib/crm/vincular-faturado.test.ts`, `src/app/api/crm/oportunidades/[id]/vincular-faturado/route.ts`, `src/app/api/crm/oportunidades/[id]/vincular-faturado/route.test.ts`, `src/components/crm/vincular-faturado.tsx`, `src/components/crm/vincular-faturado.test.tsx`, `src/app/(dashboard)/comercial/crm/oportunidades/[id]/page.tsx`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** `npm run test` suíte verde; `tsc --noEmit` limpo; `next build` OK.

### Sessão 48 — Pedido real do ERP separado da nota, faturamento N:N e vínculo de todos os pedidos da nota

- **Data:** 2026-11-24
- **Commits:** dgbcomex `bd186738` — `feat(crm): separa pedido real da nota e vincula faturamento N:N`; api-microdata `f762905` — `feat(crm): expõe pedido faturado e pedidos da nota via ERP`
- **Tarefa:** corrigir a separação entre pedido e nota/faturamento do ERP, ler o pedido faturado diretamente do ERP (sem montá-lo a partir da nota), permitir que uma nota fatura múltiplos pedidos e preparar a base para o índice diferencial no dashboard.
- **Resultado:**
  - `M:\dev\api-microdata\app\src\api\routers\crm.py`: novo `GET /crm/pedidos-faturados/{empresa}/{pedido}` lê `Car_Pedido`/`Car_Itens_Pedido` direto do ERP e retorna no formato `PedidoErp`; novo `GET /crm/faturamentos/{empresa}/{pedido}/{nr_nota}/pedidos` lista todos os `nosso_pedido` da nota; `SQL_FATURAMENTO_ITENS` passou a buscar os itens da nota por `nr_nota`, cobrindo notas com mais de uma linha em `Fat_Pedido`.
  - `M:\dev\dgbcomex\src\lib\erp\tipos.ts`: `PedidoErp` ganha `pedido_origem`; `M:\dev\dgbcomex\src\lib\erp\cliente.ts`: helpers `buscarPedidoFaturadoErp` e `buscarPedidosDaNotaErp`.
  - `M:\dev\dgbcomex\src\lib\crm\erp-espelho.ts`: detalhes de `PEDIDO` passam a usar `/crm/pedidos-faturados/...`; `criarPedidoEspelho` aceita documento ERP fornecido.
  - `M:\dev\dgbcomex\src\lib\crm\verificar-pedido-faturado.ts`: novo `garantirPedidoErpVinculado`, `obterPedidosVinculados` com `inArray`, `criarOuAtualizarFaturamento` com `pedidoVendaIds[]` e sincronização da tabela N:N; por nota, todos os pedidos do ERP são vinculados à oportunidade e o status é `FATURADO`/`PARCIAL` pela comparação entre valor da nota e soma dos pedidos.
  - `M:\dev\dgbcomex\src\lib\crm\vincular-faturado.ts`: preview e aplicação agora leem os pedidos reais do ERP, mostram todos os pedidos da nota, preservam o campo legado `pedidoVendaId` e gravam o vínculo N:N.
  - `M:\dev\dgbcomex\src\lib\db\schema\crm-faturamento-pedidos.ts`, migration `0081_crm_faturamento_pedidos_nn.sql`, `sync-all-dbs.js` e `criar-tabelas-faltantes.js`: tabela `crm_faturamento_pedidos` com PK `(faturamento_id, pedido_venda_id)`, FKs, índice e backfill do legado.
  - `M:\dev\dgbcomex\src\components\crm\vincular-faturado.tsx`: modal mostra cada pedido do ERP que compõe a nota, valores dos pedidos e da nota, e permite reaplicar vínculos sem bloquear mensagens informativas; só bloqueia pedido já vinculado a outra oportunidade.
  - `M:\dev\dgbcomex\src\lib\info-content\crm.ts` e `src/lib/info-content/info-content.test.ts`: textos obsoletos (“pedido montado a partir da nota”) removidos; modal agora explica pedido real do ERP, nota separada e relacionamento N:N.
- **Arquivos Envolvidos:** `M:\dev\api-microdata\app\src\api\routers\crm.py`, `M:\dev\api-microdata\app\tests\test_crm.py`, `src/lib/erp/cliente.ts`, `src/lib/erp/tipos.ts`, `src/lib/crm/erp-espelho.ts`, `src/lib/crm/erp-espelho.test.ts`, `src/lib/crm/verificar-pedido-faturado.ts`, `src/lib/crm/vincular-faturado.ts`, `src/lib/crm/vincular-faturado.test.ts`, `src/components/crm/vincular-faturado.tsx`, `src/components/crm/vincular-faturado.test.tsx`, `src/app/api/crm/oportunidades/[id]/vincular-faturado/route.test.ts`, `src/lib/db/schema/crm-faturamento-pedidos.ts`, `src/lib/db/schema/index.ts`, `src/lib/db/migrations/0081_crm_faturamento_pedidos_nn.sql`, `scripts/sync-all-dbs.js`, `scripts/criar-tabelas-faltantes.js`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** dgbcomex: `npx.cmd vitest run` → 497 arquivos / 2905 testes passados; `tsc --noEmit` limpo; `npm run build` OK; `npm run lint` apenas warnings pré-existentes. api-microdata: `app\.venv\Scripts\python.exe -m pytest -q` em `M:\dev\api-microdata\app` → 383 passou; `app\.venv\Scripts\python.exe -m ruff check src/api/routers/crm.py tests/test_crm.py` limpo. Banco: `npm.cmd run db:migrate`, `npm.cmd run db:replicar-neon`, `npm.cmd run db:comparar` (`All databases are IDENTICAL`; único aviso pré-existente: definição do índice `idx_whatsapp_fila_status` no warehouse local) e `npm.cmd run db:verificar-local` (`✓ CRITÉRIO DE ACEITE ATINGIDO: 0 divergências (local ⊇ Neon)`, 8 tabelas com linhas a mais no local permitidas).

### Sessão 49 — Busca de faturados passa a ler o ERP ao vivo (00007094)

- **Data:** 2026-11-24
- **Commits:** api-microdata `e35d934` — `feat(crm): busca faturamentos direto no ERP`; lado app consolidado em `942550d6` (helper `buscarFaturamentosPorPedido` e testes)
- **Tarefa:** o botão "Buscar faturados" e o "Verificar faturados" não encontravam o pedido `00007094`, embora a nota `012830` existisse no ERP. A busca dependia do warehouse `raw.fat_pedido`, que estava desatualizado; além disso, a api-microdata on-prem rodava uvicorn antigo e devolvia `404 {"detail":"Not Found"}` nas rotas novas.
- **Resultado:**
  - `M:\dev\api-microdata\app\src\api\routers\crm.py`: novo `GET /crm/faturamentos-por-pedido/{pedido}` lê `dbo.Fat_Pedido` direto do ERP por `Nosso_Pedido`, com filtro opcional de empresa e o mesmo contrato de `FaturamentoErp`; `GET /crm/faturamentos/{empresa}/{pedido}/{nr_nota}/pedidos` também passou a ler `dbo.Fat_Pedido`, deixando de depender do sync do warehouse.
  - `M:\dev\dgbcomex\src\lib\erp\cliente.ts`: novo helper `buscarFaturamentosPorPedido` usa a rota ERP-direta primeiro e só cai para `/crm/faturamentos?pedido_origem=...` se a api-microdata antiga responder 404.
  - `M:\dev\dgbcomex\src\lib\crm\vincular-faturado.ts` e `src/lib/crm/verificar-pedido-faturado.ts`: os dois fluxos passam a usar o helper, sem depender de `raw.fat_pedido` atualizado. A busca de pedidos da nota agora recebe `pedido_origem` em vez do número interno da nota.
  - `M:\dev\dgbcomex\src\lib\erp\cliente.test.ts`: testes do helper (ERP primeiro, fallback só em 404, lista vazia sem fallback e erro não-404).
  - api-microdata reiniciada com `reiniciar-api.bat` (somente porta 58245); sync de faturamentos executado uma vez (`13041` documentos / `103037` itens) para normalizar o warehouse.
- **Arquivos Envolvidos:** `M:\dev\api-microdata\app\src\api\routers\crm.py`, `M:\dev\api-microdata\app\tests\test_crm.py`, `src/lib/erp/cliente.ts`, `src/lib/erp/cliente.test.ts`, `src/lib/crm/vincular-faturado.ts`, `src/lib/crm/vincular-faturado.test.ts`, `src/lib/crm/verificar-pedido-faturado.ts`, `src/lib/crm/verificar-pedido-faturado.test.ts`, `docs/Sessoes.md`.
- **Testes:** dgbcomex: `npx.cmd vitest run` → 498 arquivos / 2909 testes passados; `tsc --noEmit` limpo; `npm run build` OK. api-microdata: `pytest -q` → 384 passou; `ruff check src/api/routers/crm.py tests/test_crm.py` → limpo.

### Sessão 50 — Valor estimado recalculado por todos os botões de vínculo

- **Data:** 2026-11-25
- **Commit:** `942550d6` — `feat(crm): recalcula valor da oportunidade em todos os vínculos`
- **Tarefa:** os botões "Vincular do ERP", "Vincular faturado" e "Verificar faturados" precisam, como ação final, recalcular o valor da oportunidade com todos os pedidos vinculados a ela (um pedido ou a soma de vários).
- **Resultado:**
  - `src/lib/crm/valor-oportunidade.ts`: novo helper com `somaOportunidade` e `recalcularValorOportunidade`, que grava `valorEstimado + updatedAt` na oportunidade.
  - `src/app/api/crm/oportunidades/[id]/vinculos/route.ts`: os ramos `PEDIDO` e `FATURAMENTO` passam a chamar o helper, substituindo o SQL inline de soma; a resposta devolve o total recalculado.
  - `src/lib/crm/vincular-faturado.ts`: aplicação usa `recalcularValorOportunidade`; o preview continua usando apenas `somaOportunidade`.
  - `src/lib/crm/verificar-pedido-faturado.ts`: recálculo feito por oportunidade afetada e resposta com a lista `oportunidades`, sem limitar ao primeiro pedido.
  - `src/components/crm/verificar-pedidos-faturados.tsx`: aplicação global não injeta mais o `oportunidadeId` do primeiro pedido, preservando todas as oportunidades do preview.
  - `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts` e `docs/Sessoes.md`: modal de informação e histórico atualizados.
- **Arquivos Envolvidos:** `src/lib/crm/valor-oportunidade.ts`, `src/lib/crm/valor-oportunidade.test.ts`, `src/app/api/crm/oportunidades/[id]/vinculos/route.ts`, `src/app/api/crm/oportunidades/[id]/vinculos/route.test.ts`, `src/lib/crm/vincular-faturado.ts`, `src/lib/crm/vincular-faturado.test.ts`, `src/lib/crm/verificar-pedido-faturado.ts`, `src/lib/crm/verificar-pedido-faturado.test.ts`, `src/components/crm/verificar-pedidos-faturados.tsx`, `src/components/crm/verificar-pedidos-faturados.test.tsx`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/Sessoes.md`.
- **Testes:** `npx.cmd vitest run` → 499 arquivos / 2914 testes passados; `tsc --noEmit` limpo; `npm run build` OK. Foco: `valor-oportunidade.test.ts`, `vincular-faturado.test.ts`, `verificar-pedido-faturado.test.ts`, `vinculos/route.test.ts`, `aplicar-faturados/route.test.ts` e `verificar-pedidos-faturados.test.tsx`.

---

### Sessão 51 — Fechamento do histórico: vínculo pedido/nota do ERP no CRM (23–25/11)

- **Data:** 2026-11-25
- **Commit:** `docs(sessoes): fecha histórico das sessões 42–50`
- **Tarefa:** registrar no histórico os commits finais das sessões anteriores e os commits de correção que ficaram sem sessão própria, para que toda a entrega esteja documentada em `docs/Sessoes.md` e não apenas no `git log`.
- **Resultado:**
  - Sessões 42–50 passaram a referenciar os commits reais, substituindo os marcadores “novo commit desta sessão (ainda não efetuado)”.
  - Mapa consolidado dos commits do bloco:
    - S42 (tokens/provedor da IA): `8a95c262`, `5f009871`, `f0505fc6`, `364abb66`.
    - S43 (campos obrigatórios): `b0b2a23b`.
    - S44 (requisitos por status no kanban): `11df1f80`.
    - S45 (classificação canônica do Resumo IA): `c1721112`.
    - S46 (Verificar faturados): `8162523d`, `6a8cb200`; api-microdata `e792c53`.
    - S47 (Vincular faturado): `acc7c9fa`, `a8089050`, `f327c080`, `54060876`, `cadfa561`, `31bf5b2e`, `ce0d1408`, `cccb4d3a`, `9402834e`, `c956ebd4`, `bba954f0`.
    - S48 (pedido real do ERP, nota separada e N:N): `bd186738`; api-microdata `f762905`.
    - S49 (busca de faturados ao vivo): api-microdata `e35d934`; lado app `942550d6` (helper `buscarFaturamentosPorPedido`).
    - S50 (recalculo do valor da oportunidade): `942550d6`.
  - Estado final da entrega funcional: código do app consolidado em `942550d6`, api-microdata `main` em `e35d934`; ambos os repositórios sincronizados com `origin/main`, sendo este registro documental o único commit adicional.
  - Verificações consolidadas da entrega: dgbcomex `npx.cmd vitest run` → 499 arquivos / 2914 testes passados, `tsc --noEmit` limpo, `npm run build` OK; api-microdata `pytest -q` → 384 passou e `ruff check` limpo; migrations `0080`/`0081` aplicadas no Neon e no warehouse local, `db:comparar` IDENTICAL e `db:verificar-local` com 0 divergências.
- **Arquivos Envolvidos:** `docs/Sessoes.md`.
- **Testes:** entrega apenas documental; suíte verde registrada na Sessão 50 (499 arquivos / 2914 testes passados).

### Sessão 52 — Análise de saúde da prospecção processada em fatias

- **Data:** 2026-11-27
- **Commit:** `4041fa7` — `feat(ia): processa saúde da prospecção em fatias`
- **Tarefa:** evitar HTTP 413 na IA de Saúde da Prospecção ao analisar muitos registros, mantendo o contexto entre os lotes e o contrato atual do front.
- **Resultado:**
  - `src/lib/crm/saude-prospeccao-ia.ts`: novo fatiamento server-side quando os registros resumidos passam de 45.000 caracteres; lotes de até 18.000 caracteres são compactados com chamadas curtas (1024 tokens, sem raciocínio) e todos os resumos voltam para o contexto da resposta final junto de filtros, pergunta e histórico.
  - `dividirLinhasEmFatias()` e `PERGUNTA_ANALISE_PADRAO` exportados; extração de `montarHistoricoMensagens()` reaproveitada pela montagem normal e pelo modo fatiado; metadados `FatiamentoAnaliseIA` propagados até as rotas.
  - `POST /analises`, `POST /analises/preview` e `POST /analises/[id]/mensagens`: envio de `dadosFonte`, exposição de `fatiamento`/`fatiamentoPrevisto` e persistência dos metadados em `contexto`/`dadosUsados`.
  - `analise-ia-panel.tsx`: prévia informa quantas fatias serão usadas e o toast de sucesso destaca quando a análise foi gerada em várias fatias.
  - Modal “i”, `docs/opencode-nemotron.md` e testes de lib/rotas/UI atualizados; textos obsoletos sobre “700 tokens” e registro resumido removidos.
- **Arquivos Envolvidos:** `src/lib/crm/saude-prospeccao-ia.ts`, `src/lib/crm/saude-prospeccao-ia.test.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/route.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/route.test.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/preview/route.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/preview/route.test.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/[id]/mensagens/route.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/rotas-auxiliares.test.ts`, `src/components/crm/saude-prospeccao/analise-ia-panel.tsx`, `src/components/crm/saude-prospeccao/analise-ia-panel.test.tsx`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/opencode-nemotron.md`, `docs/Sessoes.md`.
- **Testes:** foco 7 arquivos / 117 testes verdes; `npm run test` → 503 arquivos / 2982 testes passados; `npm run lint` apenas warnings pré-existentes; `tsc --noEmit` limpo; `npm run build` OK.

### Sessão 53 — Chat reutiliza a análise salva da saúde da prospecção

- **Data:** 2026-11-27
- **Commit:** `b47eb41a` — `feat(ia): reutiliza análise salva no chat`
- **Tarefa:** fazer o chat da análise de Saúde da Prospecção trabalhar sobre a análise já criada, sem reenviar a grade completa de registros a cada clique em “Enviar”.
- **Resultado:**
  - `POST /analises` passou a salvar `contexto.memoria`: o bloco compactado quando a análise cabe em uma chamada, ou a concatenação dos resumos das fatias quando há fatiamento.
  - `src/lib/crm/saude-prospeccao-ia.ts`: novo `montarMensagensConversaAnalise()` monta o prompt do chat com título, resumo, texto salvo, memória compacta, filtros, consultas curadas já feitas e histórico; `processarAnaliseEmFatias()` e `chamarAnaliseComConsultas()` propagam `memoria`.
  - `POST /analises/[id]/mensagens`: com memória salva, não chama `buscarTemperaturas()`/`prepararLinhas()` nem reconstrói os registros brutos; quando a memória é gerada no caminho legado, ela é persistida para as próximas perguntas.
  - Modal “i”, `docs/opencode-nemotron.md` e testes de lib/rotas atualizados para o novo comportamento; contrato da UI mantido.
- **Arquivos Envolvidos:** `src/lib/crm/saude-prospeccao-ia.ts`, `src/lib/crm/saude-prospeccao-ia.test.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/route.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/route.test.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/[id]/mensagens/route.ts`, `src/app/api/crm/saude-prospeccao/ia/analises/rotas-auxiliares.test.ts`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/opencode-nemotron.md`, `docs/Sessoes.md`.
- **Testes:** foco 5 arquivos / 95 testes verdes; `npm run test` → 503 arquivos / 2985 testes passados; `npm run lint` apenas warnings pré-existentes; `tsc --noEmit` limpo; `npm run build` OK.

### Sessão 54 — Saída Markdown/GFM na análise de saúde da prospecção

- **Data:** 2026-11-27
- **Commit:** `feat(ia): formata análise e chat em Markdown/Gfm`
- **Tarefa:** deixar as respostas da IA mais limpas e estruturadas, com títulos, tabelas, checklist, destaques e links seguros.
- **Resultado:**
  - `REGRAS_SISTEMA`: contrato explícito de Markdown — `##`/`###`, tabela com colunas fixas para 3 ou mais registros, `- [ ]`, `**negrito**`, `> `, sem emoji/HTML/bloco de código e sem URL inventada.
  - `REGRAS_FATIAMENTO`: resumo de cada fatia preserva os campos separados por ` | ` para montar tabelas depois; `limparResposta()` remove cerca de código Markdown no início/fim.
  - Novo `src/components/ui/markdown-ia.tsx`: `ReactMarkdown` + `remark-gfm`, tabela com rolagem horizontal, `th scope="col"`, checkbox desabilitado e links restritos a `http(s)`, `mailto`, `#` e `/` com `target`/`rel` seguros.
  - `analise-ia-panel.tsx`: análise salva e respostas do chat passam a usar o renderer comum; modal “i” e testes atualizados.
- **Arquivos Envolvidos:** `src/lib/crm/saude-prospeccao-ia.ts`, `src/lib/crm/saude-prospeccao-ia.test.ts`, `src/components/ui/markdown-ia.tsx`, `src/components/ui/markdown-ia.test.tsx`, `src/components/crm/saude-prospeccao/analise-ia-panel.tsx`, `src/components/crm/saude-prospeccao/analise-ia-panel.test.tsx`, `src/lib/info-content/crm.ts`, `src/lib/info-content/info-content.test.ts`, `docs/opencode-nemotron.md`, `docs/Sessoes.md`.
- **Testes:** foco 4 arquivos / 75 testes verdes; `npm run test` → 504 arquivos / 2987 testes passados; `npm run lint` apenas warnings pré-existentes; `tsc --noEmit` limpo; `npm run build` OK.

---

## Estrutura de Comandos

- `/historico` - Lê este arquivo e mostra resumo das sessões
- `/docsessao` - Registra nova sessão neste arquivo
