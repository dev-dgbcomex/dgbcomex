// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import ContasPagasDetalhePage from "./page"
import { GraficoPagamentosMensais } from "./components/grafico-pagamentos"
import { TabelaPagamentos, exportarCsvContasPagas, filtrarPagamentos, porDocumento } from "./components/tabela-pagamentos"
import { rotuloDocumento, resumoDespesas } from "@/lib/bi/contas-pagas-detalhe"
import type { DetalheContasPagas, MesContasPagas, PagamentoConta } from "@/lib/bi/contas-pagas-detalhe"

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

function detalhe(over: Partial<DetalheContasPagas> = {}): DetalheContasPagas {
  return {
    referencia: referencia(),
    mes: {
      ...janela(),
      itens: [pagamento()],
      por_fornecedor: [{ razao_social: "MOSTRUARIO FAST LTDA", lancamentos: 118, valor: 1724382.1 }],
      por_banco: [{ banco: "BANCO SANTANDER", lancamentos: 118, valor: 1724382.1 }],
      por_empresa: [{ empresa: "13", lancamentos: 118, valor: 1724382.1 }],
    },
    mes_anterior: janela({ rotulo: "agosto", total: 1683509.91, lancamentos: 130 }),
    ano_atual: janela({ rotulo: "ano atual", total: 20224336.41, lancamentos: 1183 }),
    ano_anterior: janela({ rotulo: "ano anterior", total: 26771919.39, lancamentos: 1392 }),
    meses: serie(),
    ...over,
  }
}

