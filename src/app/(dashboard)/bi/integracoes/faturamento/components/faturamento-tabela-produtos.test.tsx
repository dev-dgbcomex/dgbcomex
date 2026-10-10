// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen, within, fireEvent } from "@testing-library/react"
import { FaturamentoTabelaProdutos } from "./faturamento-tabela-produtos"
import { tabelaPorProduto } from "./utils"
import type { GrupoFaturamento, ItemDetalhe } from "./types"

function item(over: Partial<ItemDetalhe> = {}): ItemDetalhe {
  return {
    empresa: "1",
    pedido: "P1",
    item: 1,
    nr_nota: "1",
    data_nota: "2026-01-10",
    cliente: "C1",
    nome_cliente: "Cliente A",
    cod_produto: "2.K2620.001",
    metros: 10,
    vr_unitario: 10,
    vr_total: 100,
    acres_desc: 0,
    peso: 2,
    vr_nota: 100,
    romaneio: "ROM-1",
    representante_codigo: "7",
    representante: "Ana",
    ...over,
  }
}

function grupo(itens: ItemDetalhe[]): GrupoFaturamento {
  return {
    chave_nf: "1|1",
    empresa: "1",
    nr_nota: "1",
    cliente: "C1",
    nome_cliente: "Cliente A",
    representante: "Ana",
    representante_codigo: "7",
    data_nota: "2026-01-10",
    romaneio: "ROM-1",
    vr_nota: 100,
    itens,
    totalItens: itens.length,
    totalMetros: itens.reduce((s, i) => s + i.metros, 0),
    totalPeso: itens.reduce((s, i) => s + i.peso, 0),
    totalVrTotal: itens.reduce((s, i) => s + i.vr_total, 0),
    totalAcresDesc: itens.reduce((s, i) => s + i.acres_desc, 0),
    faturamento: itens.reduce((s, i) => s + i.vr_total + i.acres_desc, 0),
  }
}

