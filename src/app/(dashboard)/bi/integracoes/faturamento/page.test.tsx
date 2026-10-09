// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import type { ConsultaFaturamento, EstadoFaturamentoDetalhe } from "@/lib/bi/faturamento-detalhe-db"
import FaturamentoDetalhePage from "./page"

const consultar = vi.fn()
const estadoSalvo = vi.fn()
const substituirBase = vi.fn()
const mergeDelta = vi.fn()
const salvarEstado = vi.fn()
const limpar = vi.fn()
const gerarPdfConsolidado = vi.fn()

vi.mock("@/lib/bi/faturamento-detalhe-db", () => ({
  consultar: (...args: unknown[]) => consultar(...args),
  estadoSalvo: (...args: unknown[]) => estadoSalvo(...args),
  substituirBase: (...args: unknown[]) => substituirBase(...args),
  mergeDelta: (...args: unknown[]) => mergeDelta(...args),
  salvarEstado: (...args: unknown[]) => salvarEstado(...args),
  limpar: (...args: unknown[]) => limpar(...args),
}))

vi.mock("./components/faturamento-pdf", () => ({
  gerarPdfConsolidado: (...args: unknown[]) => gerarPdfConsolidado(...args),
  gerarPdfGrupo: vi.fn(),
}))

const INTEGRACAO = { id: 7, nome: "Faturamento Detalhe", baseUrl: "http://erp/faturamento-detalhe", tipoAuth: "login" }

function item(over: Partial<Record<string, unknown>>) {
  return {
    empresa: "1",
    pedido: "P1",
    item: 1,
    nr_nota: "100",
    data_nota: "2026-01-10",
    cliente: "C1",
    nome_cliente: "Cliente Um",
    cod_produto: "PRD-A",
    metros: 10,
    vr_unitario: 5,
    vr_total: 50,
    acres_desc: 0,
    peso: 3,
    vr_nota: 50,
    romaneio: "ROM-1",
    representante_codigo: "7",
    representante: "Ana",
    ...over,
  }
}

/** A barra de seleção rotula a contagem; o texto em si fica quebrado em varios nós. */
function contagemSelecionada(): string {
  return screen.getByRole("status").getAttribute("aria-label") ?? ""
}

function consultaDe(itens: ReturnType<typeof item>[]): ConsultaFaturamento {
  return {
    resumo: {
      itens: itens.length,
      notas: new Set(itens.map((i) => `${i.empresa}|${i.nr_nota}`)).size,
      pedidos: new Set(itens.map((i) => `${i.empresa}|${i.pedido}`)).size,
      metros: itens.reduce((s, i) => s + i.metros, 0),
      peso: itens.reduce((s, i) => s + i.peso, 0),
      faturamento: itens.reduce((s, i) => s + i.vr_total + i.acres_desc, 0),
    },
    paginacao: { total: itens.length, pagina: 1, por_pagina: 500, total_paginas: 1 },
    itens: itens as ConsultaFaturamento["itens"],
  }
}

const ITENS = [
  item({}),
  item({ item: 2, cod_produto: "PRD-B", vr_total: 30, metros: 5 }),
  item({ nr_nota: "200", pedido: "P2", data_nota: "2026-02-11", nome_cliente: "Cliente Dois", romaneio: "ROM-2", vr_total: 70 }),
]

let fetchMock: ReturnType<typeof createFetchMock>

beforeEach(() => {
  vi.clearAllMocks()
  consultar.mockResolvedValue(consultaDe(ITENS))
  estadoSalvo.mockResolvedValue({
    carga_completa: true,
    contagem: ITENS.length,
    ultima_data: "2026-02-11",
    janela_inicio: "2025-01-01",
    janela_fim: "2026-12-31",
  } satisfies EstadoFaturamentoDetalhe)
  fetchMock = createFetchMock(({ url }) =>
    url.startsWith("/api/integracao/listar") ? { json: [INTEGRACAO] } : { json: null }
  )
  vi.stubGlobal("fetch", fetchMock.fn)
})

