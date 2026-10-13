// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import CustosAdministrativosDetalhePage from "./page"
import { exportarCsv, variacao } from "./components/utils"
import { TabelaGruposCusto } from "./components/tabela-grupos-custo"
import { TabelaLancamentosCusto, filtrarLancamentos } from "./components/tabela-lancamentos-custo"
import type { DetalheCustosAdministrativos, LancamentoCusto, PeriodoCusto } from "./components/types"

const INTEGRACAO = {
  id: 9,
  nome: "Custos Administrativos Mensal",
  baseUrl: "https://api.erp.local/custos-administrativos-mensal",
}

/** Card "Faturamento Dia" tambem tem "faturamento" no nome; so o baseUrl decide. */
const INTEGRACAO_FATURAMENTO = {
  id: 3,
  nome: "Faturamento Dia (diário)",
  baseUrl: "https://api.erp.local/faturamento/{data}",
}

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
    valor: 100,
    ...over,
  }
}

function periodo(over: Partial<PeriodoCusto> = {}): PeriodoCusto {
  return {
    rotulo: "setembro/2026",
    inicio: "2026-09-01",
    fim: "2026-09-30",
    periodo: "01/09/2026 a 30/09/2026",
    mes: "2026-09",
    total: 0,
    lancamentos: 0,
    itens: [],
    por_departamento: [],
    por_despesa: [],
    por_fornecedor: [],
    ...over,
  }
}

function detalhe(over: Partial<DetalheCustosAdministrativos> = {}): DetalheCustosAdministrativos {
  return {
    departamentos: ["1.1.1.1", "1.1.1.2"],
    mes_atual: periodo({
      rotulo: "outubro/2026",
      mes: "2026-10",
      total: 0,
      itens: [],
    }),
    mes_anterior: periodo({
      total: 150,
      lancamentos: 2,
      // Documentos de agosto, para não se confundirem com os do mês corrente.
      itens: [
        lancamento({ documento: "016082026U", valor: 100 }),
        lancamento({ documento: "016082027U", despesa: "VARIÁVEIS", razao_social: "TELEFONICA", valor: 50 }),
      ],
      por_departamento: [{ departamento_nome: "ADM SBO", lancamentos: 2, valor: 150 }],
      por_despesa: [
        { despesa: "FIXOS", lancamentos: 1, valor: 100 },
        { despesa: "VARIÁVEIS", lancamentos: 1, valor: 50 },
      ],
      por_fornecedor: [
        { razao_social: "FOLHA PAGAMENTO", lancamentos: 1, valor: 100 },
        { razao_social: "TELEFONICA", lancamentos: 1, valor: 50 },
      ],
    }),
    ...over,
  }
}

/** Mês corrente com lançamentos e os três agrupamentos montados. */
function detalheComDados(): DetalheCustosAdministrativos {
  const itens = [
    lancamento({ valor: 100 }),
    lancamento({ documento: "016092027U", despesa: "VARIÁVEIS", razao_social: "TELEFONICA", valor: 50 }),
  ]
  const agrupa = (
    chave: "departamento_nome" | "despesa" | "razao_social",
    rotulos: [string, number][]
  ) => rotulos.map(([nome, valor]) => ({ [chave]: nome, lancamentos: 1, valor }))

  return detalhe({
    mes_atual: periodo({
      rotulo: "setembro/2026",
      mes: "2026-09",
      total: 150,
      lancamentos: 2,
      itens,
      por_departamento: agrupa("departamento_nome", [["ADM SBO", 150]]),
      por_despesa: agrupa("despesa", [
        ["FIXOS", 100],
        ["VARIÁVEIS", 50],
      ]),
      por_fornecedor: agrupa("razao_social", [
        ["FOLHA PAGAMENTO", 100],
        ["TELEFONICA", 50],
      ]),
    }),
  })
}

/** A data padrão depende de hoje, então o mock casa com o prefixo. */
function mockRotas(resposta: DetalheCustosAdministrativos, status = 200) {
  return createFetchMock(({ url }) => {
    if (url.startsWith("/api/integracao/listar")) {
      return { status: 200, json: { integracoes: [INTEGRACAO_FATURAMENTO, INTEGRACAO] } }
    }
    if (url.includes("/detalhe/custos-administrativos-detalhe")) {
      return { status, json: resposta }
    }
    return { status: 404, json: { error: `Rota não mockada: ${url}` } }
  })
}

