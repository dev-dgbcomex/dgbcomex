// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"
import PedidosPage from "./page"

const pedidos = [
  {
    empresa: "13",
    pedido: "00005902",
    clienteCodigo: "1",
    clienteNome: "Cliente Teste",
    dataPedido: "2026-10-01",
    dataEntrega: "2026-10-20",
    status: "2",
    totalItens: 2,
    saldoMetros: 462,
    separacaoId: null,
    separacaoStatus: "SEM_SEPARACAO",
  },
  {
    empresa: "13",
    pedido: "00006094",
    clienteCodigo: "2",
    clienteNome: "Outro Cliente",
    dataPedido: "2026-10-02",
    dataEntrega: "2026-10-22",
    status: "2",
    totalItens: 1,
    saldoMetros: 384,
    separacaoId: 7,
    separacaoStatus: "EM_SEPARACAO",
  },
]

const URL_LISTA = "/api/wms/pedidos?busca=&statusSeparacao=&limite=50&offset=0"

function mock() {
  return createFetchMock(({ method, url }) => {
    if (method === "GET" && url === URL_LISTA) {
      return { json: { itens: pedidos, total: 2 } }
    }
    if (method === "POST" && url === "/api/wms/separacoes") {
      return { status: 201, json: { id: 9 } }
    }
    return { status: 404, json: {} }
  })
}

describe("WMS — pedidos para separação", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/pedidos")
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("lista os pedidos liberados com a situação da separação", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    expect(await screen.findByText("00005902")).toBeTruthy()
    expect(screen.getByText("Cliente Teste")).toBeTruthy()
    expect(screen.getAllByText("Sem separação").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Em separação").length).toBeGreaterThan(0)
    expect(screen.getByText("462.00")).toBeTruthy()
  })

  it("mostra estado vazio quando não há pedidos", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_LISTA ? { json: { itens: [], total: 0 } } : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    expect(await screen.findByText("Nenhum pedido liberado encontrado.")).toBeTruthy()
  })

  it("marca o pedido para separação e abre a ordem criada", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("00005902")

    fireEvent.click(screen.getByRole("button", { name: "Marcar" }))

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Pedido marcado para separação")
    )
    const post = findCall(fetchMock.calls, "/api/wms/separacoes", "POST")
    expect(post?.body).toEqual({ empresa: "13", pedido: "00005902" })
    expect(navMock.router.push).toHaveBeenCalledWith("/wms/separacoes/9")
  })

  it("abre a ordem de um pedido já em separação", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("00006094")

    const link = screen.getByRole("link", { name: "Abrir ordem" })
    expect(link.getAttribute("href")).toBe("/wms/separacoes/7")
  })

  it("exibe o erro da API ao falhar a marcação", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === URL_LISTA) {
        return { json: { itens: pedidos, total: 2 } }
      }
      if (method === "POST" && url === "/api/wms/separacoes") {
        return { status: 409, json: { error: "Pedido já possui ordem ativa" } }
      }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("00005902")

    fireEvent.click(screen.getByRole("button", { name: "Marcar" }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Pedido já possui ordem ativa")
    )
  })
})
