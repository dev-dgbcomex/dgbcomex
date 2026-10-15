// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import DisponibilidadeComercialPage from "./page"
import {
  exportarCsvDisponibilidade,
  filtrarLinhas,
  ordenarLinhas,
  type Disponibilidade,
  type DisponibilidadeLinha,
} from "@/lib/bi/disponibilidade"

const INTEGRACAO = {
  id: 11,
  nome: "Disponibilidade Comercial",
  baseUrl: "http://127.0.0.1:58245/estoque-disponibilidade",
}

/** Outra integração da tela comercial: nao pode ser escolhida. */
const INTEGRACAO_OUTRA = {
  id: 12,
  nome: "Outra",
  baseUrl: "http://127.0.0.1:58245/contas-pagas-detalhe",
}

function linha(over: Partial<DisponibilidadeLinha> = {}): DisponibilidadeLinha {
  return {
    produto: "000014",
    produto_desc: "VELUDO CONFORT",
    cor: "00005",
    cor_desc: "5 - BLACK",
    estoque_metros: 54_340,
    estoque_pecas: 120,
    estoque_rolos: 30,
    caminho_metros: 0,
    pedidos_compra: 0,
    primeira_chegada: null,
    ultima_chegada: null,
    prometido_metros: 10_500,
    prometido_valor: 70_350,
    pedidos_venda: 4,
    livre_metros: 43_840,
    cobertura_metros: 43_840,
    falta_metros: 0,
    por_representante: [
      { vendedor: "055", vendedor_nome: "ANA", pedidos: 3, saldo: 10_000, valor: 66_000 },
    ],
    ...over,
  }
}

function resposta(over: Partial<Disponibilidade> = {}): Disponibilidade {
  return {
    resumo: {
      produtos_cor: 2,
      com_falta: 1,
      total_estoque: 54_431,
      total_caminho: 10_640,
      total_prometido: 20_099,
      total_falta: 20_008,
      valor_prometido: 71_396,
    },
    linhas: [
      linha(),
      linha({
        cor: "00011",
        cor_desc: "11 - BEIGE",
        estoque_metros: 91,
        estoque_pecas: 1,
        estoque_rolos: 1,
        caminho_metros: 10_640,
        pedidos_compra: 1,
        primeira_chegada: "2026-11-09",
        ultima_chegada: "2026-11-09",
        prometido_metros: 20_099,
        prometido_valor: 147_365.46,
        pedidos_venda: 10,
        livre_metros: -20_008,
        cobertura_metros: -9_368,
        falta_metros: 20_008,
        por_representante: [
          { vendedor: "058", vendedor_nome: "PROFECTUS", pedidos: 6, saldo: 10_101, valor: 71_396 },
          { vendedor: "009", vendedor_nome: "GDUE", pedidos: 4, saldo: 3_998, valor: 29_069 },
        ],
      }),
      linha({
        cor: "00056",
        cor_desc: "56 - NATURAL",
        produto_desc: "BELGA",
        estoque_metros: 5_923,
        estoque_pecas: 93,
        estoque_rolos: 93,
        caminho_metros: 30_207,
        pedidos_compra: 2,
        primeira_chegada: "2026-11-23",
        ultima_chegada: "2026-11-23",
        prometido_metros: 16_600,
        prometido_valor: 130_950.2,
        livre_metros: -10_677,
        cobertura_metros: 19_530,
        falta_metros: 10_677,
        por_representante: [
          { vendedor: "055", vendedor_nome: "ANA", pedidos: 3, saldo: 16_600, valor: 130_950 },
        ],
      }),
    ],
    ...over,
  }
}

let fetchMock: ReturnType<typeof createFetchMock>

function rotas(dados: Disponibilidade = resposta()) {
  return createFetchMock(({ url }) => {
    if (url.startsWith("/api/integracao/listar")) {
      return { json: [INTEGRACAO_OUTRA, INTEGRACAO] }
    }
    // Antes do detalhe: o `includes` da linha seguinte tambem casaria com
    // `.../detalhe/estoque-disponibilidade/pedidos` e o modal receberia a
    // disponibilidade em vez dos pedidos.
    if (url.includes("/detalhe/estoque-disponibilidade/pedidos")) {
      return {
        json: {
          total: 1,
          saldo: 1_300,
          valor: 9_230,
          pedidos: [
            {
              pedido: "00006822",
              cliente: "00.175.217/0001-61",
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
              status: "Analise Comercial",
            },
          ],
        },
      }
    }
    if (url.includes("/detalhe/estoque-disponibilidade")) return { json: dados }
    return { status: 404, json: { error: `Rota não mockada: ${url}` } }
  })
}