describe("página de detalhe do faturamento", () => {
  it("agrupa os itens da página por nota fiscal", async () => {
    renderPage(<FaturamentoDetalhePage />)

    expect(await screen.findByText("1-100")).toBeTruthy()
    expect(screen.getByText("1-200")).toBeTruthy()
    expect(screen.getByText(/2 itens/)).toBeTruthy()
    expect(screen.getByText(/1 itens/)).toBeTruthy()
  })

  it("mostra o consolidado da nota com métragem, peso e valor", async () => {
    renderPage(<FaturamentoDetalhePage />)

    const card = (await screen.findByText("1-100")).closest("div.rounded-xl") as HTMLElement
    expect(within(card).getByTitle("Metragem").textContent).toContain("15,00")
    expect(within(card).getByTitle("Peso").textContent).toContain("6,00")
    expect(within(card).getByTitle("Valor total da nota").textContent).toContain("80,00")
  })

  it("expande a nota e revela os itens", async () => {
    renderPage(<FaturamentoDetalhePage />)

    expect(screen.queryByText("PRD-A")).toBeNull()
    fireEvent.click(await screen.findByText("1-100"))

    await waitFor(() => expect(screen.getByText("PRD-A")).toBeTruthy())
    expect(screen.getByText("PRD-B")).toBeTruthy()
    expect(screen.getByText("Total da nota")).toBeTruthy()
  })

  it("filtra as notas pela busca livre", async () => {
    renderPage(<FaturamentoDetalhePage />)
    await screen.findByText("1-100")

    fireEvent.change(screen.getByLabelText("Buscar nas notas carregadas"), {
      target: { value: "Cliente Dois" },
    })

    await waitFor(() => expect(screen.queryByText("1-100")).toBeNull())
    expect(screen.getByText("1-200")).toBeTruthy()
  })

  it("seleciona notas e gera o PDF consolidado na orientação escolhida", async () => {
    renderPage(<FaturamentoDetalhePage />)

    fireEvent.click(await screen.findByLabelText("Selecionar nota 1-200"))
    expect(contagemSelecionada()).toBe("1 nota selecionada")

    fireEvent.change(screen.getByLabelText("Orientação do PDF"), { target: { value: "landscape" } })
    fireEvent.click(screen.getByRole("button", { name: /PDF único/ }))

    await waitFor(() =>
      expect(gerarPdfConsolidado).toHaveBeenCalledWith(
        expect.any(Array),
        ["1|200"],
        "landscape"
      )
    )
  })

  it("seleciona todas as notas do período em um único PDF", async () => {
    renderPage(<FaturamentoDetalhePage />)

    fireEvent.click(await screen.findByRole("button", { name: /Selecionar todas do período/ }))
    await waitFor(() => expect(contagemSelecionada()).toBe("2 notas selecionadas"))

    fireEvent.click(screen.getByRole("button", { name: /PDF único \(2\)/ }))

    await waitFor(() => expect(gerarPdfConsolidado).toHaveBeenCalled())
    const [grupos, chaves] = gerarPdfConsolidado.mock.calls[0]
    expect(chaves).toEqual(["1|100", "1|200"])
    expect(grupos).toHaveLength(2)
  })

  it("atravessa as páginas do período ao selecionar todas", async () => {
    const pagina2 = [item({ nr_nota: "300", pedido: "P3", data_nota: "2026-03-12", nome_cliente: "Cliente Tres" })]
    consultar.mockImplementation(async (_filtros, pagina) =>
      pagina === 1
        ? { ...consultaDe(ITENS), paginacao: { total: 4, pagina: 1, por_pagina: 500, total_paginas: 2 } }
        : { ...consultaDe(pagina2), paginacao: { total: 4, pagina: 2, por_pagina: 500, total_paginas: 2 } }
    )
    renderPage(<FaturamentoDetalhePage />)

    await screen.findByText("1-100")
    fireEvent.click(screen.getByRole("button", { name: /Selecionar todas do período/ }))

    await waitFor(() => expect(contagemSelecionada()).toBe("3 notas selecionadas"))

    fireEvent.click(screen.getByRole("button", { name: /PDF único \(3\)/ }))
    await waitFor(() => expect(gerarPdfConsolidado).toHaveBeenCalled())
    const [, chaves] = gerarPdfConsolidado.mock.calls[0]
    expect(chaves).toEqual(["1|100", "1|200", "1|300"])
    expect(consultar).toHaveBeenCalledWith(expect.anything(), 2, 500)
  })

  it("seleciona só as notas visíveis e inverte a seleção", async () => {
    renderPage(<FaturamentoDetalhePage />)

    fireEvent.click(await screen.findByRole("button", { name: /Selecionar desta página/ }))
    await waitFor(() => expect(contagemSelecionada()).toBe("2 notas selecionadas"))

    fireEvent.click(screen.getByRole("button", { name: "Inverter" }))
    await waitFor(() => expect(contagemSelecionada()).toBe("0 notas selecionadas"))

    fireEvent.click(screen.getByRole("button", { name: /Selecionar desta página/ }))
    fireEvent.click(screen.getByRole("button", { name: "Inverter" }))
    expect(screen.getByLabelText("Selecionar nota 1-100")).toHaveProperty("checked", false)
  })

  it("limpa a seleção ao pedir", async () => {
    renderPage(<FaturamentoDetalhePage />)

    fireEvent.click(await screen.findByLabelText("Selecionar nota 1-100"))
    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }))

    await waitFor(() => expect(contagemSelecionada()).toBe("0 notas selecionadas"))
  })

  it("avisa quando o cache local está vazio e bloqueia a atualização", async () => {
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    renderPage(<FaturamentoDetalhePage />)

    await screen.findByText(/Nenhuma nota encontrada/)
    expect(screen.getByRole("button", { name: "Atualizar" })).toHaveProperty("disabled", true)
    expect(screen.getByRole("button", { name: /Exportar CSV/ })).toHaveProperty("disabled", true)
    expect(screen.getByRole("button", { name: /Usar base do Neon/ })).toHaveProperty("disabled", false)
  })

  it("avisa quando a integração de faturamento não está cadastrada", async () => {
    fetchMock = createFetchMock(() => ({ json: [] }))
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() => expect(screen.getByText(/integração não encontrada/)).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: /Carregar base/ }))

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Cadastre-a em Admin")
    )
  })

  it("aplica os filtros de período e texto na consulta do IndexedDB", async () => {
    renderPage(<FaturamentoDetalhePage />)
    await screen.findByText("1-100")

    fireEvent.change(screen.getByLabelText("Representante"), { target: { value: "ana" } })
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/ }))

    await waitFor(() => {
      const ultimo = consultar.mock.calls.at(-1)
      expect(ultimo?.[0]).toMatchObject({ representante: "ana" })
      expect(ultimo?.[1]).toBe(1)
    })
  })

  it("filtra as notas pelo número da nota informado nos filtros", async () => {
    renderPage(<FaturamentoDetalhePage />)
    await screen.findByText("1-100")

    fireEvent.change(screen.getByLabelText("Nº nota"), { target: { value: "200" } })
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/ }))

    await waitFor(() => expect(screen.queryByText("1-100")).toBeNull())
    expect(screen.getByText("1-200")).toBeTruthy()
  })

  it("popula o cache lendo do Neon sem chamar a carga do ERP", async () => {
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url, method }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (method === "POST") return { json: { erro: "não deveria chamar o ERP" } }
      if (url.includes("por_pagina=500")) {
        return {
          json: {
            itens: ITENS,
            paginacao: { total: ITENS.length, pagina: 1, por_pagina: 500, total_paginas: 1 },
          },
        }
      }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() => expect(screen.getByText(/Faturamento Detalhe/)).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: /Usar base do Neon/ }))

    await waitFor(() => expect(substituirBase).toHaveBeenCalled())
    expect(substituirBase.mock.calls[0][0]).toHaveLength(ITENS.length)
    expect(fetchMock.calls.some((c) => c.method === "POST")).toBe(false)
    // A URL do dump não pode terminar com barra: o catch-all vira ["faturamento-detalhe", ""].
    const dump = fetchMock.calls.find((c) => c.url.includes("por_pagina=500"))
    expect(dump?.url).toContain("/detalhe/faturamento-detalhe?pagina=1")
    expect(dump?.url).not.toContain("faturamento-detalhe/?")
  })

  it("popula o cache direto dos itens devolvidos pela carga, sem reler o Neon", async () => {
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url, method }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/carga")) {
        return { json: { processados: 3, contagem: 3, ultima_data: "2026-02-11", itens: ITENS } }
      }
      return { json: { erro: "não deveria ler o Neon" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() => expect(screen.getByText(/Faturamento Detalhe/)).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: /Carregar base/ }))

    await waitFor(() => expect(salvarEstado).toHaveBeenCalled())
    expect(substituirBase.mock.calls[0][0]).toHaveLength(ITENS.length)
    expect(fetchMock.calls.some((c) => c.url.includes("por_pagina=500"))).toBe(false)
  })

  it("faz merge do delta no cache em vez de substituir a base", async () => {
    fetchMock = createFetchMock(({ url, method }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/sync")) {
        return { json: { processados: 1, contagem: 4, ultima_data: "2026-03-01", itens: [ITENS[0]] } }
      }
      return { json: { erro: "não deveria ler o Neon" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await screen.findByText("1-100")
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }))

    await waitFor(() => expect(mergeDelta).toHaveBeenCalled())
    expect(substituirBase).not.toHaveBeenCalled()
    expect(fetchMock.calls.some((c) => c.url.includes("por_pagina=500"))).toBe(false)
  })

  it("avisa quando o cache foi populado com outra janela", async () => {
    estadoSalvo.mockResolvedValue({
      carga_completa: true,
      contagem: 3,
      ultima_data: "2026-02-11",
      janela_inicio: "2020-01-01",
      janela_fim: "2020-12-31",
    } satisfies EstadoFaturamentoDetalhe)
    consultar.mockResolvedValue(consultaDe([]))
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() =>
      expect(screen.getByText(/cache local foi populado de 2020-01-01/)).toBeTruthy()
    )
  })

  it("restaura filtros padrão ao limpar", async () => {
    renderPage(<FaturamentoDetalhePage />)
    await screen.findByText("1-100")

    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "zzz" } })
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/ }))
    fireEvent.click(screen.getByRole("button", { name: /Limpar/ }))

    await waitFor(() => expect((screen.getByLabelText("Cliente") as HTMLInputElement).value).toBe(""))
    expect(screen.getByText("1-100")).toBeTruthy()
  })
})