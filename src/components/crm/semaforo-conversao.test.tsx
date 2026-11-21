// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { SemaforoConversao } from "./semaforo-conversao"

describe("SemaforoConversao", () => {
  it("mostra as três faixas com quantidades e rótulos", () => {
    render(
      <SemaforoConversao contagem={{ QUENTE: 2, MORNO: 1, FRIO: 4 }} entidade="leads" />
    )

    const semaforo = screen.getByRole("region", { name: "Semáforo de conversão" })
    expect(within(semaforo).getByText("Quentes")).toBeInTheDocument()
    expect(within(semaforo).getByText("Oportunidade em negociação")).toBeInTheDocument()
    expect(within(semaforo).getByText("Mornos")).toBeInTheDocument()
    expect(within(semaforo).getByText("Oportunidade em proposta")).toBeInTheDocument()
    expect(within(semaforo).getByText("Frios")).toBeInTheDocument()
    expect(within(semaforo).getByText("Sem oportunidade em negociação ou proposta")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Quentes: 2 leads — Oportunidade em negociação")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Mornos: 1 leads — Oportunidade em proposta")).toBeInTheDocument()
    expect(
      within(semaforo).getByLabelText("Frios: 4 leads — Sem oportunidade em negociação ou proposta")
    ).toBeInTheDocument()

    const cards = screen.getAllByLabelText(/—/)
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveClass("card-hover", "rounded-xl", "bg-[image:var(--card-fundo)]")
    expect(cards[0].querySelector("svg")).not.toBeNull()
  })
})
