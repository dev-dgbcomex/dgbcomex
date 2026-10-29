// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import ImportarApiModal from "./ImportarApiModal"

const INTEGRACOES = [
  {
    id: 1,
    nome: "Faturamento do Dia",
    baseUrl: "http://erp/faturamento/{data}",
    telas: ["bi"],
    ativo: true,
    mapping: {},
  },
  {
    id: 2,
    nome: "Contas Pagas",
    baseUrl: "http://erp/contas-pagas/{data}",
    telas: ["bi"],
    ativo: true,
    mapping: {},
  },
]

function mockListar(extra: Record<string, unknown>[] = []) {
  return createFetchMock(({ url }) => {
    if (url.startsWith("/api/integracao/listar")) {
      return { json: [...INTEGRACOES, ...extra] }
    }
    if (url.includes("/testar")) {
      return {
        json: {
          success: true,
          status: 200,
          responseBody: { itens: [{ pedido: "P1", valor: 10 }] },
        },
      }
    }
    return { status: 404, json: { error: `Rota não mockada: ${url}` } }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ImportarApiModal", () => {
  it("lista as integrações da tela e marca a que está em uso", async () => {
    const { fn } = mockListar()
    vi.stubGlobal("fetch", fn)

    renderPage(
      <ImportarApiModal
        tela="bi"
        existingRecords={[]}
        integracaoInicial={2}
        onClose={() => {}}
      />
    )

    expect(await screen.findByRole("button", { name: /Faturamento do Dia/ })).toBeInTheDocument()
    const emUso = screen.getByRole("button", { name: /Contas Pagas/ })
    expect(emUso).toHaveTextContent("(em uso)")
  })

  it("não lista integração de outra tela", async () => {
    const { fn } = mockListar([
      { id: 3, nome: "api-microdata-wms-pedidos", baseUrl: "http://erp/wms/pedidos", telas: ["wms"], ativo: true },
    ])
    vi.stubGlobal("fetch", fn)

    renderPage(<ImportarApiModal tela="bi" existingRecords={[]} onClose={() => {}} />)

    expect(await screen.findByRole("button", { name: /Faturamento do Dia/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /api-microdata-wms-pedidos/ })).not.toBeInTheDocument()
  })

  it("executa o endpoint escolhido e mostra os itens", async () => {
    const { fn, calls } = mockListar()
    vi.stubGlobal("fetch", fn)

    renderPage(
      <ImportarApiModal
        tela="bi"
        existingRecords={[]}
        integracaoInicial={2}
        onClose={() => {}}
      />
    )

    fireEvent.click(await screen.findByRole("button", { name: "Executar" }))

    await waitFor(() => {
      expect(calls.some((c) => c.url === "/api/admin/integracoes/2/testar")).toBe(true)
    })
    expect(await screen.findByText("P1")).toBeInTheDocument()
  })

  it("no modo da tela entrega a integração escolhida ao callback", async () => {
    const { fn } = mockListar()
    vi.stubGlobal("fetch", fn)
    const aoImportar = vi.fn()

    renderPage(
      <ImportarApiModal
        tela="bi"
        existingRecords={[]}
        integracaoInicial={1}
        aoImportar={aoImportar}
        onClose={() => {}}
      />
    )

    fireEvent.click(await screen.findByRole("button", { name: "Executar" }))
    await screen.findByText("P1")

    fireEvent.click(screen.getByRole("button", { name: /^Importar/ }))

    await waitFor(() => expect(aoImportar).toHaveBeenCalled())
    const contexto = aoImportar.mock.calls[0][0]
    expect(contexto.integracao.id).toBe(1)
    expect(contexto.itens).toHaveLength(1)
    expect(contexto.itens[0].pedido).toBe("P1")
  })

  it("no modo da tela aceita resposta sem lista", async () => {
    const { fn } = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: INTEGRACOES }
      if (url.includes("/testar")) {
        return { json: { success: true, status: 200, responseBody: { Valor: 42 } } }
      }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fn)
    const aoImportar = vi.fn()

    renderPage(
      <ImportarApiModal
        tela="bi"
        existingRecords={[]}
        integracaoInicial={1}
        aoImportar={aoImportar}
        onClose={() => {}}
      />
    )

    fireEvent.click(await screen.findByRole("button", { name: "Executar" }))
    await screen.findByText(/42/)

    fireEvent.click(screen.getByRole("button", { name: /^Importar/ }))
    await waitFor(() => expect(aoImportar).toHaveBeenCalled())
    expect(aoImportar.mock.calls[0][0].corpo).toEqual({ Valor: 42 })
  })

  it("sem callback de tela só oferece item selecionado", async () => {
    const { fn } = mockListar()
    vi.stubGlobal("fetch", fn)

    renderPage(<ImportarApiModal tela="bi" existingRecords={[]} onClose={() => {}} />)

    fireEvent.click(await screen.findByRole("button", { name: "Executar" }))
    await screen.findByText("P1")

    // Sem chave única configurada, o item fica sem seleção: o importador padrão
    // descarta o que não tem o campo.
    expect(screen.getByRole("button", { name: /^Importar/ })).toBeDisabled()
  })
})
