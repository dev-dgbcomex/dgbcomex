// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { ClienteSaudeModal } from "./cliente-saude-modal"
import { ClienteSaudeTable } from "./cliente-saude-table"
import type { ClienteSaude } from "@/lib/crm/visitas-saude"

function cliente(overrides: Partial<ClienteSaude> = {}): ClienteSaude {
  return {
    id: 1,
    tipo: "cliente",
    nome: "Cliente Alpha",
    documento: "12345678000190",
    segmento: "Têxtil",
    porte: "Médio",
    responsaveis: ["Maria"],
    statusVisitas: ["REALIZADA"],
    tiposVisita: ["PRESENCIAL"],
    statusOportunidades: ["NEGOCIADA"],
    totalVisitas: 2,
    visitasRealizadas: 2,
    visitasAgendadas: 0,
    visitasCanceladas: 0,
    ultimaVisita: "2026-11-10",
    visitasComRelato: 2,
    visitasComCheckIn: 1,
    temContato: true,
    temProposta: true,
    temOportunidade: true,
    valorEstimadoTotal: 1000,
    probabilidadeMedia: 50,
    statusOportunidadeDominante: "Negociada",
    pedidosVenda: 1,
    valorPedidosVenda: 300,
    faturamentos: 1,
    valorFaturamento: 200,
    scoreEsforco: 100,
    scoreEngajamento: 90,
    diferenca: 10,
    visitas: [
      {
        id: 11,
        dataVisita: "2026-11-10",
        hora: "10:00",
        tipo: "PRESENCIAL",
        status: "REALIZADA",
        relato: "Ata assinada com o cliente",
        checkInTime: "2026-11-10T10:00:00.000Z",
        checkOutTime: null,
        empresaNome: "Cliente Alpha",
        clienteNome: null,
        nomeAvulso: null,
        oportunidadeId: 50,
        oportunidadeTitulo: "Oportunidade 50",
        oportunidadeStatus: "NEGOCIADA",
        oportunidadeValor: 1000,
        oportunidadeProbabilidade: 50,
        propostaId: 40,
        propostaTitulo: "Proposta 40",
        propostaStatus: "NEGOCIADA",
        contatoId: 30,
        contatoNome: "João",
        criadoPorNome: "Maria",
        enderecoTexto: "Rua A, 100 - São Paulo/SP",
      },
    ],
    ...overrides,
  }
}

describe("ClienteSaudeTable", () => {
  it("renderiza scores, filtros, ações de exportação e a tabela", () => {
    render(
      <ClienteSaudeTable
        linhas={[cliente()]}
        onSelecionar={vi.fn()}
      />
    )

    expect(
      screen.getByRole("heading", { name: /Saúde da prospecção por cliente\/pessoa/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "CSV" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "PDF" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "MD" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: /Buscar cliente ou pessoa/i })).toBeInTheDocument()
    expect(screen.getAllByText("Esforço").length).toBeGreaterThan(0)
    expect(screen.getByText("100/100")).toBeInTheDocument()
    expect(screen.getAllByText("Engajamento").length).toBeGreaterThan(0)
    expect(screen.getByText("90/100")).toBeInTheDocument()
    expect(screen.getByText("Equilibrado")).toBeInTheDocument()
    expect(screen.getByText("Cliente Alpha")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Visitas R/A/C" })).toBeInTheDocument()
  })

  it("filtra pela busca e abre o detalhe da linha", () => {
    const aoSelecionar = vi.fn()
    const linha = cliente()
    const outra = cliente({ id: 2, nome: "Beta Ltda", documento: "99999999000100" })

    render(
      <ClienteSaudeTable
        linhas={[linha, outra]}
        onSelecionar={aoSelecionar}
      />
    )

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Beta" } })
    expect(screen.queryByText("Cliente Alpha")).not.toBeInTheDocument()
    expect(screen.getByText("Beta Ltda")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Beta Ltda"))
    expect(aoSelecionar).toHaveBeenCalledWith(outra)
  })

  it("mostra estado vazio quando não há registros", () => {
    render(<ClienteSaudeTable linhas={[]} onSelecionar={vi.fn()} />)
    expect(
      screen.getByText(/Nenhum cliente\/pessoa encontrado com os filtros atuais/i)
    ).toBeInTheDocument()
  })
})

describe("ClienteSaudeModal", () => {
  it("mostra o detalhamento das visitas e os links vinculados", () => {
    const aoFechar = vi.fn()
    render(<ClienteSaudeModal cliente={cliente()} onClose={aoFechar} />)

    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: /Cliente Alpha — detalhamento das visitas/i })
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Ata assinada com o cliente")).toBeInTheDocument()
    expect(within(dialog).getByText(/Check-in:/)).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: /#11/ })).toHaveAttribute(
      "href",
      "/comercial/crm/visitas/11"
    )
    expect(within(dialog).getByRole("link", { name: "Oportunidade 50" })).toHaveAttribute(
      "href",
      "/comercial/crm/oportunidades/50"
    )
    expect(within(dialog).getByRole("link", { name: "Proposta 40" })).toHaveAttribute(
      "href",
      "/comercial/crm/propostas/40"
    )
  })

  it("não renderiza conteúdo sem cliente selecionado", () => {
    render(<ClienteSaudeModal cliente={null} onClose={vi.fn()} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
