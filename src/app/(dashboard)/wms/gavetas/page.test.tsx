// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage } from "@/test/harness"
import GavetasPage from "./page"

const gavetas = [
  {
    codigo: "A-01-01",
    descricao: "Gaveta A",
    grupoGaveta: "1",
    zona: "DEPÓSITO",
    setor: "Estoque",
    fazSugestao: "S",
    estoquePlano: "N",
    confirmarTransferencia: "N",
    pecas: 12,
    metros: 320.5,
  },
  {
    codigo: "PACKLIST",
    descricao: "Packlist",
    grupoGaveta: "5",
    zona: "TRANSPORTE",
    setor: "Expedição",
    fazSugestao: "N",
    estoquePlano: "N",
    confirmarTransferencia: "S",
    pecas: 3,
    metros: 45,
  },
]

const URL_BASE = "/api/wms/gavetas?busca=&zona=&limite=100&offset=0"

describe("WMS — gavetas", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/gavetas")
  })

  it("mostra as gavetas no kanban agrupadas por zona", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_BASE ? { json: { itens: gavetas, total: 2 } } : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<GavetasPage />)

    expect(await screen.findByText("A-01-01")).toBeTruthy()
    expect(screen.getByText("PACKLIST")).toBeTruthy()
    expect(screen.getAllByText("DEPÓSITO").length).toBeGreaterThan(0)
    expect(screen.getAllByText("TRANSPORTE").length).toBeGreaterThan(0)
    expect(screen.getByText("12 pç")).toBeTruthy()
  })

  it("mostra estado vazio quando não há gavetas", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_BASE ? { json: { itens: [], total: 0 } } : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<GavetasPage />)

    expect(await screen.findByText("Nenhuma gaveta encontrada.")).toBeTruthy()
  })

  it("filtra por zona", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_BASE ? { json: { itens: gavetas, total: 2 } } : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<GavetasPage />)
    await screen.findByText("A-01-01")

    fireEvent.change(screen.getByLabelText("Filtrar por zona"), {
      target: { value: "TRANSPORTE" },
    })

    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, URL_BASE.replace("zona=&", "zona=TRANSPORTE&"))
      ).toBeTruthy()
    )
  })

  it("mostra a lista com ocupação das gavetas", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_BASE ? { json: { itens: gavetas, total: 2 } } : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<GavetasPage />)
    await screen.findByText("A-01-01")

    fireEvent.click(screen.getByRole("button", { name: "Lista" }))

    expect(await screen.findByText("320.50")).toBeTruthy()
    expect(screen.getByText("Expedição")).toBeTruthy()
  })
})
