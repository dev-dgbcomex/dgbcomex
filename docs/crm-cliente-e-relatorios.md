# CRM — Cliente, pessoa e relatórios (vínculos, edição e promoção)

> Documento de referência das 4 últimas sessões do CRM (04/11/2026).
> Registra o que existe hoje em código, banco e telas, e o que mexer em cada fluxo.
> O histórico cronológico está em [`Sessoes.md`](./Sessoes.md).

---

## 1. Visão geral

O CRM trata **pessoa** (empresa/lead no funil) e **cliente** (empresa que já virou cliente)
como duas faces do mesmo negócio. A regra central implementada nestas sessões:

> Tudo o que foi feito com uma pessoa que virou cliente passa a ser **do cliente** —
> nas telas, na timeline, no WhatsApp e nos relatórios.

Fluxo completo:

```
Pessoa (CRM) ──"Tornar cliente"──▶ Cliente (clientes)
     │                                   │
     │ negócio: oportunidades,           │ herda o negócio da pessoa
     │ propostas, visitas,               │ (backfill + consulta por COALESCE)
     │ timeline, WhatsApp                │
     └───────────────────────────────────┘
```

---

## 2. Modelo de dados

### 2.1 Tarja de promoção (migration `0064`)

`crm_pessoas` ganhou:

| Coluna               | Tipo                | Papel                                              |
| -------------------- | ------------------- | -------------------------------------------------- |
| `promovida_cliente`  | boolean             | tarja: a pessoa já virou cliente e sai da listagem |
| `promovido_em`       | timestamp           | quando a promoção aconteceu                        |
| `promovido_por`      | int → `usuarios.id` | quem promoveu (`ON DELETE SET NULL`)               |
| `promovido_por_nome` | varchar             | nome do usuário no momento da promoção (histórico) |

### 2.2 Vínculos do cliente (migration `0065_crm_cliente_relacionamentos.sql`)

| Tabela                                                | Coluna nova                  | Efeito                                                        |
| ----------------------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| `crm_timeline_eventos`                                | `cliente_id` → `clientes.id` | timeline do cliente; `empresa_id` deixa de ser NOT NULL       |
| `crm_whatsapp_mensagens`                              | `cliente_id` → `clientes.id` | conversa do cliente                                           |
| `crm_oportunidades` / `crm_propostas` / `crm_visitas` | backfill de `cliente_id`     | negócio das pessoas promovidas passa a apontar para o cliente |

Já existiam: `crm_pessoas.cliente_id`, `crm_contatos.cliente_id`, `crm_oportunidades.cliente_id`,
`crm_propostas.cliente_id`, `crm_visitas.cliente_id`.

**Procedimento obrigatório de mudança de schema** (ver `AGENTS.md`):
`npx drizzle-kit generate` ou SQL numerado em `src/lib/db/migrations/` → `npm run db:migrate` (Neon)
→ `npm run db:replicar-neon` (warehouse local) → `npm run db:verificar-local` (0 divergências).
Os scripts `scripts/migrate.js` (Neon) e `scripts/sync-all-dbs.js` (local) precisam do mesmo SQL.

### 2.3 Regra de negócio da herança

O negócio do cliente é o que foi lançado **direto** nele (`cliente_id` preenchido) **mais**
o que foi lançado em uma pessoa promovida (`empresa_id` → `crm_pessoas.cliente_id`).

Em SQL isso vira `COALESCE(reg.cliente_id, pessoa.cliente_id)`; em Drizzle:

```ts
const clienteDaOportunidade = sql<
  number | null
>`COALESCE(${crmOportunidades.clienteId}, ${crmPessoas.clienteId})`
```

Helper central: `src/lib/crm/cliente-relacionamentos.ts`
(`idsPessoasDoCliente`, `idsContatosDoCliente`, `clienteIdDaPessoa`).

---

## 3. Promoção (pessoa → cliente)

`src/lib/crm/promover-cliente.ts` — acionada por `POST /api/crm/pessoas/[id]/promover-cliente`.

