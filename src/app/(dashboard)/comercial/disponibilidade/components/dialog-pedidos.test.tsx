// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import { DialogPedidos } from "./dialog-pedidos"
import {
  exportarCsvPedidos,
  exportarPdfPedidos,
  type PedidoDisponibilidade,
} from "@/lib/bi/disponibilidade"

const INTEGRACAO_ID = 11

function pedido(over: Partial<PedidoDisponibilidade> = {}): PedidoDisponibilidade {
  return {
    empresa: "13",
    pedido: "00006822",
    cliente: "07.920.906/0001-73",
    cliente_nome: "SLEEP INDUSTRIA DE MOVEIS LTDA",
    vendedor: "055",
    vendedor_nome: "PROFECTUS GESTAO COMERCIAL LTDA",
    produto: "000014",
    cor: "00011",
    data_pedido: "2026-10-07",
    data_entrega: "2026-11-16",
    qtde_pedido: 1_300,
    qtde_romaneada: 0,
    saldo: 1_300,
    valor: 9_230,
    status: "Analise Financeira",
    ...over,
  }
}

const RESPOSTA = {
  total: 2,
  saldo: 3_300,
  valor: 24_190,
  pedidos: [
    pedido(),
    pedido({
      pedido: "00006841",
      cliente_nome: "DGB COMERCIO IMPORTACAO E EXPORTACAO LTDA",
      vendedor: "001",
      vendedor_nome: "VENDAS DIRETAS (NOME DA EMPRESA)",
      data_pedido: "2026-10-09",
      saldo: 2_000,
      valor: 14_960,
      status: "Analise Comercial",
    }),
  ],
}

const LINHA = {
  produto: "000014",
  produto_desc: "VELUDO CONFORT",
  cor: "00011",
  cor_desc: "11 - BEIGE",
  pedidos_venda: 2,
} as never

function rotas(dados = RESPOSTA) {
  return createFetchMock(({ url }) => {
    if (url.includes("/detalhe/estoque-disponibilidade/pedidos")) return { json: dados }
    return { status: 404, json: { error: `Rota não mockada: ${url}` } }
  })
}

let fetchMock: ReturnType<typeof createFetchMock>

beforeEach(() => {
  navMock.setPathname("/comercial/disponibilidade")
  fetchMock = rotas()
  vi.stubGlobal("fetch", fetchMock.fn)
})

describe("DialogPedidos", () => {
  it("lista os pedidos com o código, o cliente e o representante", async () => {
    renderPage(
      <DialogPedidos integracaoId={INTEGRACAO_ID} linha={LINHA} aoFechar={() => {}} />
    )

    const dialog = await screen.findByRole("dialog")
    // O codigo do pedido e o que a tabela nao tinha. `findBy`, porque o dialog abre
    // antes de a consulta dos pedidos responder.
    expect(await within(dialog).findByText("00006822")).toBeInTheDocument()
    expect(within(dialog).getByText("00006841")).toBeInTheDocument()
    expect(within(dialog).getByText(/SLEEP INDUSTRIA DE MOVEIS/)).toBeInTheDocument()
    expect(within(dialog).getByText(/PROFECTUS GESTAO COMERCIAL/)).toBeInTheDocument()
    expect(within(dialog).getByText(/DGB COMERCIO IMPORTACAO/)).toBeInTheDocument()
    expect(within(dialog).getAllByText("16/11/2026").length).toBeGreaterThan(0)
    // O total vem no cabecalho
    await waitFor(() =>
      expect(within(dialog).getByText(/2 pedidos em aberto/)).toBeInTheDocument()
    )
  })

  it("consulta a rota de pedidos com produto e cor", async () => {
    renderPage(
      <DialogPedidos integracaoId={INTEGRACAO_ID} linha={LINHA} aoFechar={() => {}} />
    )

    await screen.findByRole("dialog")
    const consulta = fetchMock.calls.find((c) => c.url.includes("/pedidos"))
    expect(consulta?.url).toContain("/api/integracao/11/detalhe/estoque-disponibilidade/pedidos")
    expect(consulta?.url).toContain("produto=000014")
    expect(consulta?.url).toContain("cor=00011")
  })

  it("oferece CSV e PDF do recorte", async () => {
    renderPage(
      <DialogPedidos integracaoId={INTEGRACAO_ID} linha={LINHA} aoFechar={() => {}} />
    )

    await screen.findByRole("dialog")
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Exportar PDF/ })).toBeInTheDocument()
  })

  it("avisa quando a cor não tem pedido em aberto", async () => {
    fetchMock = rotas({ total: 0, saldo: 0, valor: 0, pedidos: [] })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(
      <DialogPedidos integracaoId={INTEGRACAO_ID} linha={LINHA} aoFechar={() => {}} />
    )

    expect(await screen.findByText(/Nenhum pedido em aberto nesta cor/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Exportar PDF/ })).toHaveProperty("disabled", true)
  })

  it("mostra o erro da API", async () => {
    fetchMock = createFetchMock(() => ({ status: 500, json: { detail: "Falha ao falar com o ERP" } }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(
      <DialogPedidos integracaoId={INTEGRACAO_ID} linha={LINHA} aoFechar={() => {}} />
    )

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao falar com o ERP")
  })

  it("fecha sem chamar a API quando não há linha", async () => {
    renderPage(<DialogPedidos integracaoId={INTEGRACAO_ID} linha={null} aoFechar={() => {}} />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock.calls).toHaveLength(0)
  })
})

describe("exportarCsvPedidos", () => {
  const criar = vi.fn()
  const revogar = vi.fn()

  beforeEach(() => {
    criar.mockClear()
    revogar.mockClear()
    criar.mockReturnValue("blob:fake")
    vi.stubGlobal("URL", { ...URL, createObjectURL: criar, revokeObjectURL: revogar })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("baixa o arquivo com o nome da cor", () => {
    const clique = vi.fn()
    const original = document.createElement.bind(document)
    let nome = ""
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = original(tag)
      if (tag === "a") {
        el.click = clique
        Object.defineProperty(el, "download", {
          set: (valor: string) => {
            nome = valor
          },
        })
      }
      return el
    })

    exportarCsvPedidos([pedido()], "pedidos_000014_00011")

    expect(clique).toHaveBeenCalled()
    expect(nome).toBe("pedidos_000014_00011.csv")
    expect(revogar).toHaveBeenCalledWith("blob:fake")
  })
})

describe("exportarPdfPedidos", () => {
  it("não gera PDF sem pedido", async () => {
    await expect(exportarPdfPedidos([], "vazio")).resolves.toBe(false)
  })
})