// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import CustosAdministrativosAnualPage from "./page"
import { GraficoCustoMensal, LIMITE_ALERTA } from "./components/grafico-custo-mensal"
import { TabelaMeses } from "./components/tabela-meses"
import { exportarCsvAnual, itensFiltrados, mesesPorCusto } from "./components/utils"
import type {
  DetalheCustosAdministrativosAnual,
  LancamentoCusto,
  MesCusto,
} from "@/lib/bi/custo-detalhe"

const INTEGRACAO = {
  id: 9,
  nome: "Custos Administrativos Anual",
  baseUrl: "https://api.erp.local/custos-administrativos-anual",
}

const INTEGRACAO_MENSAL = {
  id: 8,
  nome: "Custos Administrativos Mensal",
  baseUrl: "https://api.erp.local/custos-administrativos-mensal",
}

function mes(over: Partial<MesCusto> = {}): MesCusto {
  return {
    mes: "2026-09",
    rotulo: "set/2026",
    administrativo: 170459.83,
    faturamento: 1508833.55,
    porcentagem: 0.113,
    lancamentos: 49,
    ...over,
  }
}

const MESES: MesCusto[] = [
  mes({ mes: "2025-10", rotulo: "out/2025", administrativo: 2749121.27, faturamento: 3009830.27, porcentagem: 0.913, lancamentos: 136 }),
  mes({ mes: "2025-11", rotulo: "nov/2025", administrativo: 2808124.92, faturamento: 2529704.2, porcentagem: 1.11, lancamentos: 133 }),
  mes({ mes: "2026-09", rotulo: "set/2026" }),
]

function lancamento(over: Partial<LancamentoCusto> = {}): LancamentoCusto {
  return {
    empresa: "13",
    documento: "016092026U",
    fornecedor: "F001",
    razao_social: "FOLHA PAGAMENTO",
    despesa: "FIXOS",
    despesa_2: "PESSOAL",
    departamento: "1.1.1.2",
    departamento_nome: "ADM SBO",
    data_baixa: "2026-09-30",
    data_emissao: "2026-09-01",
    parcela: "1",
    referente: "09/2026",
    valor: 170459.83,
    mes: "2026-09",
    ...over,
  }
}

function detalhe(
  over: Partial<DetalheCustosAdministrativosAnual> = {}
): DetalheCustosAdministrativosAnual {
  return {
    departamentos: ["1.1.1.1", "1.1.1.2"],
    janela: {
      rotulo: "out/2025 a set/2026",
      inicio: "2025-10-01",
      fim: "2026-09-30",
      periodo: "01/10/2025 a 30/09/2026",
      meses: 12,
    },
    administrativo: { total: 9906460.7, media: 825538.39, lancamentos: 898 },
    faturamento: { total: 27522110.17, media: 2293509.18, porcentagem: 0.3599 },
    meses: MESES,
    por_departamento: [{ departamento_nome: "ADM SC", lancamentos: 807, valor: 9813166.81 }],
    por_despesa: [{ despesa: "FIXOS VARIAVEIS", lancamentos: 353, valor: 7788564.86 }],
    por_fornecedor: [{ razao_social: "BANCO SANTANDER", lancamentos: 19, valor: 3545304.04 }],
    itens: [lancamento()],
    ...over,
  }
}

function mockRotas(resposta: DetalheCustosAdministrativosAnual, status = 200) {
  return createFetchMock(({ url }) => {
    if (url.startsWith("/api/integracao/listar")) {
      return {
        status: 200,
        json: { integracoes: [INTEGRACAO_MENSAL, INTEGRACAO] },
      }
    }
    if (url.includes("/detalhe/custos-administrativos-anual-detalhe")) {
      return { status, json: resposta }
    }
    return { status: 404, json: { error: `Rota não mockada: ${url}` } }
  })
}

beforeEach(() => {
  navMock.setPathname("/bi/integracoes/custos-administrativos-anual")
})