beforeEach(() => {
  navMock.setPathname("/bi/integracoes/custos-administrativos")
})

describe("CustosAdministrativosDetalhePage", () => {
  it("carrega o mês atual e o anterior pela integração de custos administrativos", async () => {
    const { fn, calls } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosDetalhePage />)

    expect(await screen.findByText("R$ 0,00")).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "total do mês anterior" })).toHaveTextContent(
      "R$ 150,00"
    )
    const consulta = calls.find((c) => c.url.includes("custos-administrativos-detalhe"))
    // Usa a integração de custos (id 9), nunca a do faturamento (id 3).
    expect(consulta?.url).toContain("/api/integracao/9/detalhe/custos-administrativos-detalhe")
    expect(consulta?.url).toContain("data=")
  })

  it("mostra os agrupamentos e a lista de lançamentos do mês com valor", async () => {
    const { fn } = mockRotas(detalheComDados())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosDetalhePage />)

    await screen.findByText("Por departamento")
    const fornecedor = screen.getByRole("region", { name: "Por fornecedor" })
    expect(within(fornecedor).getByText("FOLHA PAGAMENTO")).toBeInTheDocument()
    expect(within(fornecedor).getByText("TELEFONICA")).toBeInTheDocument()

    const lancamentos = screen.getByRole("region", { name: "Lançamentos" })
    expect(within(lancamentos).getByText("016092026U")).toBeInTheDocument()
    expect(within(lancamentos).getByText("016092027U")).toBeInTheDocument()
    expect(within(lancamentos).getByText("2 de 2 lançamentos")).toBeInTheDocument()
  })

  it("só renderiza o mês anterior quando o bloco é aberto", async () => {
    const { fn } = mockRotas(detalheComDados())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosDetalhePage />)
    await screen.findByText("Por departamento")

    // O mês anterior tem os mesmos lançamentos, mas escondido: não deve duplicar as linhas.
    expect(screen.getAllByText("016092026U")).toHaveLength(1)
    expect(screen.queryByText("016082026U")).not.toBeInTheDocument()

    const botao = screen.getByRole("button", { name: /Lançamentos de setembro\/2026/ })
    expect(botao).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(botao)

    await waitFor(() => {
      expect(screen.getByText("016082026U")).toBeInTheDocument()
    })
    expect(botao).toHaveAttribute("aria-expanded", "true")
    // Agora os dois meses estão na tela, cada um com seus documentos.
    expect(screen.getAllByText("016092026U")).toHaveLength(1)
  })

  it("avisa que o mês sem baixa não é erro de carga", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosDetalhePage />)

    expect(await screen.findByText(/Enquanto não houver/i)).toBeInTheDocument()
    expect(await screen.findByText(/não é erro de carga/i)).toBeInTheDocument()
  })

  it("mostra a variação contra o mês anterior", async () => {
    const { fn } = mockRotas(
      detalhe({
        mes_atual: periodo({ total: 300, lancamentos: 3 }),
      })
    )
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosDetalhePage />)

    expect(await screen.findByText("Variação")).toBeInTheDocument()
    // 300 contra 150: subiu R$ 150,00, ou 100%.
    const variacao_ = screen.getByRole("status", { name: "variação contra o mês anterior" })
    expect(variacao_).toHaveTextContent("R$ 150,00")
    expect(screen.getByText(/a mais/)).toBeInTheDocument()
  })

  it("filtra os lançamentos pela busca sem ir ao ERP", async () => {
    const { fn, calls } = mockRotas(detalheComDados())
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosDetalhePage />)
    const lancamentos = await screen.findByRole("region", { name: "Lançamentos" })
    const antes = calls.filter((c) => c.url.includes("custos-administrativos-detalhe")).length

    fireEvent.change(screen.getByLabelText("Buscar nos lançamentos"), {
      target: { value: "telefonica" },
    })

    await waitFor(() => {
      expect(within(lancamentos).queryByText("FOLHA PAGAMENTO")).not.toBeInTheDocument()
    })
    expect(within(lancamentos).getByText("TELEFONICA")).toBeInTheDocument()
    expect(calls.filter((c) => c.url.includes("custos-administrativos-detalhe")).length).toBe(antes)
  })

  it("mostra o erro da API quando a consulta falha", async () => {
    const { fn } = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) {
        return { status: 200, json: { integracoes: [INTEGRACAO] } }
      }
      return { status: 500, json: { detail: "Falha ao falar com o ERP" } }
    })
    vi.stubGlobal("fetch", fn)

    renderPage(<CustosAdministrativosDetalhePage />)

    expect(await screen.findByText("Falha ao falar com o ERP")).toBeInTheDocument()
  })
})

