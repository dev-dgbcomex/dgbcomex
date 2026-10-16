// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import ContasPagasDetalhePage from "./page"
import { ContasPagasCard } from "./components/contas-pagas-card"
import { ContasPagasCharts } from "./components/contas-pagas-charts"
import { ContasPagasToolbar } from "./components/contas-pagas-toolbar"
import { exportarCsvContasPagas } from "./components/contas-pagas-csv"
import {
  FILTROS_VAZIOS,
  agruparPorFornecedor,
  filtrarPorFiltros,
  rotuloDocumento,
  type DetalheContasPagas,
  type GrupoFornecedor,
  type GrupoPorChave,
  type MesContasPagas,
  type PagamentoConta,
} from "@/lib/bi/contas-pagas-detalhe"

const INTEGRACAO = {
  id: 4,
  nome: "Contas Pagas",
  baseUrl: "https://api.erp.local/contas-pagas/{data}",
}

/** BaseUrl parecida, mas de outro card: não pode ser escolhida. */
const INTEGRACAO_PROGRAMADO = {
  id: 5,
  nome: "Contas a Pagar Programado",
  baseUrl: "https://api.erp.local/contas-a-pagar-programado/{data}",
}

const INTEGRACAO_CUSTOS = {
  id: 9,
  nome: "Custos Administrativos Anual",
  baseUrl: "https://api.erp.local/custos-administrativos-anual",
}

function pagamento(over: Partial<PagamentoConta> = {}): PagamentoConta {
  return {
    empresa: "13",
    documento: "000007424",
    serie: "U",
    fornecedor: "AABQQ",
    razao_social: "MOSTRUARIO FAST LTDA",
    tipo_fornecedor: "0",
    parcela: "01",
    parcial: "1",
    data_baixa: "2026-09-30",
    banco: "BANCO SANTANDER",
    numero_banco: "033",
    cheque: "D000002257",
    valor: 130,
    juros: 0,
    desconto: 0,
    valor_liquido: 130,
    departamento: "TRANSPORTE",
    departamento_codigo: "1.1.5.1",
    despesa: "FIXOS VARIAVEIS",
    despesa_2: "IMPORTACAO",
    rateio: false,
    ...over,
  }
}

function mes(over: Partial<MesContasPagas> = {}): MesContasPagas {
  return { mes: "2026-09", rotulo: "set/2026", total: 1724382.1, lancamentos: 118, ...over }
}

/** 24 meses terminando em out/2026, com outubro zerado. */
function serie(): MesContasPagas[] {
  const meses: MesContasPagas[] = []
  for (let i = 23; i >= 0; i--) {
    const d = new Date(2026, 9, 1)
    d.setMonth(d.getMonth() - i)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const rotulo = `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][d.getMonth()]}/${d.getFullYear()}`
    meses.push(mes({ mes: chave, rotulo, total: i === 0 ? 0 : 1500000, lancamentos: i === 0 ? 0 : 120 }))
  }
  return meses
}

type Janela = DetalheContasPagas["mes_anterior"]
type Referencia = DetalheContasPagas["referencia"]
type Periodo = DetalheContasPagas["periodo"]

function janela(over: Partial<Janela> = {}): Janela {
  return {
    rotulo: "setembro",
    inicio: "2026-09-01",
    fim: "2026-09-30",
    periodo: "01/09/2026 a 30/09/2026",
    total: 1724382.1,
    lancamentos: 118,
    ...over,
  }
}

/** A referência é a janela do mês escolhido mais a chave `YYYY-MM` dele. */
function referencia(over: Partial<Referencia> = {}): Referencia {
  return { ...janela(), mes: "2026-09", ...over }
}

function periodo(over: Partial<Periodo> = {}): Periodo {
  return { ...janela(), rotulo: "setembro", recorte: false, ...over }
}

function grupo(chave: string, over: Partial<GrupoPorChave> = {}): GrupoPorChave {
  return { lancamentos: 1, valor: 100, ...over }
}