1. Valida pessoa existente, ainda não promovida e com CNPJ.
2. Reaproveita o cliente com o mesmo CNPJ ou cria um novo em `clientes`.
3. Marca a tarja em `crm_pessoas` (`promovida_cliente`, `promovido_em`, `promovido_por`, `promovido_por_nome`).
4. **Passa o negócio da pessoa para o cliente**: `UPDATE` de `cliente_id` em
   `crm_oportunidades`, `crm_propostas` e `crm_visitas` da pessoa.
5. Grava log de `CrmPessoa` + log de `CrmCliente` (entidade nova) e evento de timeline
   `CONVERSAO_CLIENTE` com `empresaId` **e** `clienteId`.
6. Notifica a equipe comercial.

Histórico consultável em `src/lib/crm/historico-promocao.ts` (`listarConversoes`)
→ usado pela tela do cliente (`GET /api/clientes/[id]/historico`) e pelo Relatório de Conversões.

---

## 4. Endpoints

### 4.1 Cliente

| Método          | Rota                                | Observação                                                            |
| --------------- | ----------------------------------- | --------------------------------------------------------------------- |
| GET             | `/api/clientes`                     | busca por nome/CNPPJ/razão social                                     |
| POST            | `/api/clientes`                     | cria cliente e registra log `CrmCliente`                              |
| GET             | `/api/clientes/[id]`                | dados do cliente                                                      |
| PUT             | `/api/clientes/[id]`                | edita e registra log `CrmCliente` (404 se não existir)                |
| DELETE          | `/api/clientes/[id]`                | ADMIN/SUDO; desvincula tudo (`excluirClienteCascade`) e registra log  |
| GET             | `/api/clientes/[id]/historico`      | histórico de conversão (pessoa de origem, data, quem promoveu, funil) |
| GET/POST/DELETE | `/api/clientes/[id]/representantes` | vínculo de representantes (logs `CrmCliente`)                         |

### 4.2 CRM com `clienteId`

| Método | Rota                                | Observação                                                           |
| ------ | ----------------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/crm/timeline?clienteId=`      | eventos do cliente + das pessoas promovidas                          |
| GET    | `/api/crm/whatsapp?clienteId=`      | conversa do cliente + contatos/pessoas promovidas                    |
| POST   | `/api/crm/whatsapp`                 | `clienteId` → envia pelo contato principal com WhatsApp              |
| POST   | `/api/crm/whatsapp/webhook`         | mensagem recebida de contato de cliente entra na conversa do cliente |
| GET    | `/api/crm/oportunidades?clienteId=` | negócio do cliente (direto + herdado)                                |
| GET    | `/api/crm/propostas?clienteId=`     | idem para propostas                                                  |
| GET    | `/api/crm/contatos?clienteId=`      | contatos do cliente                                                  |

> `POST /api/crm/oportunidades` e `POST /api/crm/propostas`: quando vem `empresaId` de uma pessoa
> já promovida e não vem `clienteId`, o cliente é herdado automaticamente
> (`clienteIdDaPessoa`) e o evento de timeline é gravado para os dois lados.

### 4.3 Relatórios

| Rota                                | Função                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/api/crm/relatorios/atividades`    | logs do CRM (categorias: pessoas, **clientes**, oportunidades, propostas, visitas, tarefas, leads, contatos) |
| `/api/crm/relatorios/pessoas`       | cadastro de pessoas + tarja de cliente (`com`/`sem`)                                                         |
| `/api/crm/relatorios/conversoes`    | quem virou cliente, quem promoveu e o negócio gerado                                                         |
| `/api/crm/relatorios/oportunidades` | pipeline; coluna **Cliente** já resolve o cliente herdado                                                    |
| `/api/crm/relatorios/propostas`     | propostas aceitas/recusadas; idem para cliente herdado                                                       |
| `/api/crm/relatorios/visitas`       | visitas; idem para cliente herdado                                                                           |
| `/api/crm/relatorios/clientes`      | **novo** — visão por cliente no período                                                                      |

---

## 5. Telas

