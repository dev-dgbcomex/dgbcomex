// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, routeJson } from "@/test/harness"
import CrmDashboardPage from "./page"

vi.setConfig({ testTimeout: 30000 })

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Admin", role: "ADMIN" } }, status: "authenticated" }),
}))

const dashboardPayload = {
  temperatura: {
    contagem: { QUENTE: 0, MORNO: 1, FRIO: 0 },
    itens: [
      {
        id: "cliente-17",
        tipo: "cliente",
        entidadeId: 17,
        nome: "Conforto Prime",
        documento: "12.345.678/0001-90",
        faixaConversao: "MORNO",
        totalOportunidades: 5,
        totalOportunidadesProposta: 1,
        totalOportunidadesNegociacao: 0,
        totalPedidos: 1,
        totalVisitas: 0,
        totalAcoes: 0,
        href: "/comercial/clientes/17",
      },
    ],
  },
  visitantes: { total: 0, esteMes: 0 },
  leads: { total: 185 },
  clientes: { total: 12 },
  oportunidades: { total: 0, esteMes: 0, byStatus: [] },
  propostas: { total: 0, byStatus: [] },
  visitas: { total: 1, hoje: 0 },
  acoesProspeccao: { realizadas: 30, hoje: 4, esteMes: 22 },
  tarefas: { pendentes: 0, vencendo: 0 },
  topEmpresas: [
    {
      empresaId: 7,
      empresaNome: "Tecelagem Y",
      totalValor: 120000,
    },
  ],
  topClientes: [
    {
      clienteId: 17,
      clienteNome: "Conforto Prime",
      totalValor: 150000,
      totalOportunidades: 5,
      oportunidadesConvertidas: 2,
      valorAberto: 70000,
    },
  ],
  forecast: 480000,
  forecastQuantidade: 40,
  conversao: {
    oportunidadesConvertidas: 18,
    totalOportunidades: 85,
    valorConvertido: 720000,
  },
  totalPrevisaoConversao: { quantidade: 58, valor: 1200000 },
  recentes: [
    {
      id: 214,
      tipo: "ACAO_PROSPECCAO",
      descricao: "Ação de prospecção TELEFONE agendada para 19/11/2026",
      dataEvento: "2026-11-19T11:45:00.000Z",
      href: "/comercial/crm/acoes-prospeccao/87",
    },
  ],
  previsaoVendas: [],
  campanhas: { total: 0, ativas: 0, orcamentoTotal: 0 },
  emailMassa: { enviados: 0, lidos: 0, clicados: 0 },
}

const detalhePayload = {
  bloco: "leads",
  titulo: "Leads (Negócios)",
  listagem: "/comercial/crm/leads",
  itens: [
    {
      id: 7,
      titulo: "Tecelagem Y",
      subtitulo: "12.345.678/0001-90",
      status: "NOVO",
      href: "/comercial/crm/leads/7",
    },
  ],
}

const detalheAcoesPayload = {
  bloco: "acoes-realizadas",
  titulo: "Ações de prospecção realizadas",
  listagem: "/comercial/crm/acoes-prospeccao",
  itens: [
    {
      id: 3,
      titulo: "Visita à Tecelagem Y",
      subtitulo: "PRESENCIAL",
      status: "REALIZADA",
      data: "2026-11-21T12:00:00.000Z",
      href: "/comercial/crm/acoes-prospeccao/3",
    },
  ],
}

const detalheTopClientesPayload = {
  bloco: "top-clientes",
  titulo: "Top Clientes (por oportunidades)",
  listagem: "/comercial/clientes",
  itens: [
    {
      id: 17,
      titulo: "Conforto Prime",
      subtitulo: "2 convertidas de 5 oportunidades",
      valor: 150000,
      href: "/comercial/clientes/17",
    },
  ],
}

function setup() {
  const fetchMock = createFetchMock(
    routeJson({
      "GET /api/crm/dashboard": dashboardPayload,
      "GET /api/crm/dashboard/detalhes?bloco=leads": detalhePayload,
      "GET /api/crm/dashboard/detalhes?bloco=acoes-realizadas": detalheAcoesPayload,
      "GET /api/crm/dashboard/detalhes?bloco=top-clientes": detalheTopClientesPayload,
    })
  )
  vi.stubGlobal("fetch", fetchMock.fn)
  renderPage(<CrmDashboardPage />)
  return fetchMock
}