function detalhe(over: Partial<DetalheContasPagas> = {}): DetalheContasPagas {
  return {
    referencia: referencia(),
    periodo: periodo(),
    mes: {
      ...janela(),
      itens: [pagamento()],
      por_fornecedor: [grupo("", { razao_social: "MOSTRUARIO FAST LTDA", lancamentos: 118, valor: 1724382.1 })],
      por_banco: [grupo("", { banco: "BANCO SANTANDER", lancamentos: 118, valor: 1724382.1 })],
      por_empresa: [grupo("", { empresa: "13", lancamentos: 118, valor: 1724382.1 })],
      por_departamento: [grupo("", { departamento: "TRANSPORTE", lancamentos: 118, valor: 1724382.1 })],
      por_despesa: [grupo("", { despesa: "FIXOS VARIAVEIS", lancamentos: 118, valor: 1724382.1 })],
    },
    mes_anterior: janela({ rotulo: "agosto", total: 1683509.91, lancamentos: 130 }),
    ano_atual: janela({ rotulo: "ano atual", total: 20224336.41, lancamentos: 1183 }),
    ano_anterior: janela({ rotulo: "ano anterior", total: 26771919.39, lancamentos: 1392 }),
    meses: serie(),
    ...over,
  }
}

/** Outubro sem nenhuma baixa: o mês corrente na primeira visita. */
function semBaixas(): DetalheContasPagas {
  return detalhe({
    referencia: referencia({ mes: "2026-10", rotulo: "outubro" }),
    periodo: periodo({
      rotulo: "outubro",
      inicio: "2026-10-01",
      fim: "2026-10-31",
      periodo: "01/10/2026 a 31/10/2026",
    }),
    mes: {
      ...janela({
        rotulo: "outubro",
        total: 0,
        lancamentos: 0,
        periodo: "01/10/2026 a 31/10/2026",
      }),
      itens: [],
      por_fornecedor: [],
      por_banco: [],
      por_empresa: [],
      por_departamento: [],
      por_despesa: [],
    },
  })
}

/** Dois fornecedores e dois bancos, para os cards e os filtros terem o que separar. */
function detalheVariado(): DetalheContasPagas {
  const itens = [
    pagamento({ valor: 1000, banco: "BANCO SANTANDER", departamento: "TRANSPORTE" }),
    pagamento({
      documento: "000105368",
      valor: 500,
      razao_social: "MF LOG TRANSPORTES LTDA",
      fornecedor: "00055",
      banco: "BANCO DO BRASIL",
      numero_banco: "001",
      departamento: "IMPORTACAO",
      departamento_codigo: "1.1.6.1",
    }),
    pagamento({
      documento: "000105369",
      valor: 250,
      razao_social: "MF LOG TRANSPORTES LTDA",
      fornecedor: "00055",
      banco: "BANCO BLU",
      numero_banco: "BLU",
      departamento: "IMPORTACAO",
      departamento_codigo: "1.1.6.1",
    }),
  ]
  const base = detalhe()
  return { ...base, mes: { ...base.mes, itens } }
}

/**
 * `resposta` pode depender do mês pedido: a tela recua sozinha para setembro quando
 * outubro vem vazio, e o mock precisa devolver setembro com dados para a tela parar.
 */
function mockRotas(
  resposta: DetalheContasPagas | ((data: string) => DetalheContasPagas),
  status = 200
) {
  return createFetchMock(({ url }) => {
    if (url.startsWith("/api/integracao/listar")) {
      return {
        status: 200,
        json: { integracoes: [INTEGRACAO_PROGRAMADO, INTEGRACAO_CUSTOS, INTEGRACAO] },
      }
    }
    if (url.includes("/detalhe/contas-pagas-detalhe")) {
      const mes = new URL(url, "http://api.local").searchParams.get("data") ?? ""
      return { status, json: typeof resposta === "function" ? resposta(mes) : resposta }
    }
    return { status: 404, json: { error: `Rota não mockada: ${url}` } }
  })
}

beforeEach(() => {
  navMock.setPathname("/bi/integracoes/contas-pagas")
})

