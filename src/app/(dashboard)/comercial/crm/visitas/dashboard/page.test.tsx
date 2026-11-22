// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, routeJson } from "@/test/harness"
import VisitasDashboardPage from "./page"

vi.setConfig({ testTimeout: 30000 })

const { exportCSV, exportMarkdown, exportPDFRelatorio } = vi.hoisted(() => ({
  exportCSV: vi.fn(),
  exportMarkdown: vi.fn(),
  exportPDFRelatorio: vi.fn(),
}))

vi.mock("@/lib/export-utils", () => ({ exportCSV, exportMarkdown, exportPDFRelatorio }))

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Admin", role: "ADMIN" } }, status: "authenticated" }),
}))

vi.mock("./charts", () => ({
  VisitasCharts: () => <div data-testid="graficos" />,
}))

const viagemCronograma = {
  viagem: {
    id: 1,
    titulo: "Viagem Goiania - Ernandes",
    descricao: null,
    destinoCidade: "Goiânia",
    destinoUf: "GO",
    dataInicio: "2026-08-10",
    dataFim: "2026-08-12",
    status: "REALIZADA",
  },
  visitas: [
    {
      id: 11,
      nome: "Tecelagem Alpha",
      empresaId: 1,
      clienteId: null,
      dataVisita: "2026-08-10",
      hora: "09:00",
      tipo: "PRESENCIAL",
      status: "REALIZADA",
      enderecoTexto: "Av. X, 100 - Centro, Goiânia - GO",
      checkInTime: "2026-08-10T12:00:00Z",
      checkOutTime: null,
      latitude: -23.55,
      longitude: -46.63,
      localizacaoFonte: "checkin",
      km: 0,
    },
    {
      id: 12,
      nome: "Cliente Beta",
      empresaId: null,
      clienteId: 5,
      dataVisita: "2026-08-10",
      hora: "11:00",
      tipo: "PRESENCIAL",
      status: "REALIZADA",
      enderecoTexto: "Av. Y - Rio de Janeiro - RJ",
      checkInTime: null,
      checkOutTime: null,
      latitude: -22.9,
      longitude: -43.17,
      localizacaoFonte: "endereco",
      km: 357.8,
    },
  ],
  resumo: {
    total: 2,
    realizadas: 2,
    canceladas: 0,
    agendadas: 0,
    comLocalizacao: 2,
    comEndereco: 1,
    geocodificadas: 0,
    kmTotal: 357.8,
    kmSemLocalizacao: 0,
  },
}

function dashboardPayload(withViagem = true, overrides: Record<string, number> = {}) {
  return {
    total: 37,
    realizadas: 37,
    canceladas: 0,
    agendadas: 0,
    hoje: 5,
    esteMes: 37,
    byTipo: [],
    byStatus: [],
    porDia: [],
    porGerente: [],
    viagens: withViagem
      ? [
          {
            viagemId: 1,
            viagemTitulo: "Viagem Goiania - Ernandes",
            total: 37,
            realizadas: 35,
            dataInicio: "2026-08-10",
            dataFim: "2026-08-20",
            totalInvestimento: 5200,
            possivelRetorno: 125000,
            retornoReal: 35000,
            vendas: 20000,
            ...overrides,
          },
        ]
      : [],
    ultimasVisitas: [],
    pesquisas: { enviadas: 0, abertas: 0, respondidas: 0 },
  }
}

function mockRoutes(rotas: Record<string, unknown> = {}) {
  return createFetchMock(routeJson(rotas))
}

