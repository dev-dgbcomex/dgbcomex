# Módulo WMS — planejamento, banco local e ferramentas

> Documento de planejamento. Estado: **rascunho fase 1** (levantamento e decisões).
> Nada de código de negócio do WMS é escrito antes deste plano ser aprovado.

## 1. Contexto

O dgbcomex hoje é um app Next.js 15 + Drizzle + PostgreSQL que roda contra o **Neon**
(banco único, `DATABASE_URL`). A api-microdata publica os **marts** do BI no mesmo Neon
(schemas `marts`, `auth`, `etl`) e mantém um **warehouse local** (`dgbcomex_warehouse`,
schemas `raw`/`core`/`marts`/`etl`) alimentado por ETL a partir do ERP.

O objetivo deste trabalho é criar um módulo **WMS** (gestão de armazém) no dgbcomex com
duas premissas firmes:

1. **O ERP é somente leitura.** O WMS nunca faz `INSERT`/`UPDATE`/`DELETE` no banco do ERP.
   Só `SELECT`.
2. **Os dados do WMS vivem no PostgreSQL local** (`dgbcomex_warehouse`), não no Neon nem no
   ERP — o volume de movimentação é grande demais para o Neon.

Para que o local sirva de base, o primeiro passo é **replicar no local tudo o que hoje só
existe no Neon** (marts do BI + tabelas próprias do app), com o ETL depois assumindo a
atualização dos marts.

## 2. Estado atual dos bancos

| Banco | Onde | Papel | Observação |
|---|---|---|---|
| ERP (Firebird/SQL Server + `DBProDash`) | rede interna | fonte **read-only** | via api-microdata |
| Neon `dgbcomex` | nuvem | app dgbcomex + marts do BI | `DATABASE_URL` |
| Local `dgbcomex_warehouse` | `localhost:5432` | warehouse do ETL | `DATABASE_URL_LOCAL` (api-microdata) |

Inventário levantado (2026-10-22):

- **Neon**: `public` 126 tabelas (app dgbcomex), `marts` 9, `auth` 1, `etl` 1.
  - marts: `contas_pagas_diario` (1752), `faturamento_diario` (1825),
    `financeiro_receber_programado` (1036), `financeiro_pagar_programado` (129),
    `devolucoes_diario` (102), `estornos_diario` (20), `custos_administrativo_mensal` (16),
    `faturamento_detalhe` (0), `faturamento_detalhe_estado` (1).
  - `public` maiores: `crm_cidades` (5570), `user_menu_itens` (206), `status` (45),
    `__drizzle_migrations` (64), `usuarios` (9) — o restante é pequeno.
- **Local** `dgbcomex_warehouse`: `raw` 46 tabelas (ERP, ex. `cte_peca` 300k, `cte_baixa` 282k,
  `fat_itens_pedido` 101k), `core` 2 (`cfop_faturamento`, `empresa_faturamento`),
  `etl` 5 (`erros`, `execucoes`, `fontes`, `raw_ddl`, `watermark`). **Não há schema `marts`.**

Conclusão: o local já tem o `raw` do ERP, mas faltam `core` completo e todos os `marts`.
Os marts são pequenos (alguns milhares de linhas), então a cópia é rápida.

## 3. Decisões (confirmadas com o usuário)

- **D1 — Estratégia de replicação**: *copiar agora, ETL depois*. Primeiro um dump do estado
  atual do Neon para o local (destrava o WMS), e em paralelo configurar o ETL da microdata
  para publicar/atualizar os marts no local, tornando-o a fonte de verdade futura.
- **D2 — Escopo da cópia**: **marts + tabelas do app dgbcomex** (`public`). O objetivo é que
  o local, no futuro, substitua o Neon por completo.
- **D3 — Entrega em fases**: começar pelo **planejamento/documentação** (este doc), depois
  esqueleto + docs, depois WMS; investigar open-source no caminho.
- **D4 — Volume**: dados do WMS moram no local. O Neon sai do caminho do WMS.

## 4. Fases

### Fase 1 — Documentação e planejamento (este doc)
Levantamento (feito), decisões (feitas) e plano de execução. **Entrega: este arquivo.**

### Fase 2 — Banco local como base (fundação) — ✅ concluída
1. **Config de conexão** no dgbcomex: variável `DATABASE_URL_LOCAL` e um client Drizzle
   dedicado (`src/lib/db/local.ts`) para não misturar com o Neon. **Feito.**
2. **Script de cópia Neon→local** (`scripts/replicar-neon-local.js`), idempotente e
   repetível:
   - cria no local os bancos/schemas que faltam (`marts`, `auth`, `etl`, e as tabelas de
     `public` que ainda não existem);
   - copia **schema + dados** tabela a tabela (com `COPY`/lotes), preservando PKs/FKs
     quando possível e resetando sequências;
   - relatório de contagens Neon × local por tabela ao final (como o `compare-schemas.js`).
