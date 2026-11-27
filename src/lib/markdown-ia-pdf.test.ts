import { describe, expect, it } from "vitest"
import { blocosMarkdownIaPdf, textoInlineMarkdownIa } from "./markdown-ia-pdf"

describe("blocosMarkdownIaPdf", () => {
  it("extrai títulos, parágrafos e markdown inline limpo", () => {
    const blocos = blocosMarkdownIaPdf("## Diagnóstico\n\nTexto com **negrito**, `código` e [link](https://x.com).")

    expect(blocos).toEqual([
      { tipo: "titulo", nivel: 2, texto: "Diagnóstico" },
      { tipo: "paragrafo", texto: "Texto com negrito, código e link." },
    ])
  })

  it("transforma tabela compactada em cabeçalho e linhas", () => {
    const blocos = blocosMarkdownIaPdf("| Registro | Classe | |---|---| | Alpha | AEC | | Beta | EQL |")

    expect(blocos).toContainEqual({
      tipo: "tabela",
      cabecalhos: ["Registro", "Classe"],
      linhas: [
        ["Alpha", "AEC"],
        ["Beta", "EQL"],
      ],
    })
  })

  it("reconhece checklist, citação, separador e bloco de código", () => {
    const blocos = blocosMarkdownIaPdf(
      "[ ] Negociar proposta\n[x] Agendar visita\n\n> Atenção aos AEC\n\n---\n\n```\nlinha de código\n```"
    )

    expect(blocos).toContainEqual({
      tipo: "lista",
      itens: [
        { texto: "Negociar proposta", tipo: "tarefa", nivel: 0 },
        { texto: "Agendar visita", tipo: "tarefaConcluida", nivel: 0 },
      ],
    })
    expect(blocos).toContainEqual({ tipo: "citacao", texto: "Atenção aos AEC" })
    expect(blocos).toContainEqual({ tipo: "separador" })
    expect(blocos).toContainEqual({ tipo: "codigo", linhas: ["linha de código"] })
  })
})

describe("textoInlineMarkdownIa", () => {
  it("remove formatação sem perder o conteúdo", () => {
    expect(textoInlineMarkdownIa("**AEC** com `_risco_` e [detalhe](/rota)")).toBe(
      "AEC com risco e detalhe"
    )
  })
})