describe("CrmDashboardPage", () => {
  it("renderiza o heading e apenas os seis cards de resumo restantes", async () => {
    setup()
    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument()

    for (const label of [
      "Leads (Negócios)",
      "Clientes",
      "Oportunidades",
      "Visitas",
      "Ações de Prospecção",
      "Tarefas Pendentes",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }

    for (const label of ["Visitantes", "Propostas", "Campanhas", "Emails Enviados"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }

    expect(
      await screen.findByRole("heading", { name: "Temperatura — leads e clientes" })
    ).toBeInTheDocument()
    expect(screen.getByText("Mornos")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Informações da faixa Mornos" })
    ).toBeInTheDocument()
  })

  it("oferece atalho para Saúde da Prospecção", () => {
    setup()

    expect(screen.getByRole("link", { name: "Saúde da Prospecção" })).toHaveAttribute(
      "href",
      "/comercial/crm/saude-prospeccao"
    )
  })

  it("mostra o painel Top Leads somente com leads", async () => {
    setup()

    const titulo = await screen.findByRole("heading", { name: "Top Leads (Negócios)" })
    const painel = titulo.parentElement?.parentElement
    expect(painel).not.toBeNull()
    const lead = within(painel!).getByRole("link", { name: /Tecelagem Y/ })
    expect(lead).toHaveAttribute("href", "/comercial/crm/leads/7")
    expect(within(painel!).queryByText("Conforto Prime")).not.toBeInTheDocument()
  })

  it("mostra o texto do card e abre o modal de detalhes ao clicar", async () => {
    const fetchMock = setup()

    const label = await screen.findByText("Leads (Negócios)")
    expect(label).toHaveClass("truncate")

    const card = screen.getByTitle("Leads (Negócios)")
    expect(card).toHaveAttribute("role", "button")
    expect(card).toHaveClass("overflow-hidden")

    fireEvent.click(card)

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Leads (Negócios)" })).toBeInTheDocument()
    )
    expect((await screen.findAllByText("Tecelagem Y")).length).toBeGreaterThan(1)
    expect(
      findCall(fetchMock.calls, "/api/crm/dashboard/detalhes?bloco=leads", "GET")
    ).toBeDefined()
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute(
      "href",
      "/comercial/crm/leads"
    )
  })

  it("mostra as ações realizadas no card e abre o detalhe do bloco", async () => {
    const fetchMock = setup()

    expect(await screen.findByText("4 hoje · 22 no mês")).toBeInTheDocument()
    expect(screen.getByText("30")).toBeInTheDocument()

    fireEvent.click(screen.getByTitle("Ações de Prospecção"))

    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, "/api/crm/dashboard/detalhes?bloco=acoes-realizadas", "GET")
      ).toBeDefined()
    )
    expect(await screen.findByText("Visita à Tecelagem Y")).toBeInTheDocument()
    expect(screen.getByText("REALIZADA")).toBeInTheDocument()
  })

  it("mostra o painel Top Clientes com valor, conversão e linha clicável", async () => {
    setup()

    expect(await screen.findByRole("heading", { name: "Top Clientes" })).toBeInTheDocument()
    const linha = await screen.findByRole("link", { name: /Conforto Prime/ })
    expect(linha).toHaveAttribute("href", "/comercial/clientes/17")
    expect(within(linha).getByText("2 convertidas de 5")).toBeInTheDocument()
    expect(within(linha).getByText(/150\.000,00/)).toBeInTheDocument()
  })

  it("abre o modal de detalhes do Top Clientes", async () => {
    const fetchMock = setup()

    const titulo = await screen.findByRole("heading", { name: "Top Clientes" })
    const cabecalho = titulo.parentElement
    expect(cabecalho).not.toBeNull()
    fireEvent.click(within(cabecalho!).getByRole("button", { name: /Ver todas/ }))

    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, "/api/crm/dashboard/detalhes?bloco=top-clientes", "GET")
      ).toBeDefined()
    )
    expect(await screen.findByText("2 convertidas de 5 oportunidades")).toBeInTheDocument()
    expect(
      screen
        .getAllByRole("link", { name: /Conforto Prime/ })
        .some((link) => link.getAttribute("href") === "/comercial/clientes/17")
    ).toBe(true)
  })

  it("abre a ação recente pelo ID da ação, não pelo ID do evento da timeline", async () => {
    setup()

    const link = await screen.findByRole("link", { name: /Ação de prospecção TELEFONE/ })
    expect(link).toHaveAttribute("href", "/comercial/crm/acoes-prospeccao/87")
  })

  it("exibe as faixas compactas de ações rápidas no topo e em baixo com os seis atalhos", async () => {
    setup()

    await waitFor(() =>
      expect(screen.getAllByRole("heading", { name: "Ações Rápidas" })).toHaveLength(2)
    )
    const [barraTopo, barraBaixo] = screen.getAllByRole("heading", {
      name: "Ações Rápidas",
    })

    for (const label of [
      "Novo Lead (Negócio)",
      "Nova Oportunidade",
      "Nova Ação de Prospecção",
      "Kanban de Temperatura",
      "Nova Visita",
      "Minhas Tarefas",
    ]) {
      expect(screen.getAllByText(label)).toHaveLength(2)
    }

    const acoesNova = screen.getAllByRole("link", { name: "Nova Ação de Prospecção" })
    expect(acoesNova).toHaveLength(2)
    for (const link of acoesNova) {
      expect(link).toHaveAttribute("href", "/comercial/crm/acoes-prospeccao/novo")
    }

    const kanbans = screen.getAllByRole("link", { name: "Kanban de Temperatura" })
    expect(kanbans).toHaveLength(2)
    for (const link of kanbans) {
      expect(link).toHaveAttribute("href", "/comercial/crm/temperatura/kanban")
    }

    const primeiroCard = await screen.findByText("Leads (Negócios)")
    const ultimoPainel = await screen.findByRole("heading", { name: "Atividades Recentes" })
    expect(
      barraTopo.compareDocumentPosition(primeiroCard) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      barraBaixo.compareDocumentPosition(ultimoPainel) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy()

    for (const label of ["Novo Lead", "Nova Proposta", "Nova Campanha", "Email Massa"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it("exibe o botão de informações na visão geral, nos cards, painéis e ações rápidas", async () => {
    setup()

    expect(
      screen.getByRole("button", { name: "Informações da visão geral do CRM" })
    ).toBeInTheDocument()
    expect(await screen.findAllByRole("button", { name: /^Informações do card / })).toHaveLength(6)
    expect(
      await screen.findByRole("button", { name: "Informações do painel Top Leads" })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Informações do painel Top Clientes" })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Informações do painel Atividades Recentes" })
    ).toBeInTheDocument()
    expect(
      await screen.findAllByRole("button", { name: "Informações das Ações Rápidas" })
    ).toHaveLength(2)
    expect(
      screen.getByRole("button", { name: "Informações da temperatura de leads e clientes" })
    ).toBeInTheDocument()
  })
})
