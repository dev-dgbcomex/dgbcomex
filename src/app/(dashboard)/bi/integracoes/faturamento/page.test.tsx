// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
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

/** O card "Faturamento Dia (diário)" também tem "faturamento" no nome, mas serve outro endpoint. */
const INTEGRACAO_CARD = {
  id: 3,
  nome: "Faturamento Dia (diário)",
  baseUrl: "http://erp/faturamento/{data}",
  tipoAuth: "login",
}

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
  return screen.getByRole("status", { name: /nota selecionada|notas selecionadas/ }).getAttribute(
    "aria-label"
  ) ?? ""
}

/** O toolbar rotula o total de notas do período filtrado. */
function contagemNoPeriodo(): string {
  return screen.getByRole("status", { name: /nota no período|notas no período/ }).getAttribute(
    "aria-label"
  ) ?? ""
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
  it("mostra o período em exibição com a duração por extenso", async () => {
    navMock.setPathname("/bi/integracoes/faturamento")
    renderPage(<FaturamentoDetalhePage />)

    // Período padrão: 12 meses (o estado inicial usa hoje-12 meses até hoje).
    const cabecalho = await screen.findByText("Período em exibição")
    const painel = cabecalho.parentElement?.textContent ?? ""
    expect(painel).toMatch(/\d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/)
    expect(painel).toMatch(/\d+ meses? e \d+ dias?/)

    // E o total de notas é do período, não de uma página.
    expect(screen.getByRole("status", { name: /notas no período/ })).toBeTruthy()
  })

it("avisa quando os campos mudaram mas o filtro ainda não foi aplicado", async () => {
    renderPage(<FaturamentoDetalhePage />)
    await screen.findByText("Período em exibição")

    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2026-08-01" },
    })

    await waitFor(() =>
      expect(screen.getByText(/período aplicado; ajuste os campos e clique em Aplicar filtros/)).toBeTruthy()
    )
  })

