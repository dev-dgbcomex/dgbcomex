// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { ReactNode } from "react"
import { CrmCharts } from "./charts"

vi.mock("recharts", () => {
  const stub = (nome: string) => {
    function Stub({ children }: { children?: ReactNode }) {
      return <div data-testid={nome}>{children}</div>
    }
    Stub.displayName = nome
    return Stub
  }
  return {
    LineChart: stub("line-chart"),
    Line: stub("line"),
    BarChart: stub("bar-chart"),
    Bar: stub("bar"),
    PieChart: stub("pie-chart"),
    Pie: stub("pie"),
    Cell: stub("cell"),
    XAxis: stub("x-axis"),
    YAxis: stub("y-axis"),
    CartesianGrid: stub("grid"),
    Tooltip: stub("tooltip"),
    ResponsiveContainer: stub("responsive-container"),
  }
})

vi.mock("@/components/ui/animated-line", () => ({
  AnimatedLine: function AnimatedLineStub({ name }: { name?: string }) {
    return <div data-testid="animated-line">{name}</div>
  },
}))

const data = {
  visitantes: { total: 240, esteMes: 30 },
  leads: { total: 185 },
  clientes: { total: 12 },
  oportunidades: {
    total: 85,
    esteMes: 9,
    byStatus: [
      { status: "NOVO", total: 40 },
      { status: "QUALIFICADO", total: 25 },
    ],
  },
  propostas: { total: 32, byStatus: [] },
  visitas: { total: 1, hoje: 1 },
  tarefas: { pendentes: 8, vencendo: 3 },
  topEmpresas: [],
  forecast: 480000,
  conversao: { oportunidadesConvertidas: 18, totalOportunidades: 85 },
  recentes: [],
  previsaoVendas: [
    { periodo: "2026-10", valorPrevisto: 450000, valorReal: 460000, dados: null },
    { periodo: "2026-11", valorPrevisto: 480000, valorReal: null, dados: null },
  ],
  campanhas: { total: 4, ativas: 2, orcamentoTotal: 10000 },
  emailMassa: { enviados: 120, lidos: 60, clicados: 12 },
}

describe("CrmCharts", () => {
  it("exibe o botão de informações nos três gráficos", () => {
    render(<CrmCharts data={data} />)

    expect(screen.getByRole("heading", { name: "Pipeline (Funil)" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Previsão & Conversão" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Oportunidades por Status" })).toBeInTheDocument()

    expect(
      screen.getByRole("button", { name: "Informações do gráfico Pipeline (Funil)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Informações da previsão de receita e conversão" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Informações do gráfico Oportunidades por Status" })
    ).toBeInTheDocument()
  })

  it("abre o modal com a origem e o cálculo do gráfico clicado", () => {
    render(<CrmCharts data={data} />)

    fireEvent.click(screen.getByRole("button", { name: "Informações do gráfico Pipeline (Funil)" }))

    expect(screen.getByText("Pipeline (Funil) — composição das barras")).toBeInTheDocument()
    expect(screen.getByText(/240 visitantes, 85 oportunidades, 32 propostas/)).toBeInTheDocument()
  })

  it("explica a fórmula da taxa de conversão no modal da previsão", () => {
    render(<CrmCharts data={data} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Informações da previsão de receita e conversão" })
    )

    expect(screen.getByText("Previsão & Conversão — fórmulas")).toBeInTheDocument()
    expect(screen.getByText(/18 ÷ 85 × 100/)).toBeInTheDocument()
  })
})