describe("CustosAdministrativosAnualPage", () => {
  it("mostra os quatro numeros do card", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosAnualPage />)

    expect(
      await screen.findByRole("status", { name: "custo administrativo total" })
    ).toHaveTextContent("R$ 9.906.460,70")
    expect(
      screen.getByRole("status", { name: "custo administrativo médio mensal" })
    ).toHaveTextContent("R$ 825.538,39")
    expect(
      screen.getByRole("status", { name: "faturamento médio mensal" })
    ).toHaveTextContent("R$ 2.293.509,18")
    expect(
      screen.getByRole("status", { name: "porcentagem do faturamento" })
    ).toHaveTextContent("36%")
  })

  it("busca pela integração anual e não pela mensal", async () => {
    const { fn, calls } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosAnualPage />)
    await screen.findByRole("status", { name: "custo administrativo total" })

    const consulta = calls.find((c) => c.url.includes("custos-administrativos-anual-detalhe"))
    expect(consulta?.url).toContain("/api/integracao/9/detalhe/custos-administrativos-anual-detalhe")
    expect(consulta?.url).toContain("data=")
  })

  it("avisa quando algum mês passou do limite do faturamento", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosAnualPage />)

    expect(await screen.findByText(/Atenção/i)).toBeInTheDocument()
    // nov/2025 passou de 100% do faturamento; out/2025 passou de 90%.
    expect(screen.getByText(/out\/2025, nov\/2025/)).toBeInTheDocument()
  })

  it("mostra os agrupamentos do periodo", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosAnualPage />)

    const despesa = await screen.findByRole("region", { name: "Por tipo de despesa" })
    expect(within(despesa).getByText("FIXOS VARIAVEIS")).toBeInTheDocument()
    const fornecedor = screen.getByRole("region", { name: "Por fornecedor" })
    expect(within(fornecedor).getByText("BANCO SANTANDER")).toBeInTheDocument()
  })

  it("clicar num mes filtra a lista e o total do recorte", async () => {
    const { fn } = mockRotas(
      detalhe({
        itens: [
          lancamento({ mes: "2026-09", documento: "DOC-SET" }),
          lancamento({ mes: "2025-11", documento: "DOC-NOV", valor: 2808124.92 }),
        ],
      })
    )
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosAnualPage />)
    const lancamentos = await screen.findByRole("region", { name: "Lançamentos" })
    expect(within(lancamentos).getByText("DOC-NOV")).toBeInTheDocument()

    fireEvent.click(screen.getByText("nov/2025"))

    // Clicar em nov/2025 filtra para aquele mês: DOC-NOV fica, DOC-SET sai.
    await waitFor(() => {
      expect(within(lancamentos).queryByText("DOC-SET")).not.toBeInTheDocument()
    })
    expect(within(lancamentos).getByText("DOC-NOV")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Ver os 12 meses/ })).toBeInTheDocument()
  })

  it("filtra por mes pelo seletor sem ir ao ERP", async () => {
    const { fn, calls } = mockRotas(
      detalhe({
        itens: [
          lancamento({ mes: "2026-09", documento: "DOC-SET" }),
          lancamento({ mes: "2025-11", documento: "DOC-NOV" }),
        ],
      })
    )
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosAnualPage />)
    const lancamentos = await screen.findByRole("region", { name: "Lançamentos" })
    const antes = calls.filter((c) => c.url.includes("anual-detalhe")).length

    fireEvent.change(screen.getByLabelText("Filtrar por mês"), { target: { value: "2025-11" } })

    await waitFor(() => {
      expect(within(lancamentos).queryByText("DOC-SET")).not.toBeInTheDocument()
    })
    expect(within(lancamentos).getByText("DOC-NOV")).toBeInTheDocument()
    expect(calls.filter((c) => c.url.includes("anual-detalhe")).length).toBe(antes)
  })

  it("mostra o erro da API quando a consulta falha", async () => {
    const { fn } = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) {
        return { status: 200, json: { integracoes: [INTEGRACAO] } }
      }
      return { status: 500, json: { detail: "Falha ao falar com o ERP" } }
    })
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosAnualPage />)

    expect(await screen.findByText("Falha ao falar com o ERP")).toBeInTheDocument()
  })
})

describe("GraficoCustoMensal", () => {
  it("avisa sobre os meses acima do limite", () => {
    renderPage(<GraficoCustoMensal meses={MESES} mesSelecionado="" />)

    expect(screen.getByText(/Atenção/i)).toBeInTheDocument()
    expect(screen.getByText(/out\/2025, nov\/2025/)).toBeInTheDocument()
  })

  it("nao avisa quando nenhum mes passa do limite", () => {
    renderPage(
      <GraficoCustoMensal
        meses={[mes({ porcentagem: 0.1 }), mes({ mes: "2026-08", rotulo: "ago/2026", porcentagem: 0.2 })]}
        mesSelecionado=""
      />
    )

    expect(screen.queryByText(/Atenção/i)).not.toBeInTheDocument()
  })

  it("destaca o mes em foco", () => {
    renderPage(<GraficoCustoMensal meses={MESES} mesSelecionado="2026-09" />)

    expect(screen.getByRole("region", { name: "Custo administrativo por mês" })).toBeInTheDocument()
  })
})

