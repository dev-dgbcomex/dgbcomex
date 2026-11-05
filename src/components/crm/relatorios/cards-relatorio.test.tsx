// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { Building2 } from "lucide-react"

import { renderPage } from "@/test/harness"
import { CardsRelatorio } from "./cards-relatorio"

/**
 * Cards de indicador dos relatórios do CRM. A identidade visual (cor e ícone do
 * tema Dracula) sai do rótulo do card, então o mesmo rótulo tem sempre a mesma
 * cara — é o que permite comparar as telas de relatório de olho.
 */
describe("CardsRelatorio", () => {
  it("mostra valor e rótulo de cada card", () => {
    renderPage(
      <CardsRelatorio
        cards={[
          { label: "Clientes", value: 12 },
          { label: "Clientes com negócio", value: 5 },
        ]}
      />
    )

    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("Clientes")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("Clientes com negócio")).toBeInTheDocument()
  })

  it("pinta cada card com a cor derivada do rótulo", () => {
    renderPage(
      <CardsRelatorio
        cards={[
          { label: "Clientes", value: 12 },
          { label: "Clientes com negócio", value: 5 },
        ]}
      />
    )

    const cartaoClientes = screen.getByText("Clientes").closest("div.rounded-xl")!
    const estilo = cartaoClientes.getAttribute("style") ?? ""
    expect(estilo).toContain("--card-fundo")
    expect(estilo).toContain("--card-borda")
    expect(cartaoClientes.className).toContain("bg-[image:var(--card-fundo)]")
  })

  it("mostra um pequeno ícone derivado do rótulo ao lado do texto", () => {
    const { container } = renderPage(
      <CardsRelatorio cards={[{ label: "Clientes com negócio", value: 5 }]} />
    )

    expect(container.querySelector("svg.lucide-handshake")).not.toBeNull()
  })

  it("mantém o ícone do card ao lado do valor", () => {
    const { container } = renderPage(
      <CardsRelatorio cards={[{ label: "Clientes", value: 12, icon: <Building2 size={18} /> }]} />
    )

    expect(container.querySelector("svg.lucide-building-2")).not.toBeNull()
  })
})