describe("ContasPagasDetalhePage", () => {
  it("mostra as quatro janelas do card", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    expect(await screen.findByRole("status", { name: "total do mês atual" })).toHaveTextContent(
      "R$ 1.724.382,10"
    )
    expect(screen.getByRole("status", { name: "total do mês anterior" })).toHaveTextContent(
      "R$ 1.683.509,91"
    )
    expect(screen.getByRole("status", { name: "total do ano atual" })).toHaveTextContent(
      "R$ 20.224.336,41"
    )
    expect(screen.getByRole("status", { name: "total do ano anterior" })).toHaveTextContent(
      "R$ 26.771.919,39"
    )
  })

  it("escolhe a integração de contas pagas e não as parecidas", async () => {
    const { fn, calls } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    await screen.findByRole("status", { name: "total do mês atual" })

    const consulta = calls.find((c) => c.url.includes("contas-pagas-detalhe"))
    // id 4 = Contas Pagas; nunca o "Contas a Pagar Programado" (id 5).
    expect(consulta?.url).toContain("/api/integracao/4/detalhe/contas-pagas-detalhe")
  })

  it("lista um card por fornecedor com documento, banco e departamento", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    const lista = await screen.findByRole("region", { name: "Fornecedores" })
    expect(within(lista).getByText("MOSTRUARIO FAST LTDA")).toBeInTheDocument()

    // O card abre as baixas do fornecedor, como a nota abre os itens no faturamento.
    fireEvent.click(within(lista).getByRole("button", { name: /MOSTRUARIO FAST LTDA/ }))
    expect(await within(lista).findByText("000007424/U 01")).toBeInTheDocument()
    expect(within(lista).getByText("30/09/2026")).toBeInTheDocument()
    expect(within(lista).getByText("BANCO SANTANDER")).toBeInTheDocument()
    expect(within(lista).getByText("TRANSPORTE")).toBeInTheDocument()
  })

  it("mostra os cards de grafico: mes, fornecedor, banco, empresa e departamento", async () => {
    const { fn } = mockRotas(detalheVariado())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    await screen.findByRole("region", { name: "Fornecedores" })
    expect(screen.getByText("Pagamentos mês a mês")).toBeInTheDocument()
    expect(screen.getByText("Por fornecedor (top 8)")).toBeInTheDocument()
    expect(screen.getByText("Por banco — de onde saiu o dinheiro")).toBeInTheDocument()
    expect(screen.getByText("Por empresa — qual empresa pagou")).toBeInTheDocument()
    expect(screen.getByText("Por departamento — para onde foi")).toBeInTheDocument()

    // O gráfico de banco mostra os três, e não só o Santander.
    expect(screen.getAllByText("BANCO BLU").length).toBeGreaterThan(0)
    expect(screen.getByText("IMPORTACAO")).toBeInTheDocument()
  })

  it("recua para o ultimo mes fechado quando o mes de referencia esta vazio", async () => {
    const { fn, calls } = mockRotas((data) => (data === "2026-09-01" ? detalhe() : semBaixas()))
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    expect(await screen.findByRole("region", { name: "Fornecedores" })).toBeInTheDocument()
    const consultas = calls.filter((c) => c.url.includes("contas-pagas-detalhe"))
    expect(consultas.pop()?.url).toContain("data=2026-09-01")
    expect(screen.getByRole("status", { name: "total do mês atual" })).toHaveTextContent(
      "R$ 1.724.382,10"
    )
  })

  it("avisa que o mes vazio foi trocado pelo anterior", async () => {
    const { fn } = mockRotas((data) => (data === "2026-09-01" ? detalhe() : semBaixas()))
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    expect(await screen.findByText(/Outubro ainda não tem nenhuma baixa/)).toBeInTheDocument()
    expect(screen.getByText(/Mostrando Set\/2026, o último mês com pagamento/)).toBeInTheDocument()
    expect(screen.getByText("Clique em um mês no gráfico para ver os detalhes.")).toBeInTheDocument()
  })

  it("nao recua quando o usuario escolhe um mes vazio", async () => {
    const { fn } = mockRotas(semBaixas())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    await screen.findByText(/Outubro ainda não tem nenhuma baixa/)

    // Clicar na barra zerada de outubro: agora o mês vazio é escolha, não automático.
    // `findByRole` porque a troca de mês recarrega e o gráfico só volta com a resposta.
    fireEvent.click(await screen.findByRole("button", { name: /^out\/2026:/ }))

    expect(await screen.findByText(/Sem baixas em outubro/)).toBeInTheDocument()
    expect(screen.getByText(/não é erro de carga/i)).toBeInTheDocument()
  })

  it("filtra pela busca sem ir ao ERP", async () => {
    const { fn, calls } = mockRotas(detalheVariado())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    const lista = await screen.findByRole("region", { name: "Fornecedores" })
    const antes = calls.filter((c) => c.url.includes("contas-pagas-detalhe")).length

    fireEvent.change(screen.getByLabelText("Buscar nas baixas carregadas"), {
      target: { value: "000105368" },
    })

    await waitFor(() => {
      expect(within(lista).queryByText("MOSTRUARIO FAST LTDA")).not.toBeInTheDocument()
    })
    expect(within(lista).getByText("MF LOG TRANSPORTES LTDA")).toBeInTheDocument()
    expect(calls.filter((c) => c.url.includes("contas-pagas-detalhe")).length).toBe(antes)
  })

  it("filtra por banco, empresa e departamento pelos campos da toolbar", async () => {
    const { fn } = mockRotas(detalheVariado())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    const lista = await screen.findByRole("region", { name: "Fornecedores" })

    fireEvent.change(screen.getByLabelText("Banco"), { target: { value: "BLU" } })
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/ }))

    // Só o BLU pertence à MF LOG, então o card do mostruário some.
    await waitFor(() => {
      expect(within(lista).queryByText("MOSTRUARIO FAST LTDA")).not.toBeInTheDocument()
    })
    expect(within(lista).getByText("MF LOG TRANSPORTES LTDA")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Departamento"), { target: { value: "transporte" } })
    fireEvent.change(screen.getByLabelText("Banco"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/ }))

    await waitFor(() => {
      expect(within(lista).getByText("MOSTRUARIO FAST LTDA")).toBeInTheDocument()
    })
    expect(within(lista).queryByText("MF LOG TRANSPORTES LTDA")).not.toBeInTheDocument()
  })

  it("as datas vao para a API e a faixa aparece na tela", async () => {
    const { fn, calls } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    await screen.findByRole("region", { name: "Fornecedores" })

    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-08-15" } })
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-09-10" } })
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/ }))

    await waitFor(() => {
      const url = calls
        .filter((c) => c.url.includes("contas-pagas-detalhe"))
        .pop()?.url
      expect(url).toContain("data_inicio=2026-08-15")
      expect(url).toContain("data_fim=2026-09-10")
    })
  })

  it("seleciona fornecedores e offers PDF unico", async () => {
    const { fn } = mockRotas(detalheVariado())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    const lista = await screen.findByRole("region", { name: "Fornecedores" })

    fireEvent.click(screen.getByRole("button", { name: /Selecionar todos/ }))

    expect(await screen.findByRole("status", { name: /2 fornecedores selecionados/ })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /PDF único \(2\)/ })
    ).toBeInTheDocument()
    expect(within(lista).getAllByRole("checkbox", { checked: true })).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: /Inverter/ }))
    await waitFor(() => {
      expect(screen.getByRole("status", { name: /0 fornecedores selecionados/ })).toBeInTheDocument()
    })
  })

  it("clicar na barra troca o mes da tela", async () => {
    const { fn, calls } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    await screen.findByRole("region", { name: "Fornecedores" })
    const antes = calls.length

    fireEvent.click(screen.getByRole("button", { name: /^ago\/2026:/ }))

    await waitFor(() => {
      expect(calls.length).toBeGreaterThan(antes)
    })
    const nova = calls.filter((c) => c.url.includes("contas-pagas-detalhe")).pop()
    expect(nova?.url).toContain("data=2026-08-01")
  })

  it("mostra o erro da API quando a consulta falha", async () => {
    const { fn } = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) {
        return { status: 200, json: { integracoes: [INTEGRACAO] } }
      }
      return { status: 500, json: { detail: "Falha ao falar com o ERP" } }
    })
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    expect(await screen.findByText("Falha ao falar com o ERP")).toBeInTheDocument()
  })
})