it("tem botão de informação explicando o uso da tela", async () => {
    navMock.setPathname("/bi/integracoes/faturamento")
    renderPage(<FaturamentoDetalhePage />)

    fireEvent.click(await screen.findByLabelText("Informações da tela"))
    const dialog = await screen.findByRole("dialog")

    // Os três botões de dados são explicados, e em especial a Orientation.
    for (const botao of [
      "Usar base do Neon",
      "Atualizar",
      "Recarregar base (12 meses)",
      "Aplicar filtros",
      "Exportar CSV",
    ]) {
      expect(within(dialog).getAllByText(botao).length).toBeGreaterThan(0)
    }

    // A orientação de não clicar sempre nesses botões precisa estar escrita.
    expect(
      within(dialog).getByText(/VOCÊ NÃO PRECISA CLICAR EM NADA PARA A TELA TER DADO/i)
    ).toBeTruthy()
    expect(
      within(dialog).getByText(/basta preencher os filtros e clicar em Aplicar filtros/i)
    ).toBeTruthy()

    // Passo a passo e gráficos.
    expect(within(dialog).getAllByText(/1ª vez que você abre a tela/).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText(/Do dia a dia/).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText(/Os gráficos/).length).toBeGreaterThan(0)
  })

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

    // PRD-A também aparece na legenda de participação e na tabela de produtos; aqui
    // é a tabela da nota expandida que interessa.
    await screen.findByText("1-100")
    await waitFor(() => expect(screen.getAllByRole("table")).toHaveLength(1))
    fireEvent.click(screen.getByText("1-100"))

    await waitFor(() => expect(screen.getAllByRole("table")).toHaveLength(2))
    const tabela = within(
      screen.getByText("Total da nota").closest("table") as HTMLTableElement
    )
    expect(tabela.getByText("PRD-A")).toBeTruthy()
    expect(tabela.getByText("PRD-B")).toBeTruthy()
    expect(tabela.getByText("Total da nota")).toBeTruthy()
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

  it("popula sozinho a partir do Neon quando o cache local está vazio", async () => {
    // Cache vazio: a tela dispara "Usar base do Neon" sozinha, sem clique.
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

    await waitFor(() => expect(substituirBase).toHaveBeenCalled())
    expect(substituirBase.mock.calls[0][0]).toHaveLength(ITENS.length)
    // Não toca no ERP: só lê o espelho.
    expect(fetchMock.calls.some((c) => c.method === "POST")).toBe(false)
  })

  it("não repete a população automática nem chama o ERP", async () => {
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

    await waitFor(() => expect(substituirBase).toHaveBeenCalledTimes(1))
    // Uma tentativa só por montagem: re-render não repete a leitura.
    await screen.findByRole("status", { name: /notas no período/ })
    expect(substituirBase).toHaveBeenCalledTimes(1)
    expect(mergeDelta).not.toHaveBeenCalled()
  })

  it("não faz nada automático quando já existe cache local", async () => {
    // estadoSalvo padrão devolve carga_completa: nada deve ser baixado sozinho.
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await screen.findByText("1-100")
    expect(substituirBase).not.toHaveBeenCalled()
    expect(fetchMock.calls.some((c) => c.url.includes("por_pagina=500"))).toBe(false)
  })

  it("carrega do ERP sozinho quando a base do Neon está vazia", async () => {
    // Antes: parava num aviso "a base do Neon está vazia" com os botões travados,
    // esperando alguém descobrir o que clicar. Agora a tela sobe a carga sozinha.
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) {
        return { json: { carga_completa: false, contagem: 0, ultima_data: null } }
      }
      if (url.includes("por_pagina=500")) return { json: { itens: [], paginacao: { total_paginas: 1 } } }
      if (url.endsWith("/carga")) {
        return { json: { processados: 3, contagem: 3, ultima_data: "2026-02-11", itens: ITENS } }
      }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    // O motivo da decisão aparece na tela, e a carga roda sozinha.
    expect(await screen.findByText(/A base do Neon está vazia/)).toBeTruthy()
    await waitFor(() => expect(substituirBase).toHaveBeenCalled())
    expect(fetchMock.calls.some((c) => c.url.endsWith("/carga"))).toBe(true)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("sobe para a carga quando o espelho do Neon vem vazio", async () => {
    // Sem estado da API (null = "não sei"): tenta o espelho, e o vazio escala para a carga.
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) return { status: 503, json: { detail: "indisponível" } }
      if (url.includes("por_pagina=500")) return { json: { itens: [], paginacao: { total_paginas: 1 } } }
      if (url.endsWith("/carga")) {
        return { json: { processados: 3, contagem: 3, ultima_data: "2026-02-11", itens: ITENS } }
      }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() => expect(substituirBase).toHaveBeenCalled())
    expect(fetchMock.calls.some((c) => c.url.includes("por_pagina=500"))).toBe(true)
    expect(fetchMock.calls.some((c) => c.url.endsWith("/carga"))).toBe(true)
  })

  it("busca só o delta quando a base do Neon está alguns dias atrás", async () => {
    const hoje = new Date()
    const atras = new Date(hoje.getTime() - 2 * 86_400_000).toISOString().slice(0, 10)
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) {
        return { json: { carga_completa: true, contagem: 3, ultima_data: atras } }
      }
      if (url.endsWith("/sync")) {
        return { json: { processados: 1, contagem: 4, ultima_data: hoje.toISOString().slice(0, 10), itens: [ITENS[0]] } }
      }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    expect(await screen.findByText(/buscando só o que é novo no ERP/)).toBeTruthy()
    await waitFor(() => expect(mergeDelta).toHaveBeenCalled())
    // Delta não recarrega a base inteira nem lê o dump.
    expect(substituirBase).not.toHaveBeenCalled()
    expect(fetchMock.calls.some((c) => c.url.endsWith("/carga"))).toBe(false)
    expect(fetchMock.calls.some((c) => c.url.includes("por_pagina=500"))).toBe(false)
  })

  it("recarrega do ERP quando a base está parada há muito tempo", async () => {
    const parado = new Date(new Date().getTime() - 60 * 86_400_000).toISOString().slice(0, 10)
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) {
        return { json: { carga_completa: true, contagem: 3, ultima_data: parado } }
      }
      if (url.endsWith("/carga")) {
        return { json: { processados: 3, contagem: 3, ultima_data: "2026-10-12", itens: ITENS } }
      }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    expect(await screen.findByText(/recarregando 12 meses do ERP/)).toBeTruthy()
    await waitFor(() => expect(substituirBase).toHaveBeenCalled())
    expect(fetchMock.calls.some((c) => c.url.endsWith("/carga"))).toBe(true)
  })

  it("nao pede nada quando a base do Neon e o cache local estao em dia", async () => {
    // Estado em dia: nem dump, nem sync, nem carga — e o aviso explica isso.
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) {
        return { json: { carga_completa: true, contagem: 3, ultima_data: new Date().toISOString().slice(0, 10) } }
      }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    expect(await screen.findByText(/A base está em dia, com notas até/)).toBeTruthy()
    expect(substituirBase).not.toHaveBeenCalled()
    expect(mergeDelta).not.toHaveBeenCalled()
    expect(fetchMock.calls.some((c) => c.method === "POST")).toBe(false)
    expect(fetchMock.calls.some((c) => c.url.includes("por_pagina=500"))).toBe(false)
  })

  it("nao repete a carga que outra sessao acabou de fazer", async () => {
    // O servidor responde `pulado` (corte de recencia de 30 min): a tela avisa e busca
    // os itens no espelho, em vez de reler 12 meses do ERP.
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url, method }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) {
        return { json: { carga_completa: false, contagem: 0, ultima_data: null } }
      }
      if (method === "POST" && url.includes("/carga")) {
        return {
          json: {
            pulado: true,
            motivo: "a base foi atualizada 3 min atras por outra sessao; use os itens que ja estao no Neon",
            contagem: 3,
            ultima_data: "2026-10-14",
            itens: [],
          },
        }
      }
      if (url.includes("por_pagina=500")) {
        return {
          json: {
            itens: ITENS,
            paginacao: { total: ITENS.length, pagina: 1, por_pagina: 500, total_paginas: 1 },
          },
        }
      }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    expect(await screen.findByText(/Não repeti a carga: a base foi atualizada 3 min atras/)).toBeTruthy()
    await waitFor(() => expect(substituirBase).toHaveBeenCalled())
    // Uma chamada só de carga: a segunda teria sido reler o ERP à toa.
    expect(fetchMock.calls.filter((c) => c.method === "POST")).toHaveLength(1)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("trata pulado com espelho vazio como erro, sem laco", async () => {
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url, method }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) {
        return { json: { carga_completa: false, contagem: 0, ultima_data: null } }
      }
      if (method === "POST" && url.includes("/carga")) {
        return { json: { pulado: true, motivo: "outra sessao", contagem: 3, itens: [] } }
      }
      if (url.includes("por_pagina=500")) return { json: { itens: [], paginacao: { total_paginas: 1 } } }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    // Contradição: ninguém atualizou e o espelho está vazio. Vira aviso, não segunda carga.
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("o espelho do Neon veio vazio")
    )
    expect(fetchMock.calls.filter((c) => c.method === "POST")).toHaveLength(1)
  })

  it("o botao manual manda forcar para ignorar o corte de recencia", async () => {
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url, method }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (method === "POST" && url.includes("/carga")) {
        return { json: { pulado: false, processados: 3, contagem: 3, ultima_data: "2026-10-14", itens: ITENS } }
      }
      return { json: { erro: "não deveria chamar mais nada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() => expect(screen.getByText(/Faturamento Detalhe/)).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: /Recarregar base/ }))

    await waitFor(() =>
      expect(fetchMock.calls.some((c) => c.url.includes("/carga?forcar=true"))).toBe(true)
    )
  })

  it("mantem os botoes liberados depois de uma falha", async () => {
    // O `acao !== "idle"` travava tudo depois do erro: a tela ficava morta.
    estadoSalvo.mockResolvedValue(null)
    consultar.mockResolvedValue(consultaDe([]))
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (url.endsWith("/estado")) {
        return { json: { carga_completa: false, contagem: 0, ultima_data: null } }
      }
      if (url.includes("por_pagina=500")) return { json: { itens: [], paginacao: { total_paginas: 1 } } }
      return { status: 500, json: { detail: "Falha ao falar com o ERP" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Falha ao falar com o ERP"))
    expect(screen.getByRole("button", { name: /Recarregar base/ })).toHaveProperty("disabled", false)
    expect(screen.getByRole("button", { name: /Usar base do Neon/ })).toHaveProperty("disabled", false)
  })

  it("avisa quando a integração de faturamento não está cadastrada", async () => {
    fetchMock = createFetchMock(() => ({ json: [] }))
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    await waitFor(() => expect(screen.getByText(/integração não encontrada/)).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: /Recarregar base/ }))

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
    // Com cache já populado a tela não dispara nada sozinha, então o clique é do teste.
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
    fireEvent.click(screen.getByRole("button", { name: /Recarregar base/ }))

    await waitFor(() => expect(salvarEstado).toHaveBeenCalled())
    expect(substituirBase.mock.calls[0][0]).toHaveLength(ITENS.length)
    expect(fetchMock.calls.some((c) => c.url.includes("por_pagina=500"))).toBe(false)
  })

  it("faz merge do delta no cache em vez de substituir a base", async () => {
    fetchMock = createFetchMock(({ url, method }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      if (method === "POST" && url.includes("/sync")) {
        // O botão manual manda `?forcar=true`: o caminho casa na parte da URL, não no fim.
        return { json: { pulado: false, processados: 1, contagem: 4, ultima_data: "2026-03-01", itens: [ITENS[0]] } }
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

  it("escolhe a integração de detalhe, não o card de faturamento diário", async () => {
    // O card vem primeiro na lista; casar por nome pegava ele e a tela mostrava
    // "Faturamento Dia (diário)" no cabeçalho.
    fetchMock = createFetchMock(({ url }) =>
      url.startsWith("/api/integracao/listar")
        ? { json: [INTEGRACAO_CARD, INTEGRACAO] }
        : { json: null }
    )
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<FaturamentoDetalhePage />)

    expect(await screen.findByText(/Faturamento Detalhe/)).toBeTruthy()
    expect(screen.queryByText(/Faturamento Dia/)).toBeNull()
  })

it("traz o período inteiro, atravessando as páginas do cache local", async () => {
    const pagina1 = Array.from({ length: 500 }, (_, i) =>
      item({ pedido: `P${i}`, item: 1, nr_nota: String(1000 + i) })
    )
    const pagina2 = [item({ nr_nota: "9999", pedido: "PX", data_nota: "2026-04-01" })]
    consultar.mockImplementation(async (_filtros, pagina) =>
      pagina === 1
        ? { ...consultaDe(pagina1), paginacao: { total: 501, pagina: 1, por_pagina: 500, total_paginas: 2 } }
        : { ...consultaDe(pagina2), paginacao: { total: 501, pagina: 2, por_pagina: 500, total_paginas: 2 } }
    )
    renderPage(<FaturamentoDetalhePage />)

    // A segunda página precisa entrar na contagem: antes a tela parava na 1ª e os
    // KPIs contavam só 500 itens, o que parecia base incompleta no Neon.
    await waitFor(() => expect(contagemNoPeriodo()).toBe("501 notas no período"))
    expect(consultar).toHaveBeenCalledWith(expect.anything(), 2, 500)
    expect(screen.getByRole("status", { name: "Mostrando 100 de 501 notas do período" })).toBeTruthy()
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