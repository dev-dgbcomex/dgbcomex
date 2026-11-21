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
    expect(within(semaforo).getByText("Em negociação")).toBeInTheDocument()
    expect(within(semaforo).getByText("Mornos")).toBeInTheDocument()
    expect(within(semaforo).getByText("Em proposta")).toBeInTheDocument()
    expect(within(semaforo).getByText("Frios")).toBeInTheDocument()
    expect(within(semaforo).getByText("Novo, qualificação ou sem oportunidade")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Quentes: 2 leads — Em negociação")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Mornos: 1 leads — Em proposta")).toBeInTheDocument()
    expect(
      within(semaforo).getByLabelText("Frios: 4 leads — Novo, qualificação ou sem oportunidade")
    ).toBeInTheDocument()
  })
})
