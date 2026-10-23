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
   dedicado para não misturar com o Neon. **Feito — e depois removido**: o dgbcomex (Vercel)
   não alcança o Postgres local, então o acesso passou a ser via api-microdata (ver Fase 4).
   A `DATABASE_URL_LOCAL` continua sendo da api-microdata (ETL e rotas `/wms`).
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

### Fase 4 — Módulo WMS no dgbcomex — ✅ concluída (v2: ordens de separação)

**Arquitetura de acesso** — o front chama `/api/wms/*` (Next.js), que faz proxy autenticado
para a **api-microdata** (`app/src/api/routers/wms.py`), que lê o ERP (`raw.cte_*`) e
escreve as separações no Postgres local. O dgbcomex não abre conexão com o banco local:

```
/wms (React) → /api/wms/* (Next) → api-microdata /wms/* (FastAPI) → dgbcomex_warehouse
```

Auth: rotas Next usam `requireAuth` (sessão); a api-microdata usa o usuário de serviço
(`MICRODATA_SERVICE_EMAIL`/`MICRODATA_SERVICE_SENHA`). O `usuarioId` da sessão vai no corpo
das operações para auditoria.

**Telas** (todas com `InfoButton`, kanban + lista e export CSV/PDF):

| Rota | Conteúdo |
|---|---|
| `/wms` | Dashboard: pedidos liberados, separações por status, peças/metros reservados, estoque em aberto, gavetas |
| `/wms/pedidos` | Pedidos aprovados no ERP com saldo; "Marcar para separação" cria a ordem |
| `/wms/separacoes` | Ordens por status (LIBERADO, EM_SEPARACAO, SEPARADO, CANCELADO) |
| `/wms/separacoes/[id]` | Detalhe: itens do pedido, peças reservadas, iniciar/concluir/cancelar, seletor de peças |
| `/wms/estoque` | Peças em aberto (exclui reservadas), filtros busca/gaveta/sub-lote/aviso/cor/produto |
| `/wms/gavetas` | Catálogo read-only de gavetas com ocupação, kanban por zona |

**API (api-microdata)**:
- `GET /wms/dashboard`, `GET /wms/gavetas`, `GET /wms/pedidos`,
  `GET /wms/pedidos/{empresa}/{pedido}`, `GET /wms/estoque`.
- `GET|POST /wms/separacoes`, `GET /wms/separacoes/{id}`,
  `POST /wms/separacoes/{id}/iniciar|concluir|cancelar`,
  `GET /wms/separacoes/{id}/itens/{item}/pecas`,
  `POST /wms/separacoes/{id}/pecas`, `DELETE /wms/separacoes/{id}/pecas/{peca_id}`.

**Banco local** (`scripts/migrar-wms-local.js`): `wms_separacoes`, `wms_separacao_pecas`,
`wms_separacao_eventos`. Índices únicos parciais garantem **uma ordem ativa por pedido** e
**uma peça em apenas uma ordem ativa**. As tabelas antigas `wms_enderecos`, `wms_estoque` e
`wms_movimentos` foram removidas.

**Menu**: `scripts/adicionar-menu-wms-todos.js` (todos os roles/usuários do Neon) e
`scripts/adicionar-menu-wms.js` (ADMIN), idempotentes, removendo os itens obsoletos
`/wms/enderecos` e `/wms/movimentos`.

**Removidos**: `src/lib/db/local.ts`, `src/lib/db/schema/wms.ts`, as rotas/telas de
endereços, movimentos e alocação — não há mais acesso direto ao banco local no dgbcomex.


## 5. Princípios do módulo WMS

- **ERP read-only**: todo acesso ao ERP é `SELECT` via api-microdata (proxy de detalhe).
- **Escrita local**: ordens de separação, peças reservadas e eventos ficam no
  `dgbcomex_warehouse`.
- **Domínio têxtil**: trabalhar com as unidades reais do negócio — **rolo**, **peça**,
  **metros**, **peso**, e as chaves cor/desenho/lote. O `raw` local já tem `cte_peca`
  (~300k), `cte_baixa`, `car_*`, `liv_*`.
- **Idempotência e auditoria**: toda operação do WMS é rastreável (quem, quando, o quê).

## 6. Riscos e pontos em aberto

- **Ambiente local**: precisa do PostgreSQL 17 no ar (`localhost:5432`) e do
  `dgbcomex_warehouse` acessível **pela api-microdata**. O dgbcomex não conecta no local.
- **Credentials/segurança (resolvido na arquitetura)**: o dgbcomex em produção (Vercel)
  **não alcança** o Postgres local; o acesso é sempre via api-microdata. Falta definir no
  Vercel as variáveis `MICRODATA_API_URL`, `MICRODATA_SERVICE_EMAIL` e
  `MICRODATA_SERVICE_SENHA`, com a API alcançável a partir da Vercel (IP público, VPN ou
  túnel). Sem isso as telas do WMS carregam, mas as rotas respondem 503.
- **Cópia de `public`**: FKs entre tabelas exigem ordem de cópia; colunas com default
  `nextval` precisam de reset de sequência (mesma dor do backup/restore documentada no
  AGENTS.md).