describe("ContasPagasCharts", () => {
  const base = {
    meses: serie(),
    mesSelecionado: "2026-09",
    onSelecionarMes: () => {},
    porFornecedor: [grupo("", { razao_social: "MOSTRUARIO FAST", valor: 500 })],
    porBanco: [grupo("", { banco: "BANCO SANTANDER", valor: 500 })],
    porEmpresa: [grupo("", { empresa: "13", valor: 500 })],
    porDepartamento: [grupo("", { departamento: "TRANSPORTE", valor: 500 })],
    total: 500,
  }

  it("desenha 24 barras com o mes selecionado marcado", () => {
    renderPage(<ContasPagasCharts {...base} />)

    const botoes = screen.getAllByRole("button", { name: /em \d+ pagamentos$/ })
    expect(botoes).toHaveLength(24)
    expect(botoes.filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(1)
  })

  it("devolve o mes clicado", () => {
    const onSelecionarMes = vi.fn()
    renderPage(<ContasPagasCharts {...base} onSelecionarMes={onSelecionarMes} />)

    fireEvent.click(screen.getByRole("button", { name: /^jul\/2026:/ }))
    expect(onSelecionarMes).toHaveBeenCalledWith("2026-07")
  })

  it("avisa quando as baixas nao tem departamento classificado", () => {
    renderPage(
      <ContasPagasCharts
        {...base}
        porDepartamento={[grupo("", { departamento: "—", valor: 500 })]}
      />
    )

    expect(
      screen.getByText(/não têm departamento classificado no centro de custo/i)
    ).toBeInTheDocument()
  })
})

describe("ContasPagasCard", () => {
  const grupoFornecedor: GrupoFornecedor = {
    chave: "0:AABQQ",
    razao_social: "MOSTRUARIO FAST LTDA",
    fornecedor: "AABQQ",
    valor: 130,
    lancamentos: 1,
    itens: [pagamento()],
  }

  it("mostra o fornecedor, a participacao e o total", () => {
    renderPage(
      <ContasPagasCard
        grupo={grupoFornecedor}
        selecionado={false}
        expandido={false}
        totalGeral={260}
        onSelecionar={() => {}}
        onExpandir={() => {}}
        orientacao="portrait"
      />
    )

    expect(screen.getByText(/AABQQ/)).toBeInTheDocument()
    expect(screen.getByText(/50% do recorte/)).toBeInTheDocument()
    expect(screen.getByText("R$ 130,00")).toBeInTheDocument()
  })

  it("avisa a baixa rateada no centro de custo", () => {
    renderPage(
      <ContasPagasCard
        grupo={{ ...grupoFornecedor, itens: [pagamento({ rateio: true })] }}
        selecionado
        expandido
        totalGeral={130}
        onSelecionar={() => {}}
        onExpandir={() => {}}
        orientacao="portrait"
      />
    )

    expect(screen.getByText("rateado no centro de custo")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /MOSTRUARIO FAST LTDA/ })).toBeChecked()
  })
})