beforeEach(() => {
  navMock.setPathname("/comercial/disponibilidade")
  fetchMock = rotas()
  vi.stubGlobal("fetch", fetchMock.fn)
})

describe("DisponibilidadeComercialPage", () => {
  it("tem botão de informação explicando a tela campo por campo", async () => {
    renderPage(<DisponibilidadeComercialPage />)

    fireEvent.click(await screen.findByLabelText("Informações da tela"))
    const dialog = await screen.findByRole("dialog")

    // O que a tela é, os dois líquidos e cada filtro precisam estar escritos.
    expect(within(dialog).getAllByText(/dá para prometer/i).length).toBeGreaterThan(0)
    for (const campo of [
      "Produto",
      "Cor",
      "Representante",
      "Só o que falta",
      "Só o que está chegando",
      "Exportar CSV",
    ]) {
      expect(within(dialog).getAllByText(campo).length).toBeGreaterThan(0)
    }
    // E as regras que o usuario não descobre sozinho: de onde vem a previsão e o negativo.
    expect(within(dialog).getAllByText(/módulo de importação/i).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText(/não é erro de cálculo/i).length).toBeGreaterThan(0)
  })

  it("ordena por produto e inverte no segundo clique", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })

    const produtos = () =>
      within(tabela)
        .getAllByRole("button")
        .map((b) => b.textContent?.trim())
        .filter((t) => t?.startsWith("VELUDO") || t?.startsWith("BELGA"))

    // Padrão: maior falta primeiro (a fila de quem precisa de conversa)
    expect(produtos()[0]).toMatch(/^VELUDO/)

    fireEvent.click(within(tabela).getByRole("button", { name: /Produto/ }))
    await waitFor(() => expect(produtos()[0]).toMatch(/^BELGA/))
    expect(within(tabela).getByRole("columnheader", { name: /Produto/ })).toHaveAttribute(
      "aria-sort",
      "ascending"
    )

    fireEvent.click(within(tabela).getByRole("button", { name: /Produto/ }))
    await waitFor(() => expect(produtos()[0]).toMatch(/^VELUDO/))
    expect(within(tabela).getByRole("columnheader", { name: /Produto/ })).toHaveAttribute(
      "aria-sort",
      "descending"
    )
  })

  it("ordena por métrica do maior para o menor", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })

    fireEvent.click(within(tabela).getByRole("button", { name: /Depois da compra/ }))

    // Na montagem a coluna já é "Depois da compra"; ao clicar ordena decrescente
    await waitFor(() =>
      expect(within(tabela).getByRole("columnheader", { name: /Depois da compra/ })).toHaveAttribute(
        "aria-sort",
        "descending"
      )
    )
  })

  it("mostra só o número de pedidos, com o detalhe no hover", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })

    const beige = within(tabela).getByText("11 - BEIGE").closest("tr")!
    // A tabela mostra o número; o detalhe (quem, metros, valor, pedidos) fica no title.
    expect(within(beige).getByText("10")).toBeInTheDocument()
    const celula = within(beige).getByText("10")
    // O `toLocaleString` põe espaço não separável depois do R$; o teste compara em
    // espaço normal para nao depender do detalhe do ICU.
    const detalhe = (celula.getAttribute("title") ?? "").replace(/ /g, " ")
    expect(detalhe).toContain("PROFECTUS")
    expect(detalhe).toContain("10.101 m")
    expect(detalhe).toContain("R$ 71.396,00")
    expect(detalhe).toContain("6 pedidos")
    // O leitor de tela recebe o mesmo conteúdo, em uma linha.
    expect(celula.getAttribute("aria-label")).toContain("10 pedidos")
    expect(celula.getAttribute("aria-label")).toContain("PROFECTUS")
  })

  it("ordena por número de pedidos", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })

    fireEvent.click(within(tabela).getByRole("button", { name: /Pedidos/ }))
    await waitFor(() =>
      expect(within(tabela).getByRole("columnheader", { name: /Pedidos/ })).toHaveAttribute(
        "aria-sort",
        "descending"
      )
    )
  })

  it("mostra os três números e os dois líquidos por produto e cor", async () => {
    renderPage(<DisponibilidadeComercialPage />)

    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })
    const beige = within(tabela).getByText("11 - BEIGE").closest("tr")!
    // 91 m em estoque contra 20.099 m prometidos, com 10.640 m chegando
    expect(beige.textContent).toContain("91 m")
    expect(beige.textContent).toContain("20.099 m")
    expect(beige.textContent).toContain("chega 09/11/2026")
    // Livre negativo: a carteira pediu mais do que existe
    expect(beige.textContent).toContain("-20.008 m")
    // Depois da compra continua negativo: nenhuma compra cobre o que falta
    expect(beige.textContent).toContain("-9.368 m")
  })

  it("mostra a coluna que a compra resolve", async () => {
    // 5.923 de estoque, 16.600 prometidos (falta 10.677) e 30.207 chegando:
    // depois da compra sobra 19.530 m.
    renderPage(<DisponibilidadeComercialPage />)

    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })
    const natural = within(tabela).getByText("56 - NATURAL").closest("tr")!
    expect(natural.textContent).toContain("-10.677 m")
    expect(natural.textContent).toContain("19.530 m")
  })

  it("não repete a falta em duas colunas", async () => {
    // Antes a tela mostrava "Livre -20.008" e "Falta −20.008": o mesmo número duas
    // vezes, o que parecia defeito. Agora a segunda coluna e a cobertura.
    renderPage(<DisponibilidadeComercialPage />)

    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })
    // o cabeçalho e a legenda citam os dois rótulos
    expect(within(tabela).getAllByText(/Depois da compra/).length).toBeGreaterThan(0)
    expect(within(tabela).queryByText(/^Falta$/)).toBeNull()
  })

  it("abre os pedidos clicando no número da coluna Pedidos", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })

    // O número é o botão: era um <span>, e clicar não fazia nada.
    fireEvent.click(screen.getAllByRole("button", { name: /Ver os \d+ pedidos de/ })[0])

    const dialog = await screen.findByRole("dialog")
    expect(await within(dialog).findByText("00006822")).toBeInTheDocument()
    expect(fetchMock.calls.some((c) => c.url.includes("/estoque-disponibilidade/pedidos"))).toBe(
      true
    )
  })

