# Detalhe do Faturamento — o que foi entregue na API e no DGBComex

**Para:** Sérgio Pupo — Diretor, Microdata
**De:** Equipe de desenvolvimento
**Data:** 09/10/2026
**Assunto:** Tela de detalhe do faturamento (itens de nota) — entrega fim a fim

---

## 1. O que foi pedido

O card **Faturamento** do BI mostra o total consolidado do período, mas não deixava
responder as perguntas que aparecem no dia a dia da análise: *qual nota gerou esse valor?*
*qual pedido e romaneio?* *quantos metros e qual peso?* *de quem é a venda?*

A entrega é uma tela de detalhe que desce até o **item de nota** — o grão mais fino que
existe no faturamento — com 12 meses de histórico, filtros e geração de PDF.

---

## 2. Visão geral da arquitetura

O ponto central da solução é que **a tela não consulta banco a cada clique**. O fluxo é
base + delta + cache local:

```
ERP (SQL Server, ao vivo)                Neon                     Navegador
──────────────────────────────      ──────────────         ────────────────
vwFaturamento + Fat_Pedido
+ Fat_Vend_Pedido
+ Rec_Vendedores
        │
        │  POST /carga   (12 meses)  ──▶  marts.faturamento_detalhe
        │  POST /sync    (delta)     ──▶  marts.faturamento_detalhe_estado
        │                                    (watermark)
        │
        └──────────────────────────────────────────────▶ IndexedDB
                                                            ▲
                              filtros, agrupamento,          │ lê e agrupa
                              gráficos e PDF rodam aqui ─────┘ sem rede
```

Três níveis, cada um com uma função:

| Nível | Onde | Papel |
|-------|------|-------|
| ERP ao vivo | SQL Server `DBProDash` | Fonte da verdade, lida só na carga e no sync |
| Neon | Tabela `marts.faturamento_detalhe` | Espelho de 12 meses, sobrevive a queda da API e permite replay |
| IndexedDB | Navegado | Cache da tela — filtros e agregados rodam sem tocar em rede |

**Por que os três:** o ERP não deve receber uma consulta de 5 mil linhas a cada mudança de
filtro. O Neon dá consistência e histórico. O IndexedDB dá resposta imediata. A API só entra
em cena quando é preciso dados novos.

---

## 3. O que foi feito na API (repositório `api-microdata`)

Commit `1c4f657` — *"feat: detalhe do faturamento (marts) — router, migration e testes"*

### 3.1 Estrutura de dados (Neon)

Duas tabelas novas, criadas pela migration `1005_neon_faturamento_detalhe`:

**`marts.faturamento_detalhe`** — grão de item de nota

| Campo | Tipo | Observação |
|-------|------|-----------|
| `empresa`, `pedido`, `item`, `nr_nota` | `text` / `integer` | **Chave primária composta** — é o que torna o `upsert` do delta possível |
| `data_nota` | `date` | Indexada; é o eixo de todo filtro e do corte de 12 meses |
| `cliente`, `nome_cliente`, `cod_produto` | `text` | Recebem `strip()` na API (o SQL Server entrega `char` com espaço no fim) |
| `metros`, `peso`, `vr_unitario`, `vr_total`, `acres_desc`, `vr_nota` | `numeric` | `null` do ERP vira `0` — evita `sum` quebrado |
| `romaneio`, `representante_codigo`, `representante` | `text` | Vêm por join com `Fat_Pedido`, `Fat_Vend_Pedido` e `Rec_Vendedores` |
| `atualizado_em` | `timestamptz` | Auditoria de quando a linha entrou pela última vez |

**`marts.faturamento_detalhe_estado`** — linha única (`id = 1`) com o marcador de sync:
`carga_completa`, `contagem` e `ultima_data` (o **watermark**, maior `Data_Nota` carregada).

A escolha de atributos de texto em vez de `varchar` é deliberada: as colunas `char`/`varchar`
do SQL Server retornam com preenchimento à direita, e comparar `"ANA "` com `"ANA"` no `ilike`
falha. A API entrega o texto já aparado e o Neon o recebe limpo.

### 3.2 Endpoints

| Método | Rota | O que faz |
|--------|------|-----------|
| `GET` | `/faturamento-detalhe/estado` | Dizer se a base existe e qual o watermark. O front só chama quando precisa atualizar |
| `POST` | `/faturamento-detalhe/carga` | Lê 12 meses do ERP ao vivo e **substitui** o Neon (`delete` + `insert` na mesma transação), gravando o estado |
| `POST` | `/faturamento-detalhe/sync` | Só o delta: notas com `Data_Nota >= ultima_data`, `upsert` por PK, apaga o que saiu da janela de 12 meses |
| `GET` | `/faturamento-detalhe` | Leitura paginada no Neon, com filtros e `resumo` da seleção |
| `GET` | `/faturamento-detalhe/opcoes` | Distintos de representantes e produtos para alimentar os filtros |