/** October sem nenhuma baixa: o mês corrente na primeira visita. */
function semBaixas(): DetalheContasPagas {
  return detalhe({
    referencia: referencia({ mes: "2026-10", rotulo: "outubro" }),
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
    },
  })
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

  it("lista as baixas com documento, fornecedor e banco", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    const lista = await screen.findByRole("region", { name: "Pagamentos" })
    expect(within(lista).getByText("30/09/2026")).toBeInTheDocument()
    expect(within(lista).getByText("000007424/U 01")).toBeInTheDocument()
    expect(within(lista).getByText("MOSTRUARIO FAST LTDA")).toBeInTheDocument()
    expect(within(lista).getByText("BANCO SANTANDER")).toBeInTheDocument()
    expect(within(lista).getByText("1 de 1 baixas")).toBeInTheDocument()
  })

  it("recua para o ultimo mes fechado quando o mes de referencia esta vazio", async () => {
    const { fn, calls } = mockRotas((data) => (data === "2026-09-01" ? detalhe() : semBaixas()))
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    // A referência nasce em outubro (zerado): a tela pede setembro sozinha.
    expect(await screen.findByRole("region", { name: "Pagamentos" })).toBeInTheDocument()
    const consultas = calls.filter((c) => c.url.includes("contas-pagas-detalhe"))
    expect(consultas.pop()?.url).toContain("data=2026-09-01")
    expect(screen.getByRole("status", { name: "total do mês atual" })).toHaveTextContent(
      "R$ 1.724.382,10"
    )
    // O seletor de mês também volta, senão o topo mente sobre o mês listado.
    expect(screen.getByLabelText("Mês de referência")).toHaveValue("2026-09-01")
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
    fireEvent.click(screen.getByRole("button", { name: /^out\/2026:/ }))

    expect(await screen.findByText(/Sem baixas em outubro/)).toBeInTheDocument()
    expect(screen.getByText(/não é erro de carga/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText(/ainda não tem nenhuma baixa/)).not.toBeInTheDocument()
    })
    expect(screen.queryByRole("region", { name: "Pagamentos" })).not.toBeInTheDocument()
  })

  it("limpar volta para o mes atual", async () => {
    const { fn } = mockRotas((data) => (data === "2026-09-01" ? detalhe() : semBaixas()))
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    await screen.findByRole("region", { name: "Pagamentos" })

    fireEvent.click(screen.getByRole("button", { name: /Limpar/ }))

    // October volta a ser a referência; como segue vazio, ela recua de novo.
    expect(await screen.findByText(/Outubro ainda não tem nenhuma baixa/)).toBeInTheDocument()
  })

  it("mostra os agrupamentos do mes", async () => {
    const { fn } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)

    const fornecedor = await screen.findByRole("region", { name: "Por fornecedor" })
    expect(within(fornecedor).getByText("MOSTRUARIO FAST LTDA")).toBeInTheDocument()
    const banco = screen.getByRole("region", { name: "Por banco" })
    expect(within(banco).getByText("BANCO SANTANDER")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Por empresa" })).toBeInTheDocument()
  })

  it("filtra a lista pela busca sem ir ao ERP", async () => {
    const { fn, calls } = mockRotas(
      detalhe({
        mes: {
          ...janela(),
          itens: [pagamento(), pagamento({ documento: "000105368", razao_social: "MF LOG TRANSPORTES" })],
          por_fornecedor: [],
          por_banco: [],
          por_empresa: [],
        },
      })
    )
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    const lista = await screen.findByRole("region", { name: "Pagamentos" })
    const antes = calls.filter((c) => c.url.includes("contas-pagas-detalhe")).length

    fireEvent.change(screen.getByLabelText("Buscar nos pagamentos"), {
      target: { value: "000105368" },
    })

    await waitFor(() => {
      expect(within(lista).queryByText("MOSTRUARIO FAST LTDA")).not.toBeInTheDocument()
    })
    expect(within(lista).getByText("MF LOG TRANSPORTES")).toBeInTheDocument()
    expect(calls.filter((c) => c.url.includes("contas-pagas-detalhe")).length).toBe(antes)
  })

  it("clicar na barra troca o mes da tela", async () => {
    const { fn, calls } = mockRotas(detalhe())
    vi.stubGlobal("fetch", fn)

    renderPage(<ContasPagasDetalhePage />)
    await screen.findByRole("region", { name: "Pagamentos" })
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

describe("GraficoPagamentosMensais", () => {
  it("desenha 24 barras com o mes selecionado marcado", () => {
    renderPage(
      <GraficoPagamentosMensais meses={serie()} mesSelecionado="2026-09" onSelecionar={() => {}} />
    )

    const grafico = screen.getByRole("region", { name: "Pagamentos por mês" })
    const botoes = within(grafico).getAllByRole("button")
    expect(botoes).toHaveLength(24)
    expect(botoes.filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(1)
  })

  it("devolve o mes clicado", () => {
    const onSelecionar = vi.fn()
    renderPage(
      <GraficoPagamentosMensais meses={serie()} mesSelecionado="2026-09" onSelecionar={onSelecionar} />
    )

    fireEvent.click(screen.getByRole("button", { name: /^jul\/2026:/ }))
    expect(onSelecionar).toHaveBeenCalledWith("2026-07")
  })

  it("o rotulo da barra traz o valor e a contagem", () => {
    renderPage(
      <GraficoPagamentosMensais
        meses={[mes({ mes: "2026-09", rotulo: "set/2026", total: 1724382.1, lancamentos: 118 })]}
        mesSelecionado="2026-09"
        onSelecionar={() => {}}
      />
    )

    expect(screen.getByRole("button", { name: /R\$\s*1\.724\.382,10 em 118 pagamentos/ })).toBeInTheDocument()
  })

  it("convida a clicar em um mes para ver os detalhes", () => {
    renderPage(
      <GraficoPagamentosMensais meses={serie()} mesSelecionado="2026-09" onSelecionar={() => {}} />
    )

    const grafico = screen.getByRole("region", { name: "Pagamentos por mês" })
    expect(within(grafico).getByText("Clique em um mês para ver os detalhes.")).toBeInTheDocument()
    // A serie completa precisa vir preenchida: sem dado o convite não teria o que abrir.
    expect(within(grafico).getByText("nov/2024")).toBeInTheDocument()
    expect(within(grafico).getByText("out/2026")).toBeInTheDocument()
  })
})

describe("TabelaPagamentos", () => {
  it("distingue lista vazia de busca sem resultado", () => {
    const { unmount } = renderPage(<TabelaPagamentos itens={[]} busca="" />)
    expect(screen.getByText("Nenhuma baixa neste mês.")).toBeInTheDocument()
    unmount()

    renderPage(<TabelaPagamentos itens={[pagamento()]} busca="nada" />)
    expect(screen.getByText("Nenhum pagamento encontrado.")).toBeInTheDocument()
  })

  it("mostra o total do recorte quando a busca reduz a lista", () => {
    renderPage(
      <TabelaPagamentos
        itens={[pagamento(), pagamento({ documento: "999", razao_social: "OUTRO" })]}
        busca="MOSTRUARIO"
      />
    )

    expect(screen.getByText(/Total do filtro:/)).toBeInTheDocument()
  })
})

describe("filtro e helpers", () => {
  it("filtra ignorando caixa e acento", () => {
    const itens = [pagamento({ razao_social: "SERVIÇOS GERAIS LTDA" })]
    expect(filtrarPagamentos(itens, "servicos")).toHaveLength(1)
    expect(filtrarPagamentos(itens, "SERVICOS")).toHaveLength(1)
    expect(filtrarPagamentos(itens, "inexistente")).toHaveLength(0)
    expect(filtrarPagamentos(itens, "")).toHaveLength(1)
  })

  it("acha pelo numero do cheque", () => {
    expect(filtrarPagamentos([pagamento()], "d000002257")).toHaveLength(1)
  })

  it("agrupa as parcelas do mesmo documento", () => {
    const itens = [
      pagamento({ parcela: "01", valor: 100 }),
      pagamento({ parcela: "02", valor: 200 }),
      pagamento({ documento: "OUTRO", valor: 50 }),
    ]
    const grupos = porDocumento(itens)
    expect(grupos).toHaveLength(2)
    expect(grupos[0]).toMatchObject({ parcelas: 2, valor: 300 })
  })

  it("rotulo do documento junta documento, serie e parcela", () => {
    expect(rotuloDocumento(pagamento())).toBe("000007424/U 01")
    expect(rotuloDocumento(pagamento({ serie: "", parcela: "" }))).toBe("000007424")
  })

  it("resumo de juros e desconto so aparece quando ha", () => {
    expect(resumoDespesas(pagamento())).toBeNull()
    expect(resumoDespesas(pagamento({ juros: 12.5 }))).toContain("juros")
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

  it("baixa o arquivo com o nome do mes", () => {
    criar.mockReturnValue("blob:fake")
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

    exportarCsvContasPagas([pagamento()], "2026-09")

    expect(clique).toHaveBeenCalled()
    expect(nome).toBe("contas_pagas_2026-09-01.csv")
    expect(revogar).toHaveBeenCalledWith("blob:fake")
  })
})
