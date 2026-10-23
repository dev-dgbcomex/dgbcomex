// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"
import PedidosPage from "./page"

const situacoes = [
  { id: 1, nome: "Sem separação", codigo: "SEM_SEPARACAO", cor: "#94a3b8", ordem: 0, acao: "NENHUMA", perfis: ["COMERCIAL"], ativo: true, sistema: true },
  { id: 2, nome: "Liberado", codigo: "LIBERADO", cor: "#f59e0b", ordem: 1, acao: "NENHUMA", perfis: ["COMERCIAL"], ativo: true, sistema: true },
  { id: 3, nome: "Em separação", codigo: "EM_SEPARACAO", cor: "#2563eb", ordem: 2, acao: "CRIAR_ORDEM", perfis: ["COMERCIAL", "EXPEDICAO"], ativo: true, sistema: true },
  { id: 4, nome: "Separado", codigo: "SEPARADO", cor: "#16a34a", ordem: 3, acao: "CONCLUIR_ORDEM", perfis: ["COMERCIAL", "EXPEDICAO"], ativo: true, sistema: true },
  { id: 5, nome: "Cancelado", codigo: "CANCELADO", cor: "#ef4444", ordem: 4, acao: "CANCELAR_ORDEM", perfis: ["COMERCIAL"], ativo: true, sistema: true },
]

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
    situacaoId: 1,
    situacaoNome: "Sem separação",
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
    situacaoId: 3,
    situacaoNome: "Em separação",
  },
]

const URL_LISTA = "/api/wms/pedidos?busca=&statusSeparacao=&limite=50&offset=0"
const URL_SITUACOES = "/api/wms/situacoes"

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "COMERCIAL" } }, status: "authenticated" }),
}))

function mock() {
  return createFetchMock(({ method, url }) => {
    if (method === "GET" && url === URL_LISTA) {
      return { json: { itens: pedidos, total: 2 } }
    }
    if (method === "GET" && url === URL_SITUACOES) {
      return { json: { itens: situacoes, total: situacoes.length } }
    }
    if (method === "POST" && url.includes("/situacao")) {
      return { json: { ...pedidos[0], situacaoId: 2 } }
    }
    return { status: 404, json: {} }
  })
}

describe("WMS - pedidos para separação", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/pedidos")
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("lista os pedidos liberados com a situação do kanban", async () => {
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
    const fetchMock = createFetchMock(({ url }) => {
      if (url === URL_LISTA) return { json: { itens: [], total: 0 } }
      if (url === URL_SITUACOES) {
        return { json: { itens: situacoes, total: situacoes.length } }
      }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    expect(await screen.findByText("Nenhum pedido liberado encontrado.")).toBeTruthy()
  })

  it("move o pedido para outra situação pelo seletor e recarrega a lista", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("00005902")

    fireEvent.change(screen.getByLabelText("Mover pedido 00005902"), {
      target: { value: "2" },
    })

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Pedido movido para Liberado")
    )
    const post = findCall(fetchMock.calls, "/api/wms/pedidos/13/00005902/situacao", "POST")
    expect(post?.body).toEqual({ situacaoId: 2 })
  })

  it("exibe o erro da API ao falhar o movimento", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === URL_LISTA) {
        return { json: { itens: pedidos, total: 2 } }
      }
      if (method === "GET" && url === URL_SITUACOES) {
        return { json: { itens: situacoes, total: situacoes.length } }
      }
      if (method === "POST" && url.includes("/situacao")) {
        return { status: 409, json: { error: "Pedido já possui ordem ativa" } }
      }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("00005902")

    fireEvent.change(screen.getByLabelText("Mover pedido 00005902"), {
      target: { value: "2" },
    })

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Pedido já possui ordem ativa")
    )
  })

  it("abre a ordem de um pedido já em separação", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("00006094")

    const link = screen.getByRole("link", { name: "Abrir ordem" })
    expect(link.getAttribute("href")).toBe("/wms/separacoes/7")
  })

  it("mostra o kanban com colunas dinâmicas", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("00005902")

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("region", { name: "Coluna Liberado" })).toBeTruthy()
    expect(screen.getByRole("region", { name: "Coluna Em separação" })).toBeTruthy()
    expect(screen.getByText("Pedido 00005902")).toBeTruthy()
  })
})