**O `sync` recusa com `409`** se ainda não houve carga. Sem watermark não há como saber onde
começa o que é novo — devolver partial silencioso seria pior do que falhar alto.

**A re-leitura do dia do watermark** é intencional: o corte é inclusivo (`>=`) justamente para
pegar notas emitidas mais tarde no mesmo dia. É inofensiva porque o `upsert` por PK é idempotente.

**O `resumo` usa a mesma fórmula do card** (`Σ(Vr_Total + Acres_Desc)`), então o número que
aparece no detalhe bate com o número que originou o clique.

### 3.3 Segurança e qualidade

- Todas as rotas exigem o escopo `faturamento:leitura` — o mesmo dos cards de faturamento. Nenhum
  dado novo fica exposto a quem já não via faturamento
- `por_pagina` é limitado a 500 no servidor; `pagina < 1` retorna `422`
- Filtros de texto usam `ilike` com **parâmetro vinculado**, nunca concatenação de string
- **14 testes** cobrindo: publicação das rotas, SQL do detalhe, limpeza de espaços e conversão de
  data, nulos virando zero, janela de 12 meses, cada filtro virando `ilike`, carga substituindo e
  gravando estado, `409` do sync sem carga, delta sem duplicar, filtro+resumo, paginação, página
  zero recusada e opções

---

## 4. O que foi feito no DGBComex (repositório `dgbcomex`)

Commits `83385fc8` e `5effa356`

### 4.1 Estrutura de arquivos

A tela `/bi/integracoes/faturamento` ficou dividida assim:

| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `page.tsx` | 458 | Orquestração: estado, consultas, carga, delta, CSV, PDF consolidado, paginação |
| `components/faturamento-toolbar.tsx` | 113 | Filtros de período/representante/cliente/produto/nota + busca livre |
| `components/faturamento-charts.tsx` | 178 | 5 KPIs e 4 gráficos |
| `components/faturamento-card.tsx` | 162 | Uma nota fiscal: cabeçalho consolidado, seleção, expansão, PDF individual |
| `components/faturamento-pdf.ts` | 165 | Geração do PDF (retrato e paisagem) |
| `components/utils.ts` | 77 | Formatação e agrupamento por NF |
| `components/types.ts` | 29 | Tipos do domínio |
| `page.test.tsx` | 182 | 11 testes da tela |

### 4.2 Funcionalidades entregues

**Agrupamento por nota fiscal.** A listagem plana virou uma nota por cartão, com data, número
de itens, cliente e representante no cabeçalho. É a diferença entre "5.000 linhas" e "340 notas
que fazem sentido".

**Totais por nota.** Cada cartão mostra metragem, peso e valor faturado, calculados do próprio
grupo. Comparar nota com nota fica visual.

**Expansão.** Clicar no cartão revela a tabela de itens — pedido/item, produto, romaneio, metros,
valor unitário, valor total, acres/desc e peso, com a linha de total no rodapé.

**Seleção múltipla com PDF consolidado.** É possível marcar várias notas e gerar um único PDF,
escolhendo **retrato ou paisagem**. A orientação muda o layout da tabela: em paisagem entram
todas as 9 colunas, em retrato as 6 principais. Rodapé com data de geração e paginação.

**Cinco KPIs:** faturamento, itens, metragem, peso e ticket médio por nota.

**Quatro gráficos:** faturamento e metragem por mês, faturamento por cliente (top 8), por
produto (top 8) e participação por produto (pizza).

**Busca livre** dentro da página carregada — nota, cliente, produto, representante, romaneio — sem
disparar consulta nova. É filtro de tela, não de base.

**Filtro por número de nota**, que se soma aos filtros de período, representante, cliente e produto.

**Exportação CSV** dos itens filtrados.

### 4.3 Correção importante no PDF

O componente de PDF já existia, mas **não desenava tabela nenhuma** — apenas o cabeçalho. O
`renderGrupoPdf` montava o bloco de identificação da nota e parava ali. O PDF gerado saía em branco
depois do cabeçalho.

Corrigido nesta entrega: o `autoTable` entra com os itens e a linha de total, o rodapé ganhou
carimbo de data e paginação, e foi removida uma duplicata na geração consolidada que criaria uma
página em branco entre notas.