describe("ContasPagasToolbar", () => {
  it("mostra o recorte e avisa quando o filtro reduz a lista", () => {
    renderPage(
      <ContasPagasToolbar
        filtros={FILTROS_VAZIOS}
        onChange={() => {}}
        busca=""
        onBuscaChange={() => {}}
        onLimpar={() => {}}
        onAplicar={() => {}}
        totalBaixas={118}
        totalFiltro={12}
        periodo={{ periodo: "15/08/2026 a 10/09/2026", recorte: true }}
      />
    )

    expect(screen.getByRole("status", { name: /12 de 118 baixas no filtro/ })).toBeInTheDocument()
    expect(screen.getByText(/15\/08\/2026 a 10\/09\/2026 \(recorte aplicado\)/)).toBeInTheDocument()
  })
})

describe("agruparPorFornecedor", () => {
  it("junta as baixas do mesmo fornecedor, do maior para o menor", () => {
    const grupos = agruparPorFornecedor([
      pagamento({ valor: 100 }),
      pagamento({ documento: "B", fornecedor: "00055", razao_social: "MF LOG", valor: 500 }),
      pagamento({ documento: "C", fornecedor: "00055", razao_social: "MF LOG", valor: 300 }),
    ])

    expect(grupos).toHaveLength(2)
    expect(grupos[0]).toMatchObject({ razao_social: "MF LOG", valor: 800, lancamentos: 2 })
    expect(grupos[1]).toMatchObject({ razao_social: "MOSTRUARIO FAST LTDA", valor: 100 })
  })

  it("separa o mesmo codigo em tipos de fornecedor diferentes", () => {
    const grupos = agruparPorFornecedor([
      pagamento({ tipo_fornecedor: "0", fornecedor: "00055" }),
      pagamento({ tipo_fornecedor: "1", fornecedor: "00055" }),
    ])

    expect(grupos).toHaveLength(2)
  })
})

