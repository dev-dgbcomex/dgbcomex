// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"

import { renderPage } from "@/test/harness"
import { CartaoKpi } from "./cartao-kpi"

/**
 * Card de indicador das telas de custos administrativos. O que importa aqui é a
 * identidade visual: a cor e o ícone saem do título, então o mesmo indicador
 * tem sempre a mesma cara.
 */
describe("CartaoKpi", () => {
  it("mostra título, descrição e conteúdo", () => {
    renderPage(
      <CartaoKpi titulo="Faturamento" descricao="Total do período">
        R$ 1.000,00
      </CartaoKpi>
    )

    expect(screen.getByText("Faturamento")).toBeInTheDocument()
    expect(screen.getByText("Total do período")).toBeInTheDocument()
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument()
  })

  it("pinta o card com a cor do tema Dracula derivada do título", () => {
    renderPage(<CartaoKpi titulo="Faturamento">R$ 1.000,00</CartaoKpi>)

    const cartao = screen.getByText("Faturamento").closest("div")!
    const estilo = cartao.getAttribute("style") ?? ""
    expect(estilo).toContain("--card-fundo")
    expect(estilo).toContain("--card-borda")
    expect(estilo).toContain("--card-realce")
    expect(cartao.className).toContain("bg-[image:var(--card-fundo)]")
  })

  it("mostra um pequeno ícone junto do título", () => {
    const { container } = renderPage(<CartaoKpi titulo="Faturamento">R$ 1.000,00</CartaoKpi>)

    expect(container.querySelector("svg.lucide-banknote")).not.toBeNull()
  })

  it("o mesmo título recebe sempre o mesmo ícone", () => {
    const { container: a } = renderPage(<CartaoKpi titulo="Mês atual">1</CartaoKpi>)
    const { container: b } = renderPage(<CartaoKpi titulo="Mês atual">1</CartaoKpi>)

    expect(a.querySelector("svg")?.getAttribute("class")).toBe(
      b.querySelector("svg")?.getAttribute("class")
    )
  })
})