### 4.4 Camada de cache

`src/lib/bi/faturamento-detalhe-db.ts` implementa o IndexedDB:

- Store `itens` com `keyPath` = `empresa|pedido|item|nr_nota` e índice por `data_nota`
- Store `meta` com o estado da última carga
- `substituirBase` emite todas as gravações em rajada síncrona na mesma transação — aguardar entre
  `put` deixaria a transação autocomitar antes da última gravação, com perda parcial
- `mergeDelta` faz `upsert` por chave e poda o que saiu da janela de 12 meses
- `consultar` replica filtros, resumo e paginação da API, localmente

### 4.5 Detalhe que vale registrar

A reescrita desta tela **existia nos commits** `84a9089d` e `e42b7e79`, mas foi commitada por
engano como `page._old.txt` em vez de `page.tsx`. Na prática a tela publicada continuou servindo a
versão antiga e os componentes novos ficaram órfãos, sem import. Identificamos na revisão e
portamos o conteúdo para o arquivo certo — com a correção do PDF acima, que só apareceu ao ler o
código em vez de confiar no commit.

### 4.6 Qualidade

- `tsc --noEmit`: **sem erros**
- Suíte completa: **307 arquivos, 1.686 testes, todos verdes**
- 11 testes novos cobrindo: agrupamento por NF, totais consolidados, expansão, busca livre, seleção
  com PDF na orientação escolhida, limpeza de seleção, bloqueio sem base carregada, aviso de
  integração inexistente, aplicação de filtros e restauração no "Limpar"
- `next build`: **verde** (precisa de `NODE_OPTIONS=--max-old-space-size=8192` nesta máquina —
  o default estoura o heap do Node, não é problema do código)

---

## 5. Como o usuário acessa

1. Entra em `/bi/integracoes` e clica em **Ver detalhes** no card Faturamento
2. Na primeira vez, clica em **Carregar base** — a API lê 12 meses do ERP e popula o cache local
3. Da segunda em diante, navega, filtra, agrupa e gera PDF **sem tocar na API**
4. **Atualizar** traz só as notas novas desde a última carga (botão liberado só após a carga completa)

---

## 6. Estado e próximos passos

**Pronto e em produção** em `https://dgbcomex.vercel.app/bi/integracoes/faturamento`.

| Item | Situação |
|------|----------|
| API (4 endpoints + opções, escopo protegido, 14 testes) | Concluído |
| Migration `1005` no Neon | Concluída |
| Cache IndexedDB com carga, delta e consulta local | Concluído |
| Tela: agrupamento, seleção, expansão, KPIs, gráficos, PDF | Concluído |
| Testes (11 da tela, suíte completa verde) | Concluído |
| **Carga inicial da base de 12 meses em produção** | **Pendente** — exige a credencial da integração cadastrada |
| Exportar para XLSX (hoje só CSV) | Backlog |
| Persistir a seleção de notas entre sessões | Backlog |

**O passo que depende de credencial:** o botão "Carregar base" só funciona com a integração de
faturamento cadastrada em Admin → Integrações, apontando para a API com o escopo
`faturamento:leitura` liberado.

---

## Apêndice — Referência técnica rápida

**API — fonte do dado (SQL Server):**
```sql
DBProDash.dbo.vwFaturamento vf
  join Fat_Pedido fp        on fp.Empresa = vf.Empresa and fp.Pedido = vf.Pedido
  left join (Fat_Vend_Pedido agregado por nota) vc on ...   -- 1 vendedor por nota
  left join Rec_Vendedores rv on rv.Codigo_Vendedores = vc.Vendedor
```

**DGBComex — fluxo do navegador:**
```
GET  /api/integracao/listar?tela=bi                 → acha a integração de faturamento
POST /api/integracao/{id}/detalhe/faturamento-detalhe/carga  → carga 12 meses
GET  /api/integracao/{id}/detalhe/faturamento-detalhe?pagina=N&por_pagina=500  → dump
POST /api/integracao/{id}/detalhe/faturamento-detalhe/sync   → delta
      ↓ tudo populando o IndexedDB
consultar(filtros, pagina, 500)  → roda local, sem rede
```

**Repositórios:**
- `api-microdata` — `app/src/api/routers/faturamento_detalhe.py`, `app/alembic/versions/1005_neon_faturamento_detalhe.py`, `app/tests/test_faturamento_detalhe.py`
- `dgbcomex` — `src/app/(dashboard)/bi/integracoes/faturamento/`, `src/lib/bi/faturamento-detalhe-db.ts`