3. **Validação**: `scripts/verify-neon-local.js` — compara `count(*)` por tabela e lista
   divergências. Critério de aceite: 0 divergência nas tabelas copiadas. **Feito: 137
   tabelas verificadas, 0 divergentes** (`auth` 1, `etl` 6, `marts` 2, `public` 127 + 13
   views).
4. **ETL para o local**: `src/etl/publicar.py` da microdata grava os marts no Neon **e**
   no local (best-effort). **Feito.**

Comandos: `npm run db:migrate:wms`, `npm run db:replicar-neon`, `npm run db:verificar-local`.

### Fase 3 — Investigação open-source (WMS) — ✅ concluída
Pesquisar e comparar soluções open-source antes de decidir construir vs. adaptar. Candidatos
a avaliar (a confirmar):

- **ERPNext** (módulo Stock/Warehouse) — completo, porém Python/Frappe, acoplamento alto.
- **Odoo** (Inventory) — vem com WMS nativo (endereçamento, lotes, ondas).
- **OpenBoxes** — foco em supply chain/saúde.
- **Gestão à mão no dgbcomex** — só se as opções acima não servirem ao tecido (rolos, peças,
  metragem, cor/lote), que é um domínio bem específico.

Saída: `docs/wms-ferramentas.md` — recomendação **construir nativo no dgbcomex (9.0/10)**.

### Fase 4 — Esqueleto do módulo WMS no dgbcomex — 🚧 em andamento
- Rotas `src/app/(dashboard)/wms` (dashboard), `/wms/enderecos`, `/wms/estoque`,
  `/wms/movimentos`, com `InfoButton` e `src/lib/info-content/wms.ts`. **Feito.**
- Entrada no menu via `scripts/adicionar-menu-wms.js` (idempotente, Neon/ADMIN) + ícone
  `Warehouse` em `src/lib/menu-icones.tsx`. **Feito.**
- Schema local `src/lib/db/schema/wms.ts` (`wms_enderecos`, `wms_estoque`,
  `wms_movimentos`) + DDL idempotente em `scripts/migrar-wms-local.js`. **Feito.**
- API: `/api/wms/dashboard`, `/api/wms/enderecos`, `/api/wms/estoque`,
  `/api/wms/estoque/alocado`, `/api/wms/movimentos` (lê `raw.cte_peca` read-only e
  escreve só no local). **Feito.**
- Testes de página, API e info-content. **Feito.**
- Registrar a integração read-only do ERP (padrão `adicionar-integracao-*.js`) — **pendente**.
- Só depois começa a lógica de negócio avançada (recebimento, conferência, ondas etc.).

## 5. Princípios do módulo WMS

- **ERP read-only**: todo acesso ao ERP é `SELECT` via api-microdata (proxy de detalhe).
- **Escrita local**: movimentos, endereços, conferências e histórico ficam no
  `dgbcomex_warehouse`.
- **Domínio têxtil**: trabalhar com as unidades reais do negócio — **rolo**, **peça**,
  **metros**, **peso**, e as chaves cor/desenho/lote. O `raw` local já tem `cte_peca`
  (~300k), `cte_baixa`, `car_*`, `liv_*`.
- **Idempotência e auditoria**: toda operação do WMS é rastreável (quem, quando, o quê).

## 6. Riscos e pontos em aberto

- **Ambiente local**: precisa do PostgreSQL 17 no ar (`localhost:5432`) e do
  `dgbcomex_warehouse` acessível pelo dgbcomex (hoje só a microdata o usa).
- **Credentials/segurança**: o dgbcomex em produção (Vercel) **não alcança** o Postgres
  local. Decidir se o WMS roda on-premise ou expõe o local por túnel/rede — ponto a resolver
  antes da fase 4.
- **Cópia de `public`**: FKs entre tabelas exigem ordem de cópia; colunas com default
  `nextval` precisam de reset de sequência (mesma dor do backup/restore documentada no
  AGENTS.md).
- **ETL**: hoje publica no Neon; publicar nos dois (transição) precisa de idempotência.

## 7. Próximos passos imediatos

1. ~~Fase 2: client local + cópia/validação Neon→local + ETL nos dois bancos.~~ ✅
2. ~~Fase 3: comparação de ferramentas (`docs/wms-ferramentas.md`).~~ ✅
3. Fase 4: registrar a integração read-only do ERP e validar o módulo em execução
   (`npm run dev` → `/wms`).
4. Resolver o risco de produção: o Vercel **não alcança** o Postgres local — decidir
   on-premise/túnel antes de expor o WMS em produção.
