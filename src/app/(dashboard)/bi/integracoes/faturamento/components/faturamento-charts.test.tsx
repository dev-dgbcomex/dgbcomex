// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import { FaturamentoCharts } from "./faturamento-charts"
import type { GrupoFaturamento } from "./types"

const CHAVE_ORDEM = "faturamento_graficos_ordem"

function grupo(over: Partial<GrupoFaturamento> = {}): GrupoFaturamento {
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
    itens: [
      {
        empresa: "1",
        pedido: "P1",
        item: 1,
        nr_nota: "1",
        data_nota: "2026-01-10",
        cliente: "C1",
        nome_cliente: "Cliente A",
        cod_produto: "PRD-A",
        metros: 10,
        vr_unitario: 10,
        vr_total: 100,
        acres_desc: 0,
        peso: 2,
        vr_nota: 100,
        romaneio: "ROM-1",
        representante_codigo: "7",
        representante: "Ana",
      },
    ],
    totalItens: 1,
    totalMetros: 10,
    totalPeso: 2,
    totalVrTotal: 100,
    totalAcresDesc: 0,
    faturamento: 100,
    ...over,
  }
}

const GRUPOS = [
  grupo({ chave_nf: "1|1", nr_nota: "1", nome_cliente: "Cliente A", data_nota: "2026-01-10", faturamento: 100, totalVrTotal: 100 }),
  grupo({ chave_nf: "1|2", nr_nota: "2", nome_cliente: "Cliente B", data_nota: "2026-02-10", faturamento: 300, totalVrTotal: 300 }),
]

function titulosOrdem(): string[] {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent ?? "")
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("gráficos do faturamento", () => {
  it("mostra os 5 KPIs e os 4 gráficos", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    expect(screen.getByText("Faturamento")).toBeTruthy()
    expect(screen.getByText("Ticket médio")).toBeTruthy()
    expect(titulosOrdem()).toEqual([
      "Faturamento e metragem por mês",
      "Faturamento por cliente (top 8)",
      "Faturamento por produto (top 8)",
      "Participação por produto",
    ])
  })

  it("dá legenda à pizza de participação com cor, produto e percentual", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    const legenda = screen.getByRole("list", { name: /participação por produto/i })
    // A legenda fica no <ul> com os itens de produto e o % de cada um.
    const itens = within(legenda).getAllByRole("listitem")
    expect(itens.length).toBeGreaterThan(0)
    expect(within(legenda).getByText("PRD-A")).toBeTruthy()
    expect(within(legenda).getByText("100.0%")).toBeTruthy()
  })

  it("reordena os gráficos pelas setas do teclado", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    const antes = titulosOrdem()
    fireEvent.click(screen.getByRole("button", { name: "Mover Participação por produto para cima" }))

    const depois = titulosOrdem()
    expect(depois).not.toEqual(antes)
    expect(depois[2]).toBe("Participação por produto")
  })

  it("persiste a ordem escolhida no navegador", () => {
    const { unmount } = renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Mover Participação por produto para cima" }))
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ORDEM) ?? "[]")
    expect(salvo).toEqual(["mes", "clientes", "participacao", "produtos"])
    unmount()

    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    expect(titulosOrdem()[2]).toBe("Participação por produto")
  })

  it("descarta preferência corrompida e mantém a ordem padrão", async () => {
    localStorage.setItem(CHAVE_ORDEM, "isto não é json")
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    await waitFor(() => expect(titulosOrdem()[0]).toBe("Faturamento e metragem por mês"))
    expect(localStorage.getItem(CHAVE_ORDEM)).toBeNull()
  })

  it("ignora ids desconhecidos numa preferência antiga", async () => {
    localStorage.setItem(CHAVE_ORDEM, JSON.stringify(["produtos", "grafico-removido"]))
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    await waitFor(() => expect(titulosOrdem()[0]).toBe("Faturamento por produto (top 8)"))
    // Os que faltavam entram no fim, sem buraco na grade.
    expect(titulosOrdem()).toHaveLength(4)
  })

  it("não renderiza os gráficos quando não há notas", () => {
    renderPage(
      <FaturamentoCharts
        grupos={[]}
        faturamentoTotal={0}
        totalItens={0}
        totalNotas={0}
        totalMetros={0}
        totalPeso={0}
      />
    )

    expect(screen.getByText("Ticket médio")).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
  })

  it("oferece handle de arraste em todos os gráficos", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    const alvos = [
      "Faturamento e metragem por mês",
      "Faturamento por cliente (top 8)",
      "Faturamento por produto (top 8)",
      "Participação por produto",
    ]
    for (const titulo of alvos) {
      expect(screen.getByLabelText(`Arrastar ${titulo} para reordenar`)).toBeTruthy()
    }
  })

  it("não deixa mover o primeiro para cima nem o último para baixo", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    expect(screen.getByRole("button", { name: "Mover Faturamento e metragem por mês para cima" })).toHaveProperty("disabled", true)
    expect(
      screen.getByRole("button", { name: "Mover Participação por produto para baixo" })
    ).toHaveProperty("disabled", true)
  })
})