it("abre a linha e mostra quem prometeu", async () => {
    renderPage(<DisponibilidadeComercialPage />)

    const tabela = await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })
    // A linha da cor BEIGE. O botao de expandir fica na primeira celula (o produto) —
    // o da coluna Pedidos tambem cita o produto no aria-label, entao a busca e pela
    // celula, nao pelo nome.
    const linhaBeige = within(tabela).getByText("11 - BEIGE").closest("tr")!
    const celulaProduto = linhaBeige.querySelector("td")!
    fireEvent.click(within(celulaProduto).getByRole("button"))

    expect(await screen.findByText(/PROFECTUS/)).toBeInTheDocument()
    expect(screen.getByText(/GDUE/)).toBeInTheDocument()
    expect(screen.getByText(/6 pedidos/)).toBeInTheDocument()
  })

  it("escolhe a integração de disponibilidade, não as outras da tela", async () => {
    renderPage(<DisponibilidadeComercialPage />)

    await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })
    const consulta = fetchMock.calls.find((c) => c.url.includes("estoque-disponibilidade"))
    expect(consulta?.url).toContain("/api/integracao/11/detalhe/estoque-disponibilidade")
  })

  it("filtra sem acento e sem caixa", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "beige" } })

    await waitFor(() => expect(screen.queryByText("5 - BLACK")).toBeNull())
    expect(screen.getByText("11 - BEIGE")).toBeInTheDocument()
  })

  it("manda os filtros para a API só ao clicar em Aplicar", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })
    const antes = fetchMock.calls.filter((c) => c.url.includes("estoque-disponibilidade")).length

    fireEvent.change(screen.getByLabelText("Produto"), { target: { value: "000014" } })
    fireEvent.click(screen.getByLabelText("Só o que falta"))
    expect(fetchMock.calls.filter((c) => c.url.includes("estoque-disponibilidade")).length).toBe(antes)

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))

    await waitFor(() => {
      const consulta = fetchMock.calls
        .filter((c) => c.url.includes("estoque-disponibilidade"))
        .pop()
      expect(consulta?.url).toContain("produto=000014")
      expect(consulta?.url).toContain("so_com_falta=true")
    })
  })

  it("manda o representante no filtro", async () => {
    renderPage(<DisponibilidadeComercialPage />)
    await screen.findByRole("region", { name: "Disponibilidade por produto e cor" })

    fireEvent.change(screen.getByLabelText("Representante"), { target: { value: "058" } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))

    await waitFor(() => {
      const consulta = fetchMock.calls
        .filter((c) => c.url.includes("estoque-disponibilidade"))
        .pop()
      expect(consulta?.url).toContain("representante=058")
    })
  })

  it("avisa quando a integração não está cadastrada", async () => {
    fetchMock = createFetchMock(({ url }) =>
      url.startsWith("/api/integracao/listar") ? { json: [INTEGRACAO_OUTRA] } : { json: null }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<DisponibilidadeComercialPage />)

    expect(await screen.findByText(/Integração de disponibilidade não encontrada/)).toBeInTheDocument()
  })

  it("mostra o erro da API quando a consulta falha", async () => {
    fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/integracao/listar")) return { json: [INTEGRACAO] }
      return { status: 500, json: { detail: "Falha ao falar com o ERP" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<DisponibilidadeComercialPage />)

    expect(await screen.findByText("Falha ao falar com o ERP")).toBeInTheDocument()
  })
})

