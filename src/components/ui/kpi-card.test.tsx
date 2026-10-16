// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"

import { renderPage } from "@/test/harness"
import { KpiCard } from "./kpi-card"

/**
 * O card é compartilhado por faturamento e contas pagas. Estes testes fixam o que as
 * duas telas dependem: a classe que dá a identidade visual (é o que faz "igual ao
 * do faturamento" continuar verdade depois do próximo ajuste de estilo) e o rótulo
 * acessível do valor, que as páginas usam para anunciar o total.
 */
describe("KpiCard", () => {
  it("usa o mesmo desenho do card do faturamento", () => {
    renderPage(<KpiCard rotulo="Faturamento" valor="R$ 1.000,00" detalhe="118 notas" />)

    const cartao = screen.getByText("Faturamento").parentElement!
    expect(cartao.className).toContain("shadow-sm")
    expect(cartao.className).toContain("rounded-xl")
    // O valor é `text-xl`: era `text-2xl` na tela de contas pagas, e é a diferença
    // que o olho pegava entre os dois cards.
    expect(screen.getByText("R$ 1.000,00").className).toContain("text-xl")
  })

  it("mostra a janela do card logo abaixo do rotulo", () => {
    renderPage(
      <KpiCard
        rotulo="Mês atual"
        periodo="01/09/2026 a 30/09/2026"
        valor="R$ 1.724.382,10"
        detalhe="118 baixas"
      />
    )

    expect(screen.getByText("01/09/2026 a 30/09/2026")).toBeInTheDocument()
    expect(screen.getByText("118 baixas")).toBeInTheDocument()
  })

  it("com statusLabel o valor vira status com nome acessível", () => {
    renderPage(
      <KpiCard rotulo="Mês atual" valor="R$ 10,00" statusLabel="total do mês atual" />
    )

    expect(screen.getByRole("status", { name: "total do mês atual" })).toHaveTextContent(
      "R$ 10,00"
    )
  })

  it("sem statusLabel o valor é texto comum", () => {
    renderPage(<KpiCard rotulo="Faturamento" valor="R$ 10,00" />)

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