### 5.1 Cliente — `/comercial/clientes/[id]`

Formulário (dados, representantes, contatos) + card de histórico de conversão +
seção **Relacionamentos do CRM** com 4 cards:

| Card          | Origem                                  |
| ------------- | --------------------------------------- |
| Oportunidades | `GET /api/crm/oportunidades?clienteId=` |
| Propostas     | `GET /api/crm/propostas?clienteId=`     |
| Timeline      | `GET /api/crm/timeline?clienteId=`      |
| WhatsApp      | `GET /api/crm/whatsapp?clienteId=`      |

Os cards ficam **fora** do `<form>` (o botão `+` do Quick Create não pode submeter o formulário).

### 5.2 Pessoa — `/comercial/crm/pessoas/[id]`

Mesmos 4 cards, agora via componentes compartilhados em `src/components/crm/`:

- `oportunidades-card.tsx` → `OportunidadesCard({ empresaId?, clienteId? })`
- `propostas-card.tsx` → `PropostasCard({ empresaId?, clienteId? })`
- `crm-timeline.tsx` → `CrmTimeline({ pessoaId?, clienteId? })`
- `crm-whatsapp.tsx` → `CrmWhatsapp({ pessoaId?, clienteId? })`

### 5.3 Oportunidade — `/comercial/crm/oportunidades/[id]`

- Edição inline (`?edit=true`) com `edicao-card.tsx`; salvar via PUT e recarregar.
- Cards de **Faturamentos** e **Pedidos** do ERP com o modal
  `vincular-documento-erp-modal.tsx`; vínculo salvo em
  `POST /api/crm/oportunidades/[id]/vinculos` (`origem="ERP"`, `referencia_externa`).

### 5.4 Relatórios — `/comercial/crm/relatorios/*`

Hub com 7 relatórios (Atividades, Pessoas, Oportunidades, Propostas, Visitas, Conversões, Clientes).
Todos usam `useRelatorioCrm` + `FiltrosRelatorio` (período, usuário, status, tipo, segmento, tarja),
cards de resumo, tabela com cabeçalho fixo e exportação em PDF/CSV/Markdown.

**Relatório de Clientes** (`src/lib/crm/relatorios.ts` → `consultarClientes`):
por cliente — CNPJ, segmento, cidade/UF, pessoas promovidas, oportunidades (total, em aberto, valor),
propostas (total, aceitas, valor) e visitas (total, concluídas). O nome do cliente é link para a tela
do cliente.

---

## 6. ERP (api-microdata)

`src/lib/erp/cliente.ts` fala com a api-microdata (`http://127.0.0.1:58245`) através de `requisitarWms`:

- `GET /api/crm/erp/pedidos?busca=&cnpj=&pagina=&porPagina=`
- `GET /api/crm/erp/faturamentos?busca=&cnpj=&pagina=&porPagina=`

Detalhe completo em `docs/api-bling.md`/`docs/api-systextil-*` e no repositório
`M:\dev\api-microdata` (FastAPI, endpoints `/crm/pedidos` e `/crm/faturamentos`).

---

## 7. Regras de manutenção

1. **Mudou a tela** → atualizar o modal de informação (`src/lib/info-content/<dominio>.ts`) e o
   teste `src/lib/info-content/info-content.test.ts`.
2. **Mudou a tela** → garantir teste (factories `list-page-spec`/`form-page-spec`, spec de relatório
   `specRelatorioCrm`, ou teste customizado).
3. **Mudou o schema** → migration numerada + `scripts/migrate.js` + `scripts/sync-all-dbs.js`,
   aplicar nos **dois** bancos e verificar com `npm run db:verificar-local`.
4. **Novo relatório** → `consultarX` em `src/lib/crm/relatorios.ts` + API + página + card no hub +
   `CATEGORIAS_CRM` (se gerar log) + info-content.
5. **Suíte completa antes de commit** (`npm run test`); falha pré-existente é reportada, nunca mascarada.
6. Ao concluir a entrega: **commit + push** (`git push origin main`).
