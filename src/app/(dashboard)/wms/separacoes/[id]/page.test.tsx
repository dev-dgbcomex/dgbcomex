// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"
import SeparacaoDetalhePage from "./page"

const item = {
  item: 1,
  produto: "29",
  produtoDesc: "TECIDO A",
  situacao: "E",
  situacaoDesc: "Estoque",
  cor: "010",
  corDesc: "Azul",
  desenho: "20",
  desenhoDesc: "Desenho X",
  variante: "1",
  varianteDesc: null,
  categoria: "1",
  categoriaDesc: null,
  largura: "1,40",
  qtde: 500,
  qtdeRomaneio: 20,
  qtdeAcerto: 0,
  saldo: 480,
  unid: "M",
  reservadoMetros: 60.5,
  pecasReservadas: 1,
}

const peca = {
  id: 11,
  item: 1,
  empresa: "13",
  nroRolo: "R100",
  nroPeca: "1",
  produto: "29",
  produtoDesc: "TECIDO A",
  situacao: "E",
  cor: "010",
  corDesc: "Azul",
  desenho: "20",
  variante: "1",
  categoria: "1",
  largura: "1,40",
  subLote: "L-01",
  aviso: "A1",
  gaveta: "A-01-01",
  gavetaDescricao: "Gaveta A",
  zona: "DEPÓSITO",
  metros: 60.5,
  peso: 15,
  status: "RESERVADA",
  adicionadoEm: "2026-10-03T11:00:00Z",
  baixadoNoErp: false,
}

const detalhe = {
  id: 9,
  empresa: "13",
  pedido: "00005902",
  status: "EM_SEPARACAO",
  clienteCodigo: "1",
  clienteNome: "Cliente Teste",
  dataPedido: "2026-10-01",
  dataEntrega: "2026-10-20",
  observacao: null,
  motivoCancelamento: null,
  criadoPor: 1,
  iniciadoPor: 1,
  concluidoPor: null,
  canceladoPor: null,
  criadoEm: "2026-10-03T10:00:00Z",
  iniciadoEm: "2026-10-03T11:00:00Z",
  concluidoEm: null,
  canceladoEm: null,
  atualizadoEm: "2026-10-03T11:00:00Z",
  totalPecas: 1,
  totalMetros: 60.5,
  itensSeparados: 1,
  saldoMetros: 419.5,
  statusPed: "A",
  itens: [item],
  pecas: [peca],
}

const pecasDisponiveis = {
  item: { item: 1, produto: "29", cor: "010" },
  itens: [
    {
      empresa: "13",
      nro_rolo: "R200",
      nro_peca: "2",
      produto: "29",
      produto_desc: "TECIDO A",
      situacao: "E",
      situacao_desc: "Estoque",
      cor: "010",
      cor_desc: "Azul",
      desenho: "20",
      desenho_desc: "Desenho X",
      variante: "1",
      variante_desc: null,
      categoria: "1",
      categoria_desc: null,
      largura: "1,40",
      sub_lote: "L-02",
      aviso: null,
      gaveta: "A-01-02",
      gaveta_descricao: "Gaveta B",
      zona: "DEPÓSITO",
      metros: 80,
      peso: 20,
      data_entrada: "2026-06-11",
    },
  ],
  total: 1,
}

function mock(dados = detalhe) {
  return createFetchMock(({ method, url }) => {
    if (method === "GET" && url === "/api/wms/separacoes/9") return { json: dados }
    if (method === "GET" && url.startsWith("/api/wms/separacoes/9/itens/1/pecas?")) {
      return { json: pecasDisponiveis }
    }
    if (method === "POST" && url === "/api/wms/separacoes/9/concluir") {
      return { json: { ...dados, status: "SEPARADO" } }
    }
    if (method === "POST" && url === "/api/wms/separacoes/9/pecas") {
      return { status: 201, json: { separacao: dados, adicionadas: 1 } }
    }
    if (method === "DELETE" && url === "/api/wms/separacoes/9/pecas/11") {
      return { json: { separacao: dados } }
    }
    return { status: 404, json: {} }
  })
}

describe("WMS — detalhe da ordem de separação", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/separacoes/9")
    navMock.setParams({ id: "9" })
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("mostra os itens e as peças reservadas", async () => {
    vi.stubGlobal("fetch", mock().fn)

    renderPage(<SeparacaoDetalhePage />)

    expect(await screen.findByText("Ordem #9 · Pedido 00005902")).toBeTruthy()
    expect(screen.getAllByText("TECIDO A").length).toBeGreaterThan(0)
    expect(screen.getByText("R100/1")).toBeTruthy()
    expect(screen.getByText("60.5")).toBeTruthy()
    expect(screen.getByText("1 pç · 60.50 m")).toBeTruthy()
  })

  it("avisa quando alguma peça já foi baixada no ERP", async () => {
    vi.stubGlobal("fetch", mock({ ...detalhe, pecas: [{ ...peca, baixadoNoErp: true }] }).fn)

    renderPage(<SeparacaoDetalhePage />)

    expect(
      await screen.findByText(
        /1 peça\(s\) já foram baixadas no ERP durante a separação/
      )
    ).toBeTruthy()
  })

  it("conclui a separação", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<SeparacaoDetalhePage />)
    await screen.findByText("Ordem #9 · Pedido 00005902")

    fireEvent.click(screen.getByRole("button", { name: "Concluir" }))

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Separação concluída")
    )
    expect(
      findCall(fetchMock.calls, "/api/wms/separacoes/9/concluir", "POST")
    ).toBeTruthy()
  })

  it("adiciona peças disponíveis ao item", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<SeparacaoDetalhePage />)
    await screen.findByText("Ordem #9 · Pedido 00005902")

    fireEvent.click(screen.getByRole("button", { name: /Adicionar peças/ }))

    const dialog = await screen.findByRole("dialog", { name: "Adicionar peças à ordem" })
    expect(await within(dialog).findByText("R200/2")).toBeTruthy()

    fireEvent.click(within(dialog).getByLabelText("Selecionar R200/2"))
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar peças" }))

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Peças reservadas para a ordem")
    )
    const post = findCall(fetchMock.calls, "/api/wms/separacoes/9/pecas", "POST")
    expect(post?.body).toEqual({
      item: 1,
      pecas: [{ nroRolo: "R200", nroPeca: "2" }],
    })
  })

  it("remove uma peça da ordem", async () => {
    const fetchMock = mock()
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<SeparacaoDetalhePage />)
    await screen.findByText("Ordem #9 · Pedido 00005902")

    fireEvent.click(screen.getByRole("button", { name: "Remover" }))

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Peça removida da ordem")
    )
    expect(
      findCall(fetchMock.calls, "/api/wms/separacoes/9/pecas/11", "DELETE")
    ).toBeTruthy()
  })

  it("mostra estado vazio quando a ordem não tem peças", async () => {
    vi.stubGlobal("fetch", mock({ ...detalhe, pecas: [], totalPecas: 0, totalMetros: 0 }).fn)

    renderPage(<SeparacaoDetalhePage />)

    expect(
      await screen.findByText("Nenhuma peça adicionada. Use “Adicionar peças” em um item do pedido.")
    ).toBeTruthy()
  })
})
