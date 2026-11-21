// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { SemaforoConversao, type SemaforoConversaoItem } from "./semaforo-conversao"

const itens: SemaforoConversaoItem[] = [
  {
    id: 1,
    faixaConversao: "QUENTE",
    nome: "Tecelagem Alpha",
    subtitulo: "Alpha Confecções",
    documento: "12.345.678/0001-90",
    status: "QUALIFICADO",
    href: "/comercial/crm/leads/1",
  },
  {
    id: 2,
    faixaConversao: "MORNO",
    nome: "Confecções Lima",
    documento: "98.765.432/0001-10",
    status: "NOVO",
    href: "/comercial/crm/leads/2",
  },
  {
    id: 3,
    faixaConversao: "FRIO",
    nome: "Malhas Frias",
    documento: "33.333.333/0001-33",
    status: "NOVO",
    href: "/comercial/crm/leads/3",
  },
  {
    id: 4,
    faixaConversao: null,
    nome: "Sem Oportunidade",
    documento: "44.444.444/0001-44",
    status: "INATIVO",
    href: "/comercial/crm/leads/4",
  },
]

function renderSemaforo() {
  return render(
    <SemaforoConversao
      contagem={{ QUENTE: 1, MORNO: 1, FRIO: 2 }}
      entidade="leads"
      itens={itens}
      listagem="/comercial/crm/leads"
    />
  )
}

describe("SemaforoConversao", () => {
  it("mostra as três faixas com altura fixa e descrição alinhada", () => {
    renderSemaforo()

    const semaforo = screen.getByRole("region", { name: "Semáforo de conversão" })
    expect(within(semaforo).getByText("Quentes")).toBeInTheDocument()
    expect(within(semaforo).getByText("Oportunidade em negociação")).toBeInTheDocument()
    expect(within(semaforo).getByText("Mornos")).toBeInTheDocument()
    expect(within(semaforo).getByText("Oportunidade em proposta")).toBeInTheDocument()
    expect(within(semaforo).getByText("Frios")).toBeInTheDocument()
    expect(within(semaforo).getByText("Sem oportunidade em negociação ou proposta")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Quentes: 1 leads — Oportunidade em negociação")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Mornos: 1 leads — Oportunidade em proposta")).toBeInTheDocument()
    expect(
      within(semaforo).getByLabelText("Frios: 2 leads — Sem oportunidade em negociação ou proposta")
    ).toBeInTheDocument()

    const cards = screen.getAllByLabelText(/—/)
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveAttribute("role", "button")
    expect(cards[0]).toHaveClass("card-hover", "rounded-xl", "min-h-[9rem]")
    expect(cards[0].querySelector("svg")).not.toBeNull()

    const descricoes = screen.getAllByTitle("Sem oportunidade em negociação ou proposta")
    expect(descricoes[0]).toHaveClass("line-clamp-2", "min-h-[2.25rem]")
    expect(descricoes[0]).not.toHaveClass("truncate")
  })

  it("abre o modal com apenas os registros da faixa clicada", () => {
    renderSemaforo()

    fireEvent.click(screen.getByLabelText("Quentes: 1 leads — Oportunidade em negociação"))

    const dialog = screen.getByRole("dialog", { name: "Quentes — Leads" })
    expect(within(dialog).getByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(within(dialog).getByText("Alpha Confecções")).toBeInTheDocument()
    expect(within(dialog).queryByText("Confecções Lima")).not.toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: /Tecelagem Alpha/ })).toHaveAttribute(
      "href",
      "/comercial/crm/leads/1"
    )
    expect(within(dialog).getByText("A lista acompanha os filtros ativos da tela.")).toBeInTheDocument()
  })

  it("abre o modal com a tecla Enter", () => {
    renderSemaforo()

    fireEvent.keyDown(
      screen.getByLabelText("Frios: 2 leads — Sem oportunidade em negociação ou proposta"),
      { key: "Enter" }
    )

    const dialog = screen.getByRole("dialog", { name: "Frios — Leads" })
    expect(within(dialog).getByText("Malhas Frias")).toBeInTheDocument()
    expect(within(dialog).getByText("Sem Oportunidade")).toBeInTheDocument()
  })

  it("mostra explicação e exemplos no i sem abrir a lista", () => {
    renderSemaforo()

    fireEvent.click(screen.getByRole("button", { name: "Informações da faixa Quentes" }))

    expect(screen.getByText("Quentes — oportunidade em negociação")).toBeInTheDocument()
    expect(screen.getByText("Exemplos Práticos")).toBeInTheDocument()
    expect(screen.getByText(/Lead com status cadastral NOVO/)).toBeInTheDocument()
    expect(screen.queryByRole("dialog", { name: "Quentes — Leads" })).not.toBeInTheDocument()
  })
})
