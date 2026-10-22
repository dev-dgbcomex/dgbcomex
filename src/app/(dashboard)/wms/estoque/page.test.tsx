// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"
import EstoquePage from "./page"

const pecas = [
  {
    empresa: "13",
    nro_rolo: "R100",
    nro_peca: "1",
    produto: "TECIDO A",
    categoria: "1",
    cor: "010",
    desenho: "20",
    variante: "1",
    largura: "1,40",
    metros: 55.6,
    peso: 13.9,
    situacao: "E",
    lote_interno: "L-01",
    data_entrada: "2026-06-11",
  },
]

const enderecos = [
  { id: 5, codigo: "A-01-01", tipo: "PULMAO", ativo: true },
  { id: 6, codigo: "PIC-01", tipo: "PICKING", ativo: true },
]

function mock({ total = 1, itens = pecas } = {}) {
  return createFetchMock(({ method, url }) => {
    if (method === "GET" && url === "/api/wms/estoque?busca=&limite=50&offset=0") {
      return { json: { itens, total } }
    }
    if (method === "GET" && url === "/api/wms/enderecos") return { json: enderecos }
    if (method === "POST" && url === "/api/wms/movimentos") {
      return { status: 201, json: { ok: true } }
    }
    return { status: 404, json: {} }
  })
}

describe("WMS — estoque em aberto", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/estoque")
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("lista as peças em aberto do ERP", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)

    expect(await screen.findByText("R100")).toBeTruthy()
    expect(screen.getByText("TECIDO A")).toBeTruthy()
    expect(screen.getByText("1,40")).toBeTruthy()
    expect(screen.getByText("55.60")).toBeTruthy()
  })

  it("mostra estado vazio quando não há peças", async () => {
    const fetchMock = mock({ total: 0, itens: [] })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)

    expect(await screen.findByText("Nenhuma peça em aberto encontrada.")).toBeTruthy()
  })

  it("aloca a peça no endereço escolhido", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)
    await screen.findByText("R100")

    fireEvent.change(screen.getByLabelText("Endereço de destino do rolo R100"), {
      target: { value: "5" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Alocar" }))

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Peça alocada"))
    const post = findCall(fetchMock.calls, "/api/wms/movimentos", "POST")
    expect(post?.body).toMatchObject({
      tipo: "ENTRADA",
      enderecoDestinoId: 5,
      peca: { nroRolo: "R100", nroPeca: "1", metros: 55.6 },
    })
  })

  it("exibe o erro da API ao falhar a alocação", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/wms/estoque?busca=&limite=50&offset=0") {
        return { json: { itens: pecas, total: 1 } }
      }
      if (method === "GET" && url === "/api/wms/enderecos") return { json: enderecos }
      if (method === "POST" && url === "/api/wms/movimentos") {
        return { status: 409, json: { error: "Esta peça já está alocada" } }
      }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EstoquePage />)
    await screen.findByText("R100")

    fireEvent.change(screen.getByLabelText("Endereço de destino do rolo R100"), {
      target: { value: "5" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Alocar" }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Esta peça já está alocada")
    )
  })
})
