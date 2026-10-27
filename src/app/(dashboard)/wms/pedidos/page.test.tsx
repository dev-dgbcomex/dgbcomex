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
    artigos: "BELGA, OXFORD",
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
    artigos: "OXFORD",
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
    if (method === "GET" && url.startsWith("/api/wms/kanban/ordem")) {
      return { json: {} }
    }
    if (method === "POST" && url === "/api/wms/kanban/reordenar") {
      return { json: { ok: true } }
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

  it("abre no modo kanban com as colunas das situações", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    expect(
      await screen.findByRole("region", { name: "Coluna Sem separação" })
    ).toBeTruthy()
    expect(screen.getByRole("region", { name: "Coluna Liberado" })).toBeTruthy()
    expect(screen.getByRole("region", { name: "Coluna Em separação" })).toBeTruthy()
    expect(screen.getByText("#00005902")).toBeTruthy()
    expect(screen.getByText("Cliente Teste")).toBeTruthy()
  })

  it("mostra os artigos do pedido no card", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    expect(await screen.findByText(/Artigos: BELGA, OXFORD/)).toBeTruthy()
  })

  it("mostra estado vazio quando não há pedidos", async () => {
    const fetchMock = createFetchMock(({ url }) => {
      if (url === URL_LISTA) return { json: { itens: [], total: 0 } }
      if (url === URL_SITUACOES) {
        return { json: { itens: situacoes, total: situacoes.length } }
      }
      return { json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    expect(await screen.findByText("Nenhum pedido liberado encontrado.")).toBeTruthy()
  })

  it("ordena os cards pela posição salva do kanban", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === URL_LISTA) {
        return { json: { itens: pedidos, total: 2 } }
      }
      if (method === "GET" && url === URL_SITUACOES) {
        return { json: { itens: situacoes, total: situacoes.length } }
      }
      if (method === "GET" && url.startsWith("/api/wms/kanban/ordem")) {
        return { json: { EM_SEPARACAO: {} } }
      }
      return { json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    expect(await screen.findByText("#00006094")).toBeTruthy()
  })

  it("exibe a lista ao alternar a visualização", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("#00005902")

    fireEvent.click(screen.getByRole("button", { name: "Lista" }))

    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy())
    expect(screen.getByText("462.00")).toBeTruthy()
  })

  it("abre a ordem de um pedido já em separação", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("#00006094")

    const link = screen.getByRole("link", { name: "Abrir ordem #7" })
    expect(link.getAttribute("href")).toBe("/wms/separacoes/7")
  })

  it("respeita a ordem vertical salva na coluna", async () => {
    const naMesmaColuna = [
      pedidos[0],
      {
        ...pedidos[1],
        situacaoId: 1,
        situacaoNome: "Sem separação",
        separacaoId: null,
        separacaoStatus: "SEM_SEPARACAO",
      },
    ]
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === URL_LISTA) {
        return { json: { itens: naMesmaColuna, total: 2 } }
      }
      if (method === "GET" && url === URL_SITUACOES) {
        return { json: { itens: situacoes, total: situacoes.length } }
      }
      if (method === "GET" && url.startsWith("/api/wms/kanban/ordem")) {
        return {
          json: { SEM_SEPARACAO: { "13|00005902": 1, "13|00006094": 0 } },
        }
      }
      return { json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)

    await screen.findAllByText(/#00005902|#00006094/)
    await waitFor(() => {
      const cards = screen.getAllByText(/#00005902|#00006094/)
      expect(cards.map((card) => card.textContent)).toEqual([
        "#00006094",
        "#00005902",
      ])
    })
  })

  it("oferece o botão Ordens de Separação no topo", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("#00005902")

    const botoes = screen.getAllByRole("button", { name: /Ordens de Separação/ })
    expect(botoes.length).toBeGreaterThanOrEqual(1)
  })

  it("carrega a ordem vertical global do kanban", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<PedidosPage />)
    await screen.findByText("#00005902")

    expect(
      findCall(fetchMock.calls, "/api/wms/kanban/ordem?tipo=PEDIDO&colunas=SEM_SEPARACAO%2CLIBERADO%2CEM_SEPARACAO%2CSEPARADO%2CCANCELADO", "GET")
    ).toBeTruthy()
  })
})
