// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, renderPage, routeJson } from "@/test/harness"
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

function setup() {
  const fetchMock = createFetchMock(routeJson({ "GET /api/crm/dashboard": dashboardPayload }))
  vi.stubGlobal("fetch", fetchMock.fn)
  renderPage(<CrmDashboardPage />)
}

describe("CrmDashboardPage", () => {
  it("renderiza o heading e os cards de resumo", async () => {
    setup()
    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument()

    for (const label of [
      "Visitantes",
      "Leads (Negócios)",
      "Clientes",
      "Oportunidades",
      "Propostas",
      "Visitas",
      "Tarefas Pendentes",
      "Campanhas",
      "Emails Enviados",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it("contém o texto dos cards dentro do card (truncate) e link correto", async () => {
    setup()

    const label = await screen.findByText("Leads (Negócios)")
    expect(label).toHaveClass("truncate")

    const card = screen.getByTitle("Leads (Negócios)")
    expect(card).toHaveAttribute("href", "/comercial/crm/leads")
    expect(card).toHaveClass("overflow-hidden")
  })
})