describe("filtrarLinhas", () => {
  it("acha por produto, descrição ou cor", () => {
    const linhas = [linha(), linha({ produto: "000020", produto_desc: "VELUDO SILVER", cor: "00002" })]
    expect(filtrarLinhas(linhas, "veludo")).toHaveLength(2)
    expect(filtrarLinhas(linhas, "silver")).toHaveLength(1)
    expect(filtrarLinhas(linhas, "00002")).toHaveLength(1)
    expect(filtrarLinhas(linhas, "")).toHaveLength(2)
    expect(filtrarLinhas(linhas, "inexistente")).toHaveLength(0)
  })
})

describe("ordenarLinhas", () => {
  const base = [
    linha({ produto_desc: "VELUDO CONFORT", cor_desc: "5 - BLACK", falta_metros: 100, estoque_metros: 50 }),
    linha({ produto_desc: "BELGA", cor_desc: "56 - NATURAL", falta_metros: 900, estoque_metros: 10 }),
    linha({ produto_desc: "ÁGUA MARINA", cor_desc: "1 - AZUL", falta_metros: 50, estoque_metros: 90 }),
  ]

  it("ordena texto em pt-BR, sem acento", () => {
    // "ÁGUA" antes de "BELGA" mesmo com acento: é a ordem que o brasileiro lê.
    const nomes = ordenarLinhas(base, "produto", "asc").map((l) => l.produto_desc)
    expect(nomes).toEqual(["ÁGUA MARINA", "BELGA", "VELUDO CONFORT"])
    expect(ordenarLinhas(base, "produto", "desc")[0].produto_desc).toBe("VELUDO CONFORT")
  })

  it("ordena métrica pelo número", () => {
    expect(ordenarLinhas(base, "falta", "desc")[0].falta_metros).toBe(900)
    expect(ordenarLinhas(base, "falta", "asc")[0].falta_metros).toBe(50)
    expect(ordenarLinhas(base, "estoque", "desc")[0].estoque_metros).toBe(90)
  })

  it("usa o código quando não há descrição", () => {
    const semNome = [linha({ produto_desc: "", produto: "000020" }), linha({ produto_desc: "", produto: "000014" })]
    expect(ordenarLinhas(semNome, "produto", "asc").map((l) => l.produto)).toEqual([
      "000014",
      "000020",
    ])
  })

  it("não mexe no array recebido", () => {
    const original = [...base]
    ordenarLinhas(base, "falta", "asc")
    expect(base).toEqual(original)
  })
})

describe("exportarCsvDisponibilidade", () => {
  const criar = vi.fn()
  const revogar = vi.fn()

  beforeEach(() => {
    criar.mockClear()
    revogar.mockClear()
    vi.stubGlobal("URL", { ...URL, createObjectURL: criar, revokeObjectURL: revogar })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("baixa o csv com o nome do dia", () => {
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

    exportarCsvDisponibilidade([linha()], "disponibilidade_2026-10-14")

    expect(clique).toHaveBeenCalled()
    expect(nome).toBe("disponibilidade_2026-10-14.csv")
    expect(revogar).toHaveBeenCalledWith("blob:fake")
  })
})