- **ETL**: hoje publica no Neon; publicar nos dois (transição) precisa de idempotência.

## 7. Próximos passos imediatos

1. ~~Fase 2: client local + cópia/validação Neon→local + ETL nos dois bancos.~~ ✅
2. ~~Fase 3: comparação de ferramentas (`docs/wms-ferramentas.md`).~~ ✅
3. ~~Fase 4: rotas WMS via api-microdata (cliente, mapeamento, testes, docs e info).~~ ✅
4. ~~Fluxo de ordens de separação (pedidos liberados → peças → conclusão) e telas.~~ ✅
5. Configurar no Vercel as variáveis `MICRODATA_*` apontando para uma API alcançável e
   validar o módulo em execução (`npm run dev` → `/wms`).
6. Registrar a integração read-only do ERP e seguir para a lógica avançada (recebimento,
   conferência, ondas etc.).

## 8. Gavetas do ERP = endereços do WMS

Levantamento completo no repositório da api-microdata:
`docs/estudo/24-enderecamento-gavetas-wms-comex.md` (estrutura, flags, contagens e views).
Resumo operacional:

- No Microdata o endereço físico da peça se chama **gaveta**. A peça carrega o texto em
  `Cte_Peca.Gaveta`; o cadastro é `Cte_Gaveta` (741 posições) e as zonas são
  `Cte_GrupoGaveta` (9: DEPÓSITO 01/02/03, PRODUÇÃO, TRANSPORTE, CANAL VERDE,
  CANAL VERMELHO, ETIQUETAGEM, INVENTÁRIO).
- Código da gaveta: coordenada `AA.BB.CC.D` (725 de 741, ex. `01.00.01.0`) ou nomeada
  (`PACKLIST`, `AVARIA 01`, `RACK 01 PQN`, `SEPARACAO 06`, `CONFERENCIA`, `INVENTARIO01`,
  `LOTE_MISTO`, `ROMANEIOS PEDIDOS`…). `PACKLIST` é o staging da importação.
- `Cte_Gaveta` também tem `Faz_Sugestao`, `Estoque_Plano` e `confirmarTransferencia`.
- Movimentação de endereço no ERP: `Cte_Peca_Gaveta_Log` (trigger) e `CTE_PalmGav_Log`
  (coletor). O ERP é **somente leitura** para o WMS.

**No WMS a tela se chama "Gavetas" e a gaveta é o endereço da peça.** O WMS não cria,
edita, inativa nem transfere gavetas — apenas lê. O catálogo é uma visão read-only de
`Cte_Gaveta`/`Cte_GrupoGaveta`, com a ocupação das peças em aberto (`/wms/gavetas`,
`GET /wms/gavetas`).

**Sync resolvido**: `Cte_Gaveta` (829 linhas) e `Cte_GrupoGaveta` (9) entraram no ETL
read-only (`app/src/etl/sources.py`) e no `raw` local (`raw.cte_gaveta`,
`raw.cte_grupo_gaveta`), permitindo mostrar zona/descrição e filtrar por gaveta.

Contagens no local (peças em aberto, `core.estoque_pecas_em_aberto`): **18.334 peças**,
**545 gavetas distintas**, 2 sem gaveta, 18.092 com aviso (85 avisos), 552 sublotes.
`PACKLIST` lidera (1.268 peças).

## 9. Regra de negócio do WMS — ordens de separação (implementada)

Objetivo: transformar pedidos **liberados no ERP** em **ordens de separação**, reservando as
peças no banco local. O WMS nunca escreve no ERP.

**Pedido liberado**: `car_pedido.status = '2'` (aprovado), `status_ped` aberto, item
`status_item` aberto e saldo (`qtde − qtde_romaneio − qtde_acerto`) > 0.

**Fluxo**:

1. Comercial vê a lista de pedidos liberados em `/wms/pedidos` e marca o **pedido inteiro**
   para separação (os itens são informativos).
2. A marcação cria uma ordem `LIBERADO` em `wms_separacoes` (uma ordem ativa por pedido).
3. Estoque abre a ordem, inicia (`EM_SEPARACAO`) e seleciona peças por item. A lista de
   peças já exclui as reservadas/separadas por ordens ativas e respeita a **grade**
   produto + situação + cor + desenho + variante + categoria (a largura não filtra porque o
   formato difere entre peça e item).
4. Cada peça adicionada é **reservada na hora** (`wms_separacao_pecas`, uma ordem ativa por
   peça) e sai do estoque em aberto.
5. Concluir (`SEPARADO`) registra a separação, mas **não libera as peças**: elas continuam
   bloqueadas até a baixa no ERP.
6. Cancelar (`CANCELADO`) libera as peças reservadas de volta ao estoque em aberto.
7. Se o ERP der baixa em uma peça durante a separação, a ordem sinaliza a **divergência**
   e permite trocar/remover a peça.
8. O saldo separado tem **tolerância para mais e para menos**: é possível concluir com
   saldo remanescente no pedido.

**Eventos**: toda transição (criar, iniciar, adicionar/remover peça, concluir, cancelar) é
registrada em `wms_separacao_eventos` (payload JSONB, autor e data).
