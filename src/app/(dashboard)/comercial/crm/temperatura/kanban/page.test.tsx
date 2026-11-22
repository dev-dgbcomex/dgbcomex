// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"
import type { TemperaturaItem } from "@/lib/crm/temperatura"
import KanbanTemperaturaPage from "./page"

vi.setConfig({ testTimeout: 30000 })

function item(overrides: Partial<TemperaturaItem>): TemperaturaItem {
  return {
    id: "lead-1",
    tipo: "lead",
    entidadeId: 1,
    nome: "Ação Indústria",
    documento: "12.345.678/0001-90",
    faixaConversao: "FRIO",
    totalOportunidades: 0,
    totalOportunidadesProposta: 0,
    totalOportunidadesNegociacao: 0,
    totalPedidos: 0,
    totalVisitas: 0,
    totalAcoes: 0,
    oportunidades: [],
    href: "/comercial/crm/leads/1",
    ...overrides,
  } as TemperaturaItem
}

const itens: TemperaturaItem[] = [
  item({}),
  item({
    id: "cliente-2",
    tipo: "cliente",
    entidadeId: 2,
    nome: "Cliente Lima",
    documento: "98.765.432/0001-10",
    faixaConversao: "MORNO",
    totalOportunidades: 1,
    totalOportunidadesProposta: 1,
    oportunidades: [{ id: 8, titulo: "Proposta Lima", status: "PROPOSTA" }],
    href: "/comercial/clientes/2",
  }),
  item({
    id: "lead-3",
    entidadeId: 3,
    nome: "Lead Quente",
    documento: "33.333.333/0001-33",
    faixaConversao: "QUENTE",
    totalOportunidades: 1,
    totalOportunidadesNegociacao: 1,
    oportunidades: [{ id: 9, titulo: "Negociação Quente", status: "NEGOCIACAO" }],
    href: "/comercial/crm/leads/3",
  }),
]

function payload(lista: TemperaturaItem[] = itens) {
  return {
    itens: lista,
    contagem: { QUENTE: 0, MORNO: 0, FRIO: 0 },
  }
}

function setup(lista: TemperaturaItem[] = itens) {
  let atual = payload(lista)
  const fetchMock = createFetchMock(({ method, url, body }) => {
    if (method === "GET" && url === "/api/crm/temperatura") return { json: atual }
    if (method === "POST" && url === "/api/crm/temperatura/mover") {
      const destino = body.destino as TemperaturaItem["faixaConversao"]
      atual = payload(
        lista.map((registro) =>
          registro.id === body.id ? { ...registro, faixaConversao: destino } : registro
        )
      )
      return { json: { ...atual, avisos: [] } }
    }
    return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
  })
  vi.stubGlobal("fetch", fetchMock.fn)
  renderPage(<KanbanTemperaturaPage />)
  return fetchMock
}

describe("KanbanTemperaturaPage", () => {
  beforeEach(() => {
    navMock.setPathname("/comercial/crm/temperatura/kanban")
  })

  it("carrega as três faixas e os cards com tipo e métricas", async () => {
    setup()

    expect(await screen.findByRole("heading", { name: /Kanban de Temperatura/ })).toBeInTheDocument()
    expect(await screen.findByText("3 de 3 card(s)")).toBeInTheDocument()
    for (const faixa of ["Quentes", "Mornos", "Frios"]) {
      expect(screen.getAllByText(faixa).length).toBeGreaterThan(0)
    }
    expect(screen.getByLabelText("Ação Indústria — faixa Frios")).toBeInTheDocument()
    expect(screen.getByText("Cliente")).toBeInTheDocument()
    expect(screen.getAllByText("Lead").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Informações do kanban de temperatura" })).toBeInTheDocument()
  })

  it("filtra por busca, tipo e presença de oportunidade", async () => {
    setup()

    await screen.findByText("3 de 3 card(s)")
    fireEvent.change(screen.getByLabelText("Buscar leads e clientes"), {
      target: { value: "acao" },
    })
    expect(screen.getByText("1 de 3 card(s)")).toBeInTheDocument()
    expect(screen.queryByText("Cliente Lima")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }))
    fireEvent.click(screen.getByRole("radio", { name: "Clientes" }))
    fireEvent.click(screen.getByRole("button", { name: /Com oportunidade/ }))
    expect(screen.getByText("1 de 3 card(s)")).toBeInTheDocument()
    expect(screen.getByText("Cliente Lima")).toBeInTheDocument()
    expect(screen.queryByText("Lead Quente")).not.toBeInTheDocument()
  })

  it("confirma a criação de oportunidade ao mover um card para Quentes", async () => {
    const fetchMock = setup()

    fireEvent.click(await screen.findByRole("button", { name: "Mover Ação Indústria para Quentes" }))

    const dialog = await screen.findByRole("dialog", { name: "Mover Ação Indústria para Quentes" })
    const confirmar = screen.getByRole("button", { name: "Confirmar mudança" })
    expect(confirmar).toBeDisabled()
    fireEvent.click(screen.getByLabelText("Criar nova oportunidade"))
    expect(confirmar).toBeEnabled()
    fireEvent.click(confirmar)

    await waitFor(() =>
      expect(findCall(fetchMock.calls, "/api/crm/temperatura/mover", "POST")).toBeDefined()
    )
    expect(findCall(fetchMock.calls, "/api/crm/temperatura/mover", "POST")?.body).toEqual({
      id: "lead-1",
      destino: "QUENTE",
      escolhas: { oportunidadeId: "nova" },
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Ação Indústria movido para Quentes.")
    )
    expect(dialog).not.toBeInTheDocument()
  })

  it("mostra erro quando a listagem falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "falha" }), { status: 500 }))
    )
    renderPage(<KanbanTemperaturaPage />)

    expect(
      await screen.findByText("Não foi possível carregar o kanban de temperatura.", {}, { timeout: 5000 })
    ).toBeInTheDocument()
  })
})