describe("TabelaMeses", () => {
  it("ordena do maior para o menor e mostra total e media no rodape", () => {
    renderPage(
      <TabelaMeses detalhe={detalhe()} mesSelecionado="" onSelecionar={() => {}} />
    )

    const linhas = within(screen.getByRole("region", { name: "Meses do período" })).getAllByRole(
      "row"
    )
    // Cabecalho + 3 meses + total + media.
    expect(linhas).toHaveLength(6)
    expect(linhas[1]).toHaveTextContent("nov/2025")
    expect(linhas[3]).toHaveTextContent("set/2026")
    expect(linhas[4]).toHaveTextContent("R$ 9.906.460,70")
    expect(linhas[5]).toHaveTextContent("R$ 825.538,39")
  })

  it("marca em vermelho o mes que passou do faturamento", () => {
    renderPage(
      <TabelaMeses detalhe={detalhe()} mesSelecionado="" onSelecionar={() => {}} />
    )

    const linha = screen.getByText("nov/2025").closest("tr")!
    expect(linha).toHaveTextContent("111%")
    expect(linha.className).toMatch(/cursor-pointer/)
  })

  it("devolve o mes clicado", () => {
    const onSelecionar = vi.fn()
    renderPage(<TabelaMeses detalhe={detalhe()} mesSelecionado="" onSelecionar={onSelecionar} />)

    fireEvent.click(screen.getByText("out/2025"))
    expect(onSelecionar).toHaveBeenCalledWith("2025-10")
  })
})

describe("itensFiltrados", () => {
  const itens = [
    lancamento({ mes: "2026-09", documento: "SET-1" }),
    lancamento({ mes: "2025-11", documento: "NOV-1", razao_social: "BANCO SANTANDER" }),
  ]

  it("sem filtro devolve tudo", () => {
    expect(itensFiltrados(detalhe({ itens }), "", "")).toHaveLength(2)
  })

  it("filtra por mes", () => {
    const filtrados = itensFiltrados(detalhe({ itens }), "", "2025-11")
    expect(filtrados.map((i) => i.documento)).toEqual(["NOV-1"])
  })

  it("combina mes e busca", () => {
    expect(itensFiltrados(detalhe({ itens }), "", "2026-09")).toHaveLength(1)
    expect(itensFiltrados(detalhe({ itens }), "santander", "2026-09")).toHaveLength(0)
    expect(itensFiltrados(detalhe({ itens }), "santander", "2025-11")).toHaveLength(1)
  })
})

describe("mesesPorCusto", () => {
  it("coloca o maior primeiro", () => {
    expect(mesesPorCusto(MESES).map((m) => m.mes)).toEqual([
      "2025-11",
      "2025-10",
      "2026-09",
    ])
  })
})

describe("exportarCsvAnual", () => {
  const criar = vi.fn()
  const revogar = vi.fn()

  beforeEach(() => {
    criar.mockClear()
    revogar.mockClear()
    // `espionarDownload` embrulha `document.createElement`; sem restaurar, a segunda
    // chamada embrulha o mock da primeira e a recursão estoura a pilha.
    vi.restoreAllMocks()
    vi.stubGlobal("URL", { ...URL, createObjectURL: criar, revokeObjectURL: revogar })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function espionarDownload() {
    const clique = vi.fn()
    const original = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = original(tag)
      if (tag === "a") el.click = clique
      return el
    })
    return clique
  }

  it("nomeia o arquivo com o mes quando ha filtro", () => {
    criar.mockReturnValue("blob:fake")
    const clique = espionarDownload()

    exportarCsvAnual([lancamento()], "out/2025 a set/2026", mes())

    expect(clique).toHaveBeenCalled()
    expect(revogar).toHaveBeenCalledWith("blob:fake")
  })

  it("baixa o recorte inteiro quando nao ha mes", () => {
    criar.mockReturnValue("blob:fake")
    espionarDownload()

    exportarCsvAnual([lancamento()], "out/2025 a set/2026", null)

    expect(revogar).toHaveBeenCalledWith("blob:fake")
  })
})

describe("LIMITE_ALERTA", () => {
  it("e metade do faturamento", () => {
    expect(LIMITE_ALERTA).toBe(0.5)
  })
})
