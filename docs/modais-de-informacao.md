# Modais de Informação ("i") — regra obrigatória

> **Toda tela precisa ter o modal de informação. Toda alteração numa tela precisa atualizar o modal dela — sejam quantos campos, cards, regras ou exemplos forem afetados.**

O "i" é a documentação viva da tela, escrita em pt-BR e visível ao usuário. Ele não é opcional nem "quando der": faz parte da entrega, junto com o teste. Se a tela mudou e o modal não, a entrega está incompleta.

## 1. Como funciona

- O conteúdo fica em **`src/lib/info-content/<dominio>.ts`** (ex. `bi.ts`, `cadastros.ts`, `crm.ts`, `admin.ts`).
  - **Não** existe mais o arquivo único `src/lib/info-content.ts` — evoluiu para uma **pasta por domínio**, agregada em `src/lib/info-content/index.ts` (que monta o `Record<string, InfoContent>` e exporta `getInfoContent(pathname)`).
- A tela pega o conteúdo pela rota e renderiza o botão ao lado do título:

  ```tsx
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  // ...
  <h1>Contas Pagas — Baixas do ERP <InfoButton content={info} /></h1>
  ```

- `getInfoContent(pathname)` casa primeiro pela **rota exata** e, se não achar, pelo **prefixo mais longo** (`pathname.startsWith(key)` ou `key.startsWith(pathname)`).

## 2. Estrutura do `InfoContent`

Definido em `src/lib/info-content/types.ts`:

| Campo | O que é | Quando mexer |
|---|---|---|
| `title` | Título do modal. | Nome/tema da tela muda. |
| `description` | O que a tela é, em uma frase. | Sempre que a tela ganha/perde uma peça (card, grupo, gráfico). |
| `rules[]` | Cada regra de negócio/comportamento, uma por frase. | Mudou a dinâmica (o que segue o quê, valor padrão, o que um gráfico respeita). |
| `columns[]` | `{ name, desc }` de cada coluna/dado exibido. | Coluna nova, renomeada ou removida. |
| `fields[]` | `{ name, desc }` de cada campo, filtro, seletor e botão. | Campo/filtro/botão novo ou com comportamento novo. |
| `examples[]` | `{ title, desc }` com situações e números reais. | Sempre que dá para conferir com um caso concreto; e para **remover** exemplos obsoletos. |

## 3. Quando o modal É obrigatório mexer

Ao fazer qualquer uma destas mudanças, atualize o modal **na mesma alteração**:

- **Card/KPI novo ou removido** → `description` + `rules` (+ um `example` com número real).
- **Coluna nova/renomeada/removida** → `columns`.
- **Filtro, campo, seletor ou botão novo/alterado** (inclusive mudança de valor padrão) → `fields` e, se muda o fluxo, `rules`.
- **Mudança de regra** (o que um gráfico respeita, o que um botão faz, de onde um número vem, período padrão) → `rules` e/ou `examples`.
- **Texto obsoleto** — qualquer frase que descreva um comportamento que não existe mais **deve ser removida** (ex.: "a tela recua sozinha", "aviso azul", "as quatro janelas" quando já são cinco cards).
- **Tela nova** → o modal inteiro (`title`, `description`, `rules`, `columns`/`fields`, `examples` quando houver números reais).

Sempre se pergunte: *"o que o 'i' diz bate com o que a tela faz agora?"* Se não, corrija.

## 4. Teste obrigatório

Ao mexer no modal, atualize/crie o teste em **`src/lib/info-content/info-content.test.ts`**, cobrindo os termos-chave da nova dinâmica. Isso protege o texto contra regressão (alguém refatora a tela e esquece o "i").

Exemplo (caso real da tela de Contas Pagas):

```ts
it("o conteúdo de Contas Pagas reflete a dinâmica atual", () => {
  const result = getInfoContent("/bi/integracoes/contas-pagas")
  const texto = [
    result?.description ?? "",
    ...(result?.rules ?? []),
    ...(result?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ...(result?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
  ].join("\n")

  expect(texto).toContain("Período selecionado")
  expect(texto).toMatch(/três meses atrás/)
  expect(texto).toContain("Todos os meses do período")
  expect(texto).toMatch(/Limpar: .*período padrão/)
  // Não pode sobrar descrição de comportamento removido:
  expect(texto).not.toMatch(/aviso azul|recua sozinha|último mês fechado/i)
})
```

## 5. Passo a passo (alterar a tela)

1. Altere a tela/código.
2. Abra `src/lib/info-content/<dominio>.ts` e atualize o modal: `description`, `rules`, `columns`, `fields`, `examples` — tudo que a mudança tocar.
3. Remova frases que ficaram obsoletas.
4. Atualize/crie o teste em `src/lib/info-content/info-content.test.ts`.
5. `npx.cmd vitest run "src/lib/info-content/info-content.test.ts"` e depois a suíte completa `npm.cmd run test`.
6. `tsc --noEmit` e `npm run lint`.

## 6. Domínios existentes

`src/lib/info-content/`: `admin.ts`, `ativos.ts`, `bi.ts`, `cadastros.ts`, `chamados.ts`, `comercial.ts`, `crm.ts`, `dashboard.ts`, `documentos.ts`, `engenharia.ts`, `ferramentas.ts`, `outros.ts`, `processos.ts`, `reunioes.ts`.

Domínio novo → crie o arquivo, exporte o `Record<string, InfoContent>` e agregue no `index.ts`.