describe("VisitasDashboardPage", () => {
  it("renderiza o heading e as seções", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(false),
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)
    expect(screen.getByRole("heading", { name: "Dashboard de Visitas" })).toBeInTheDocument()
    expect(await screen.findByText("Ações Rápidas")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Saúde da Prospecção/ })).toHaveAttribute(
      "href",
      "/comercial/crm/leads/dashboard"
    )
    expect(screen.getByText("Performance por Gerente Comercial")).toBeInTheDocument()
    expect(screen.getByText("Viagens")).toBeInTheDocument()
    expect(screen.getByText("Últimas Visitas")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exportar últimas visitas em CSV" })).toHaveAttribute(
      "disabled",
      ""
    )
    expect(screen.getByTestId("graficos")).toBeInTheDocument()
  })

  it("marca a aba ativa do filtro com aria-pressed", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(),
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)

    await screen.findByText("Ações Rápidas")
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Minhas Visitas/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("renderiza viagens e performance por gerente comercial com KPIs", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": {
        total: 37,
        realizadas: 37,
        canceladas: 0,
        agendadas: 0,
        hoje: 5,
        esteMes: 37,
        byTipo: [],
        byStatus: [],
        porDia: [{ dia: "2026-08-10", total: 5 }],
        porGerente: [
          {
            gerenteId: 8,
            gerenteNome: "Ernandes Rodrigues",
            visitas: 37,
            diasAtivos: 12,
            mediaPorDia: 3.1,
            melhorDia: { dia: "2026-08-20", total: 7 },
            piorDia: { dia: "2026-08-11", total: 1 },
          },
        ],
        viagens: [
          {
            viagemId: 1,
            viagemTitulo: "Viagem Goiania - Ernandes",
            total: 37,
            realizadas: 35,
            dataInicio: "2026-08-10",
            dataFim: "2026-08-20",
            totalInvestimento: 0,
            possivelRetorno: 0,
            retornoReal: 0,
            vendas: 0,
          },
          {
            viagemId: null,
            viagemTitulo: "Sem viagem",
            total: 0,
            realizadas: 0,
            dataInicio: null,
            dataFim: null,
            totalInvestimento: 0,
            possivelRetorno: 0,
            retornoReal: 0,
            vendas: 0,
          },
        ],
        ultimasVisitas: [],
        pesquisas: { enviadas: 0, abertas: 0, respondidas: 0 },
      },
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)

    expect(await screen.findByText("Ernandes Rodrigues")).toBeInTheDocument()
    expect(screen.getByText("Média/dia")).toBeInTheDocument()
    expect(screen.getByText("3.1")).toBeInTheDocument()
    expect(screen.getByText("Melhor dia")).toBeInTheDocument()
    expect(screen.getByText(/Pior dia/)).toBeInTheDocument()
    expect(screen.getByText("Viagem Goiania - Ernandes")).toBeInTheDocument()
    expect(screen.getAllByText(/37 visitas/).length).toBeGreaterThan(0)
  })

  it("mostra investimento realizado, possível retorno e retorno real no card da viagem", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(),
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)

    expect(await screen.findByText("Investimento")).toBeInTheDocument()
    expect(screen.getByText("R$ 5.200,00")).toBeInTheDocument()
    expect(screen.getByText("Possível retorno")).toBeInTheDocument()
    expect(screen.getAllByText("R$ 125.000,00").length).toBeGreaterThan(0)
    expect(screen.getByText("Retorno real")).toBeInTheDocument()
    expect(screen.getByText("R$ 35.000,00")).toBeInTheDocument()
  })

  it("mostra '—' no card da viagem quando não há vendas nem retorno real", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(true, {
        retornoReal: 0,
        vendas: 0,
      }),
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)

    expect((await screen.findAllByText("R$ 125.000,00")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("mostra resumo da viagem (período e realizadas) no card", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(),
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)

    expect(await screen.findByText(/10\/08 a 20\/08/)).toBeInTheDocument()
    expect(screen.getByText(/35 realizada/)).toBeInTheDocument()
  })

  it("abre o cronograma da viagem com mapa, resumo e linha do tempo", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(),
      "GET /api/crm/visitas/dashboard/viagem?viagemId=1": viagemCronograma,
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<VisitasDashboardPage />)

    fireEvent.click(await screen.findByRole("button", { name: /Viagem Goiania - Ernandes/ }))

    const dialog = await screen.findByRole("dialog", { name: "Cronograma da Viagem" })
    expect(await within(dialog).findByText(/Goiânia - GO · 10\/08/)).toBeInTheDocument()
    expect(within(dialog).getByText("Km total")).toBeInTheDocument()
    expect(within(dialog).getByText("357.8 km")).toBeInTheDocument()
    expect(within(dialog).getByText("Realizadas")).toBeInTheDocument()
    expect(within(dialog).getByText("Linha do tempo")).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByTestId("mapa-roteiro")).toBeInTheDocument())
    expect(within(dialog).getByTestId("mapa-busca")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("textbox", { name: "Buscar local no mapa" })
    ).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: "Tecelagem Alpha" })).toHaveAttribute(
      "href",
      "/comercial/crm/visitas/11"
    )
    expect(within(dialog).getByText(/\+357\.8/)).toBeInTheDocument()
    expect(within(dialog).getByText("Estimada pelo endereço")).toBeInTheDocument()
    expect(within(dialog).getByText(/Localização de 1 visita/)).toBeInTheDocument()
  })

  it("fecha o cronograma ao clicar no botão Fechar", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(),
      "GET /api/crm/visitas/dashboard/viagem?viagemId=1": viagemCronograma,
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<VisitasDashboardPage />)
    fireEvent.click(await screen.findByRole("button", { name: /Viagem Goiania - Ernandes/ }))

    const dialog = await screen.findByRole("dialog", { name: "Cronograma da Viagem" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Cronograma da Viagem" })).not.toBeInTheDocument()
    )
  })

  it("recarrega o recorte ao alternar para Minhas visitas", async () => {
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": dashboardPayload(false),
      "GET /api/crm/visitas/dashboard?mine=true": dashboardPayload(false),
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)

    await screen.findByText("Ações Rápidas")
    fireEvent.click(screen.getByRole("button", { name: /Minhas Visitas/ }))

    await waitFor(() =>
      expect(findCall(fetchMock.calls, "/api/crm/visitas/dashboard?mine=true")).toBeDefined()
    )
    expect(findCall(fetchMock.calls, "/api/crm/visitas/dashboard/clientes")).toBeUndefined()
    expect(screen.getByRole("button", { name: /Minhas Visitas/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("exporta últimas visitas em CSV, PDF e Markdown", async () => {
    const payload = {
      ...dashboardPayload(false),
      ultimasVisitas: [
        {
          id: 77,
          empresaId: 7,
          clienteId: null,
          nome: "Acme Ltda",
          documento: "12345678000195",
          tipoEntidade: "cliente",
          oportunidadeId: 10,
          totalOportunidades: 2,
          temOportunidade: true,
          dataVisita: "2026-08-10",
          hora: "09:00",
          tipo: "PRESENCIAL",
          status: "REALIZADA",
          endereco: "Rua A",
          numero: "100",
          complemento: null,
          bairro: "Centro",
          cidade: "Goiânia",
          uf: "GO",
        },
      ],
    }
    const fetchMock = mockRoutes({
      "GET /api/crm/visitas/dashboard": payload,
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<VisitasDashboardPage />)

    expect(await screen.findByText("Acme Ltda")).toBeInTheDocument()
    expect(screen.getByText("Cliente")).toBeInTheDocument()
    expect(screen.getByText("12.345.678/0001-95")).toBeInTheDocument()
    expect(screen.getByText("Com oportunidade (2)")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Exportar últimas visitas em CSV" }))
    fireEvent.click(screen.getByRole("button", { name: "Exportar últimas visitas em PDF" }))
    fireEvent.click(screen.getByRole("button", { name: "Exportar últimas visitas em Markdown" }))

    expect(exportCSV).toHaveBeenCalledWith(
      "ultimas-visitas-dashboard",
      [
        "ID da visita",
        "Nome",
        "Tipo de entidade",
        "Documento",
        "Data",
        "Hora",
        "Tipo",
        "Status",
        "Oportunidades",
        "Empresa ID",
        "Cliente ID",
        "Endereço",
      ],
      [
        [
          77,
          "Acme Ltda",
          "Cliente",
          "12.345.678/0001-95",
          "10/08/2026",
          "09:00",
          "Presencial",
          "Realizada",
          "Com oportunidade (2)",
          7,
          "—",
          "Rua A, 100, Centro, Goiânia, GO",
        ],
      ]
    )
    expect(exportPDFRelatorio).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Últimas visitas — dashboard de visitas e prospecção",
        filename: "ultimas-visitas-dashboard",
        orientation: "landscape",
        stats: expect.objectContaining({ Visitas: 1, Realizadas: 1 }),
      })
    )
    expect(exportMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "ultimas-visitas-dashboard",
        title: "Últimas visitas — dashboard de visitas e prospecção",
      })
    )
  })
})
