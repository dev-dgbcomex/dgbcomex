// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, routeJson } from "@/test/harness"
import CrmDashboardPage from "./page"

vi.setConfig({ testTimeout: 30000 })

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Admin", role: "ADMIN" } }, status: "authenticated" }),
}))

const dashboardPayload = {
  visitantes: { total: 0, esteMes: 0 },
  leads: { total: 185 },
  clientes: { total: 12 },
  oportunidades: { total: 0, esteMes: 0, byStatus: [] },
  propostas: { total: 0, byStatus: [] },
  visitas: { total: 1, hoje: 0 },
  tarefas: { pendentes: 0, vencendo: 0 },
  topEmpresas: [],
  forecast: 0,
  conversao: { oportunidadesConvertidas: 0, totalOportunidades: 0 },
  recentes: [],
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

function setup() {
  const fetchMock = createFetchMock(
    routeJson({
      "GET /api/crm/dashboard": dashboardPayload,
      "GET /api/crm/dashboard/detalhes?bloco=leads": detalhePayload,
    })
  )
  vi.stubGlobal("fetch", fetchMock.fn)
  renderPage(<CrmDashboardPage />)
  return fetchMock
}

describe("CrmDashboardPage", () => {
  it("renderiza o heading e apenas os cinco cards de resumo restantes", async () => {
    setup()
    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument()

    for (const label of [
      "Leads (Negócios)",
      "Clientes",
      "Oportunidades",
      "Visitas",
      "Tarefas Pendentes",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }

    for (const label of ["Visitantes", "Propostas", "Campanhas", "Emails Enviados"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
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
    expect(await screen.findByText("Tecelagem Y")).toBeInTheDocument()
    expect(
      findCall(fetchMock.calls, "/api/crm/dashboard/detalhes?bloco=leads", "GET")
    ).toBeDefined()
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute(
      "href",
      "/comercial/crm/leads"
    )
  })

  it("mantém os atalhos dos domínios sem card", async () => {
    setup()

    for (const label of ["Novo Lead", "Nova Proposta", "Nova Campanha", "Email Massa"]) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it("exibe o botão de informações na visão geral, nos cards, painéis e ações rápidas", async () => {
    setup()

    expect(
      screen.getByRole("button", { name: "Informações da visão geral do CRM" })
    ).toBeInTheDocument()
    expect(await screen.findAllByRole("button", { name: /^Informações do card / })).toHaveLength(5)
    expect(
      await screen.findByRole("button", { name: "Informações do painel Top Leads" })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Informações do painel Atividades Recentes" })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Informações das Ações Rápidas" })
    ).toBeInTheDocument()
  })
})
