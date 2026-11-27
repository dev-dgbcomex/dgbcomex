// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MarkdownIa } from "./markdown-ia"

describe("MarkdownIa", () => {
  it("renderiza tabela, checklist e links seguros do GFM", () => {
    render(
      <MarkdownIa
        conteudo={`## Diagnóstico

| Registro | Classe |
| --- | --- |
| Alpha | AEC |

- [ ] Agendar visita

[Ver cliente](https://exemplo.com/cliente/1)

[Inválido](javascript:alert(1))

[Malformado](http:foo)`}
      />
    )

    expect(screen.getByRole("heading", { name: "Diagnóstico" })).toBeInTheDocument()
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Registro" })).toHaveAttribute("scope", "col")
    expect(screen.getByRole("cell", { name: "Alpha" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox")).not.toBeChecked()
    expect(screen.getByRole("checkbox")).toBeDisabled()

    const link = screen.getByRole("link", { name: "Ver cliente" })
    expect(link.getAttribute("href")).toContain("https://exemplo.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.queryByRole("link", { name: "Inválido" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Malformado" })).not.toBeInTheDocument()
  })
})
