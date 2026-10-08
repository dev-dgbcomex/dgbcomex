// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import LandingPage from "./page"

describe("LandingPage", () => {
  it("mostra DGBCOMEX no topo (header) e no centro (h1)", () => {
    render(<LandingPage />)
    expect(screen.getByRole("heading", { level: 1, name: "DGBCOMEX" })).toBeInTheDocument()
    expect(screen.getAllByText("DGBCOMEX")).toHaveLength(2)
    expect(screen.queryByText("PDM·PRO·TÊXTIL")).not.toBeInTheDocument()
  })

  it("mostra o subtítulo 'Sistema Operacional Comex'", () => {
    render(<LandingPage />)
    expect(screen.getByText("Sistema Operacional Comex")).toBeInTheDocument()
    expect(
      screen.queryByText("Sistema de gestão de desenvolvimento de produtos têxteis")
    ).not.toBeInTheDocument()
  })

  it("não mostra mais o departamento PCP e mantém os demais", () => {
    render(<LandingPage />)
    expect(screen.queryByText("PCP")).not.toBeInTheDocument()
    expect(screen.queryByText("Planejamento")).not.toBeInTheDocument()
    expect(screen.getByText("Comercial")).toBeInTheDocument()
    expect(screen.getAllByText("CRM").length).toBeGreaterThan(0)
    expect(screen.getByText("Desenvolvimento")).toBeInTheDocument()
    expect(screen.getByText("Admin")).toBeInTheDocument()
    expect(screen.getByText("Ferramentas")).toBeInTheDocument()
  })
})
