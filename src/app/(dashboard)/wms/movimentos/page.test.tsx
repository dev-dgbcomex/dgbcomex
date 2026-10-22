// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"
import MovimentosPage from "./page"

const movimentos = [
  {
    id: 1,
    tipo: "ENTRADA",
    estoqueId: 9,
    nroRolo: "R100",
    nroPeca: "1",
    origem: null,
    destino: "A-01-01",
    metros: "55.60",
    peso: "13.90",
    observacao: null,
    createdAt: "2026-10-22T10:00:00.000Z",
  },
]

const enderecos = [{ id: 5, codigo: "A-01-01", tipo: "PULMAO", ativo: true }]

const alocadas = [{ id: 9, nroRolo: "R100", nroPeca: "1", enderecoId: 5 }]

function mock() {
  return createFetchMock(({ method, url }) => {
    if (method === "GET" && url === "/api/wms/movimentos?limite=100") return { json: movimentos }
    if (method === "GET" && url === "/api/wms/enderecos") return { json: enderecos }
    if (method === "GET" && url === "/api/wms/estoque/alocado") return { json: alocadas }
    if (method === "POST" && url === "/api/wms/movimentos") return { status: 201, json: { ok: true } }
    return { status: 404, json: {} }
  })
}

describe("WMS — movimentos", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/movimentos")
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("lista o histórico de movimentos", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<MovimentosPage />)

    expect((await screen.findAllByText("Rolo R100 / Peça 1")).length).toBeGreaterThan(0)
    expect(screen.getByText("ENTRADA")).toBeTruthy()
    expect(screen.getByText("A-01-01")).toBeTruthy()
  })

  it("mostra estado vazio quando não há movimentos", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/wms/movimentos?limite=100") return { json: [] }
      if (method === "GET" && url === "/api/wms/enderecos") return { json: [] }
      if (method === "GET" && url === "/api/wms/estoque/alocado") return { json: [] }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<MovimentosPage />)

    expect(await screen.findByText("Nenhum movimento registrado.")).toBeTruthy()
  })

  it("registra uma transferência", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    const { container } = renderPage(<MovimentosPage />)
    await screen.findAllByText("Rolo R100 / Peça 1")

    fireEvent.change(screen.getByLabelText("Peça alocada *"), { target: { value: "9" } })
    fireEvent.change(screen.getByLabelText("Endereço de destino *"), { target: { value: "5" } })
    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Movimento registrado"))
    const post = findCall(fetchMock.calls, "/api/wms/movimentos", "POST")
    expect(post?.body).toMatchObject({ tipo: "TRANSFERENCIA", estoqueId: 9, enderecoDestinoId: 5 })
  })
})
