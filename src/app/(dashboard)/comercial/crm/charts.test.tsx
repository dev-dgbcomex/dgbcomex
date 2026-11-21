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
  forecastQuantidade: 40,
  conversao: {
    oportunidadesConvertidas: 18,
    totalOportunidades: 85,
    valorConvertido: 720000,
  },
  totalPrevisaoConversao: { quantidade: 58, valor: 1200000 },
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

    expect(screen.getAllByRole("heading", { name: "Pipeline (Funil)" }).length).toBeGreaterThan(0)
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
    expect(screen.getByText(/185 leads, 85 oportunidades e 18 convertidas/)).toBeInTheDocument()
  })

  it("explica a fórmula da taxa de conversão no modal da previsão", () => {
    render(<CrmCharts data={data} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Informações da previsão de receita e conversão" })
    )

    expect(screen.getByText("Previsão & Conversão — fórmulas")).toBeInTheDocument()
    expect(screen.getByText(/18 ÷ 85 × 100/)).toBeInTheDocument()
  })

  it("mostra quantidade, valor e total da previsão com conversão", () => {
    const onDetalhe = vi.fn()
    render(<CrmCharts data={data} onDetalhe={onDetalhe} />)

    expect(screen.getByText("40 oportunidade(s) em aberto")).toBeInTheDocument()
    expect(screen.getByText(/480\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/720\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/1\.200\.000,00/)).toBeInTheDocument()
    expect(screen.getByText("58 oportunidade(s) no total")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Previsão de Receita \(Pipeline\)/ }))
    expect(onDetalhe).toHaveBeenCalledWith("previsao-abertas")

    fireEvent.click(screen.getByRole("button", { name: /^Convertidas/ }))
    expect(onDetalhe).toHaveBeenCalledWith("previsao-convertidas")

    fireEvent.click(screen.getAllByRole("button", { name: /Ver todas/ })[1])
    expect(onDetalhe).toHaveBeenCalledWith("previsao-abertas")
  })

  it("abre os detalhes do funil e o detalhe filtrado por status", () => {
    const onDetalhe = vi.fn()
    render(<CrmCharts data={data} onDetalhe={onDetalhe} />)

    expect(screen.getAllByRole("button", { name: /Ver todas/ })).toHaveLength(3)
    fireEvent.click(screen.getAllByRole("button", { name: /Ver todas/ })[0])
    expect(onDetalhe).toHaveBeenCalledWith("funil")

    fireEvent.click(screen.getByRole("button", { name: "NOVO: 40" }))
    expect(onDetalhe).toHaveBeenCalledWith("status", "NOVO")
  })
})