describe("filtrarPorFiltros", () => {
  const itens = [
    pagamento({ razao_social: "SERVIÇOS GERAIS LTDA", departamento: "TRANSPORTE" }),
    pagamento({
      documento: "000105368",
      razao_social: "MF LOG TRANSPORTES",
      banco: "BANCO BLU",
      numero_banco: "BLU",
      departamento: "IMPORTACAO",
    }),
  ]

  it("ignora caixa e acento no fornecedor", () => {
    expect(filtrarPorFiltros(itens, { ...FILTROS_VAZIOS, fornecedor: "servicos" }, "")).toHaveLength(1)
    expect(filtrarPorFiltros(itens, { ...FILTROS_VAZIOS, fornecedor: "SERVICOS" }, "")).toHaveLength(1)
    expect(filtrarPorFiltros(itens, { ...FILTROS_VAZIOS, fornecedor: "x" }, "")).toHaveLength(0)
  })

  it("filtra por banco pelo nome ou pelo codigo", () => {
    expect(filtrarPorFiltros(itens, { ...FILTROS_VAZIOS, banco: "blu" }, "")).toHaveLength(1)
    expect(filtrarPorFiltros(itens, { ...FILTROS_VAZIOS, banco: "033" }, "")).toHaveLength(1)
  })

  it("a busca acha em qualquer campo, inclusive documento e departamento", () => {
    expect(filtrarPorFiltros(itens, FILTROS_VAZIOS, "d000002257")).toHaveLength(2)
    expect(filtrarPorFiltros(itens, FILTROS_VAZIOS, "000007424")).toHaveLength(1)
    expect(filtrarPorFiltros(itens, FILTROS_VAZIOS, "importacao")).toHaveLength(1)
  })

  it("rotulo do documento junta documento, serie e parcela", () => {
    expect(rotuloDocumento(pagamento())).toBe("000007424/U 01")
    expect(rotuloDocumento(pagamento({ serie: "", parcela: "" }))).toBe("000007424")
  })
})

describe("exportarCsvContasPagas", () => {
  const criar = vi.fn()
  const revogar = vi.fn()

  beforeEach(() => {
    criar.mockClear()
    revogar.mockClear()
    vi.restoreAllMocks()
    vi.stubGlobal("URL", { ...URL, createObjectURL: criar, revokeObjectURL: revogar })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("baixa o arquivo com o periodo e leva departamento e despesa", () => {
    criar.mockReturnValue("blob:fake")
    const clique = vi.fn()
    const original = document.createElement.bind(document)
    let nome = ""
    const partes: string[] = []
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
    vi.stubGlobal(
      "Blob",
      class {
        constructor(conteudo: string[]) {
          partes.push(...conteudo)
        }
      }
    )

    exportarCsvContasPagas([pagamento()], "2026-09")

    expect(clique).toHaveBeenCalled()
    expect(nome).toBe("contas_pagas_2026-09.csv")
    expect(revogar).toHaveBeenCalledWith("blob:fake")
    expect(partes[0]).toContain("Departamento")
    expect(partes[0]).toContain("Cód. departamento")
    expect(partes[0]).toContain("Despesa")
    // BOM UTF-8: sem ele o Excel abre em latin-1 e quebra o acento da razão social.
    expect(partes[0].startsWith("\uFEFF")).toBe(true)
    expect(partes[0]).toContain("TRANSPORTE")
  })
})