describe("TabelaGruposCusto", () => {
  it("mostra a participação de cada grupo no total do mês", () => {
    renderPage(
      <TabelaGruposCusto
        grupos={[
          { despesa: "FIXOS", lancamentos: 3, valor: 75 },
          { despesa: "VARIÁVEIS", lancamentos: 1, valor: 25 },
        ]}
        chave="despesa"
        titulo="Por tipo de despesa"
        descricao="teste"
        rotuloColuna="Despesa"
        total={100}
      />
    )

    expect(screen.getByText("75%")).toBeInTheDocument()
    expect(screen.getByText("25%")).toBeInTheDocument()
  })

  it("avisa quando o mês não tem lançamentos", () => {
    renderPage(
      <TabelaGruposCusto
        grupos={[]}
        chave="despesa"
        titulo="Por tipo de despesa"
        descricao="teste"
        rotuloColuna="Despesa"
        total={0}
      />
    )

    expect(screen.getByText("Nenhum lançamento neste mês.")).toBeInTheDocument()
  })
})

describe("TabelaLancamentosCusto", () => {
  it("formata a data no padrão brasileiro e mostra a contagem", () => {
    renderPage(<TabelaLancamentosCusto itens={[lancamento()]} busca="" />)

    expect(screen.getByText("30/09/2026")).toBeInTheDocument()
    expect(screen.getByText("1 de 1 lançamentos")).toBeInTheDocument()
  })

  it("acha por documento ignorando caixa", () => {
    expect(filtrarLancamentos([lancamento()], "016092026u")).toHaveLength(1)
    expect(filtrarLancamentos([lancamento()], "inexistente")).toHaveLength(0)
  })

  it("acha ignorando acento", () => {
    const itens = [lancamento({ razao_social: "SERVIÇOS VARIÁVEIS LTDA" })]
    expect(filtrarLancamentos(itens, "servicos")).toHaveLength(1)
  })
})

describe("variação", () => {
  it("sobe quando o mês atual é maior", () => {
    const v = variacao(300, 150)
    expect(v.diferenca).toBe(150)
    expect(v.percentual).toBeCloseTo(1)
    expect(v.subiu).toBe(true)
  })

  it("desce quando o mês atual é menor", () => {
    const v = variacao(100, 200)
    expect(v.diferenca).toBe(-100)
    expect(v.percentual).toBeCloseTo(-0.5)
    expect(v.subiu).toBe(false)
  })

  it("não divide por zero quando o mês anterior está zerado", () => {
    expect(variacao(120, 0).percentual).toBeNull()
  })
})

describe("exportarCsv", () => {
  const criar = vi.fn()
  const revogar = vi.fn()

  beforeEach(() => {
    criar.mockClear()
    revogar.mockClear()
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: criar,
      revokeObjectURL: revogar,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("baixa um arquivo por mês com o valor numérico", () => {
    criar.mockReturnValue("blob:fake")
    const clique = vi.fn()
    const original = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = original(tag)
      if (tag === "a") el.click = clique
      return el
    })

    exportarCsv(periodo({ mes: "2026-09", itens: [lancamento({ valor: 1234.56 })] }), "2026-09")

    expect(clique).toHaveBeenCalled()
    expect(revogar).toHaveBeenCalledWith("blob:fake")
  })
})