describe("tabela de produtos", () => {
  it("consolida os itens do mesmo produto e calcula os médios", () => {
    const linhas = tabelaPorProduto([
      grupo([
        item({ vr_unitario: 10, vr_total: 100, metros: 10 }),
        item({ item: 2, vr_unitario: 20, vr_total: 200, metros: 10 }),
      ]),
    ])

    expect(linhas).toHaveLength(1)
    const [linha] = linhas
    expect(linha).toMatchObject({
      produto: "2.K2620.001",
      itens: 2,
      metros: 20,
      peso: 4,
      faturamento: 300,
      // média aritmética de 10 e 20
      unitarioMedio: 15,
      // 300 / 20 m
      medioPorMetro: 15,
    })
  })

  it("usa a fórmula do card: vr_total + acres_desc", () => {
    const linhas = tabelaPorProduto([grupo([item({ vr_total: 100, acres_desc: -10 })] )])
    expect(linhas[0].faturamento).toBe(90)
  })

  it("não divide por zero quando o produto não tem metragem", () => {
    const linhas = tabelaPorProduto([grupo([item({ metros: 0, vr_total: 500 })])])
    expect(linhas[0].metros).toBe(0)
    expect(linhas[0].medioPorMetro).toBe(0)
  })

  it("ordena por faturamento e respeita o limite", () => {
    const muitos = Array.from({ length: 6 }, (_, i) =>
      grupo([item({ cod_produto: `P${i}`, vr_total: (i + 1) * 10, vr_unitario: i + 1 })])
    )
    const linhas = tabelaPorProduto(muitos, 3)
    expect(linhas.map((l) => l.produto)).toEqual(["P5", "P4", "P3"])
  })

  it("usa a descrição quando o item trouxer", () => {
    const comDescricao = item({
      cod_produto: "P9",
      ...({ descricao_produto: "TECIDO ALGODÃO CRU" } as Partial<ItemDetalhe>),
    })
    const linhas = tabelaPorProduto([grupo([comDescricao])])
    expect(linhas[0].descricao).toBe("TECIDO ALGODÃO CRU")
  })

  it("mostra a descrição e a unidade vindas do catálogo do ERP", () => {
    const linhas = tabelaPorProduto([
      grupo([
        item({ cod_produto: "000014", descricao_produto: "VELUDO CONFORT", unidade_produto: "MT" }),
        item({ item: 2, cod_produto: "000014", descricao_produto: "VELUDO CONFORT", unidade_produto: "MT" }),
      ]),
    ])
    expect(linhas[0]).toMatchObject({
      produto: "000014",
      descricao: "VELUDO CONFORT",
      unidade: "MT",
    })
  })

it("produto fora do catálogo continua aparecendo, só sem descrição", () => {
    const linhas = tabelaPorProduto([
      grupo([item({ cod_produto: "999999", descricao_produto: "", unidade_produto: "" })]),
    ])
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({ produto: "999999", descricao: "", unidade: "" })
    expect(linhas[0].faturamento).toBe(100)
  })

it("renderiza a descrição e a unidade na linha do produto", () => {
    render(
      <FaturamentoTabelaProdutos
        grupos={[
          grupo([
            item({
              cod_produto: "000014",
              descricao_produto: "VELUDO CONFORT",
              unidade_produto: "MT",
            }),
          ]),
        ]}
      />
    )

    expect(screen.getByText("VELUDO CONFORT")).toBeTruthy()
    expect(screen.getByText("MT")).toBeTruthy()
  })

it("tem botão de informação explicando os campos e os cálculos", async () => {
    render(
      <FaturamentoTabelaProdutos
        grupos={[grupo([item({ cod_produto: "000014", descricao_produto: "VELUDO CONFORT" })])]}
      />
    )

    // Botão de informação no cabeçalho da tabela.
    fireEvent.click(screen.getByLabelText("Informações da tela"))

    const dialog = await screen.findByRole("dialog")
    // Cada coluna da tabela é explicada.
    for (const campo of [
      "Produto",
      "Itens",
      "Metragem",
      "Peso",
      "Vlr. unitário médio",
      "Vlr. médio (R$/m)",
      "Faturamento",
    ]) {
      expect(within(dialog).getAllByText(campo).length).toBeGreaterThan(0)
    }

    // Os dois cálculos pedidos explicitamente estão escritos por extenso.
    expect(
      within(dialog).getByText(/soma dos valores unitários dividida pela quantidade de itens/i)
    ).toBeTruthy()
    expect(within(dialog).getByText(/faturamento total do produto dividido pela metragem/i)).toBeTruthy()
  })

it("explica que a fórmula do faturamento é a mesma do card", async () => {
    render(
      <FaturamentoTabelaProdutos
        grupos={[grupo([item({ cod_produto: "000014", descricao_produto: "VELUDO CONFORT" })])]}
      />
    )

    fireEvent.click(screen.getByLabelText("Informações da tela"))
    const dialog = await screen.findByRole("dialog")
    // Aparece nas regras de negócio e na descrição do campo Faturamento.
    expect(within(dialog).getAllByText(/Vr_Total \+ Acres_Desc/).length).toBeGreaterThan(0)
  })

it("renderiza a tabela com barra proporcional ao faturamento", () => {
    const { container } = render(
      <FaturamentoTabelaProdutos
        grupos={[
          grupo([item({ cod_produto: "P-GRAND", vr_total: 1000, metros: 100, vr_unitario: 10 })]),
          grupo([item({ cod_produto: "P-PEQUENO", vr_total: 100, metros: 10, vr_unitario: 10 })]),
        ]}
      />
    )

    expect(screen.getByRole("heading", { name: "Produtos faturados" })).toBeTruthy()

    const linhas = within(screen.getByRole("table")).getAllByRole("row").slice(1)
    expect(linhas).toHaveLength(2)

    // A primeira linha é a de maior faturamento, e a barra dela ocupa 100%.
    const barras = container.querySelectorAll("span[style*='width']")
    expect(barras).toHaveLength(2)
    expect((barras[0] as HTMLElement).style.width).toBe("100%")
    // A segunda é proporcional: 100/1000 = 10%.
    expect((barras[1] as HTMLElement).style.width).toBe("10%")

    // Vlr. médio por metro aparece formatado; e "—" quando não há metragem.
    expect(screen.getAllByText("R$ 10,00").length).toBeGreaterThan(0)
  })

  it("não renderiza nada quando não há produtos", () => {
    const { container } = render(<FaturamentoTabelaProdutos grupos={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})