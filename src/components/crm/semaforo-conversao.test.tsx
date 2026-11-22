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
    totalOportunidades: 5,
    totalPedidos: 1,
    totalVisitas: 4,
    totalAcoes: 2,
    totalOportunidadesProposta: 2,
    totalOportunidadesNegociacao: 3,
    href: "/comercial/crm/leads/1",
  },
  {
    id: 2,
    faixaConversao: "MORNO",
    nome: "Confecções Lima",
    documento: "98.765.432/0001-10",
    status: "NOVO",
    totalOportunidades: 1,
    totalPedidos: 0,
    totalVisitas: 2,
    totalAcoes: 1,
    totalOportunidadesProposta: 1,
    totalOportunidadesNegociacao: 0,
    href: "/comercial/crm/leads/2",
  },
  {
    id: 3,
    faixaConversao: "FRIO",
    nome: "Malhas Frias",
    documento: "33.333.333/0001-33",
    status: "NOVO",
    totalOportunidades: 0,
    totalPedidos: 0,
    totalVisitas: 0,
    totalAcoes: 0,
    totalOportunidadesProposta: 0,
    totalOportunidadesNegociacao: 0,
    href: "/comercial/crm/leads/3",
  },
  {
    id: 4,
    faixaConversao: null,
    nome: "Sem Oportunidade",
    documento: "44.444.444/0001-44",
    status: "INATIVO",
    totalOportunidades: 0,
    totalPedidos: 0,
    totalVisitas: 0,
    totalAcoes: 0,
    totalOportunidadesProposta: 0,
    totalOportunidadesNegociacao: 0,
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
    expect(within(semaforo).getByText("Negociação ou ganho/pedido no mês")).toBeInTheDocument()
    expect(within(semaforo).getByText("Mornos")).toBeInTheDocument()
    expect(within(semaforo).getByText("Proposta ou ganho/pedido no trimestre")).toBeInTheDocument()
    expect(within(semaforo).getByText("Frios")).toBeInTheDocument()
    expect(within(semaforo).getByText("Sem negociação, proposta ou ganho/pedido no trimestre")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Quentes: 1 leads — Negociação ou ganho/pedido no mês")).toBeInTheDocument()
    expect(within(semaforo).getByLabelText("Mornos: 1 leads — Proposta ou ganho/pedido no trimestre")).toBeInTheDocument()
    expect(
      within(semaforo).getByLabelText("Frios: 2 leads — Sem negociação, proposta ou ganho/pedido no trimestre")
    ).toBeInTheDocument()

    const cards = screen.getAllByLabelText(/—/)
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveAttribute("role", "button")
    expect(cards[0]).toHaveClass("card-hover", "rounded-xl", "min-h-[9rem]")
    expect(cards[0].querySelector("svg")).not.toBeNull()

    const descricoes = screen.getAllByTitle("Sem negociação, proposta ou ganho/pedido no trimestre")
    expect(descricoes[0]).toHaveClass("line-clamp-2", "min-h-[2.25rem]")
    expect(descricoes[0]).not.toHaveClass("truncate")
  })

  it("abre o modal com apenas os registros da faixa clicada", () => {
    renderSemaforo()

    fireEvent.click(screen.getByLabelText("Quentes: 1 leads — Negociação ou ganho/pedido no mês"))

    const dialog = screen.getByRole("dialog", { name: "Quentes — Leads" })
    expect(within(dialog).getByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(within(dialog).getByText("Alpha Confecções")).toBeInTheDocument()
    expect(within(dialog).queryByText("Confecções Lima")).not.toBeInTheDocument()
    expect(within(dialog).queryByRole("columnheader", { name: "Status cadastral" })).not.toBeInTheDocument()
    for (const coluna of ["Oportunidades", "Pedidos", "Visitas", "Ações"]) {
      expect(within(dialog).getByRole("columnheader", { name: coluna })).toBeInTheDocument()
    }
    const linha = within(dialog).getByRole("row", { name: /Tecelagem Alpha/ })
    expect(within(linha).getByText("12.345.678/0001-90")).toBeInTheDocument()
    expect(within(linha).getByText("2 Proposta")).toBeInTheDocument()
    expect(within(linha).getByText("3 Negociação")).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: /Tecelagem Alpha/ })).toHaveAttribute(
      "href",
      "/comercial/crm/leads/1"
    )
    expect(within(dialog).getByText("A lista acompanha os filtros ativos da tela.")).toBeInTheDocument()
  })

  it("abre o modal com a tecla Enter", () => {
    renderSemaforo()

    fireEvent.keyDown(
      screen.getByLabelText("Frios: 2 leads — Sem negociação, proposta ou ganho/pedido no trimestre"),
      { key: "Enter" }
    )

    const dialog = screen.getByRole("dialog", { name: "Frios — Leads" })
    expect(within(dialog).getByText("Malhas Frias")).toBeInTheDocument()
    expect(within(dialog).getByText("Sem Oportunidade")).toBeInTheDocument()
    const linha = within(dialog).getByRole("row", { name: /Malhas Frias/ })
    expect(within(linha).getAllByText("—").length).toBeGreaterThan(0)
  })

  it("mostra explicação e exemplos no i sem abrir a lista", () => {
    renderSemaforo()

    fireEvent.click(screen.getByRole("button", { name: "Informações da faixa Quentes" }))

    expect(screen.getByText("Quentes — negociação ou movimento do mês")).toBeInTheDocument()
    expect(screen.getByText("Exemplos Práticos")).toBeInTheDocument()
    expect(screen.getByText(/Lead com oportunidade em NEGOCIACAO/)).toBeInTheDocument()
    expect(screen.queryByRole("dialog", { name: "Quentes — Leads" })).not.toBeInTheDocument()
  })
})
