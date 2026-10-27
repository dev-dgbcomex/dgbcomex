// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage } from "@/test/harness"
import EstoquePage from "./page"

const pecas = [
  {
    empresa: "13",
    nro_rolo: "R100",
    nro_peca: "1",
    produto: "29",
    produto_desc: "TECIDO A",
    situacao: "E",
    situacao_desc: "Estoque",
    cor: "010",
    cor_desc: "Azul",
    desenho: "20",
    desenho_desc: null,
    variante: "1",
    variante_desc: null,
    categoria: "1",
    categoria_desc: null,
    largura: "1,40",
    sub_lote: "L-01",
    aviso: "A1",
    gaveta: "A-01-01",
    gaveta_descricao: "Gaveta A",
    zona: "DEPÓSITO",
    metros: 55.6,
    peso: 13.9,
    data_entrada: "2026-06-11",
  },
]

const URL_BASE = (extra = "") =>
  `/api/wms/estoque?busca=&gaveta=&subLote=&aviso=&cor=&produto=&limite=100&offset=0${extra}`

function mock({ total = 1, itens = pecas } = {}) {
  return createFetchMock(({ method, url }) => {
    if (method === "GET" && url === URL_BASE()) {
      return { json: { itens, total } }
    }
    return { status: 404, json: {} }
  })
}

describe("WMS — estoque em aberto", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/estoque")
  })

  it("abre em lista por padrão", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)

    expect(await screen.findByText("R100/1")).toBeTruthy()
    expect(screen.getByText("29")).toBeTruthy() // Cód. Produto
    expect(screen.getByText("TECIDO A")).toBeTruthy()
    expect(screen.getByText("55.60")).toBeTruthy() // metros em lista (toFixed(2))
    expect(screen.getByText("A-01-01")).toBeTruthy()
    expect(screen.getByText("Azul")).toBeTruthy()
    expect(screen.getByText("DEPÓSITO")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Kanban" })).toBeTruthy()
  })

  it("alterna para o kanban agrupando por zona", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)
    await screen.findByText("R100/1")

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByText("DEPÓSITO")).toBeTruthy()
    expect(screen.getByText("55.6 m")).toBeTruthy()
  })

  it("oferece o retorno às separações no topo e no rodapé", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)
    await screen.findByText("R100/1")

    const voltar = screen.getAllByRole("link", { name: "Voltar para as separações" })
    expect(voltar).toHaveLength(2)
    expect(voltar[0].getAttribute("href")).toBe("/wms/separacoes")
  })

  it("mostra estado vazio quando não há peças", async () => {
    const fetchMock = mock({ total: 0, itens: [] })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)

    expect(await screen.findByText("Nenhuma peça em aberto encontrada.")).toBeTruthy()
  })

  it("aplica o filtro de gaveta na consulta", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)
    await screen.findByText("R100/1")

    fireEvent.change(screen.getByLabelText("Filtrar por gaveta"), {
      target: { value: "A-01-01" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }))

    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, URL_BASE().replace("gaveta=&", "gaveta=A-01-01&"))
      ).toBeTruthy()
    )
  })

  it("alterna para o kanban agrupando por zona", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)
    await screen.findByText("R100/1")

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByText("DEPÓSITO")).toBeTruthy()
    expect(screen.getByText("55.6 m")).toBeTruthy()
  })
})
