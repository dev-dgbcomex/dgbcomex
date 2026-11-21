// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage } from "@/test/harness"
import { LeadMetricasModal } from "./metricas-modal"

describe("LeadMetricasModal", () => {
  it("normaliza pedidos e abre o detalhe do pedido", async () => {
    navMock.setPathname("/comercial/crm/leads")
    const fetchMock = createFetchMock(() => ({
      json: [
        {
          id: 1,
          numero: "PV-009",
          oportunidadeId: 5,
          oportunidadeTitulo: "Malha penteada",
          status: "ABERTO",
          total: "120.50",
          dataEmissao: "2026-11-20T12:00:00Z",
        },
      ],
    }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(
      <LeadMetricasModal tipo="pedidos" leadId={3} leadNome="Tecelagem Alpha" onClose={vi.fn()} />
    )

    expect(await screen.findByRole("dialog", { name: "Pedidos da lead" })).toBeInTheDocument()
    expect(await screen.findByText("PV-009")).toBeInTheDocument()
    expect((await screen.findAllByText(/R\$\s*120,50/)).length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: /PV-009/ })).toHaveAttribute(
      "href",
      "/comercial/crm/pedidos-venda/1"
    )
    expect(
      findCall(fetchMock.calls, "/api/crm/pedidos-venda?all=true&empresaId=3", "GET")
    ).toBeDefined()
  })

  it("mostra estado vazio quando a lead não tem registros", async () => {
    navMock.setPathname("/comercial/crm/leads")
    const fetchMock = createFetchMock(() => ({ json: [] }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(
      <LeadMetricasModal tipo="visitas" leadId={8} leadNome="Confecções Lima" onClose={vi.fn()} />
    )

    expect(await screen.findByRole("dialog", { name: "Visitas da lead" })).toBeInTheDocument()
    expect(await screen.findByText("Nenhum registro encontrado.")).toBeInTheDocument()
    expect(findCall(fetchMock.calls, "/api/crm/visitas?all=true&empresaId=8", "GET")).toBeDefined()
  })

  it("exibe erro quando a API falha", async () => {
    navMock.setPathname("/comercial/crm/leads")
    const fetchMock = createFetchMock(() => ({ status: 500, json: { error: "Erro" } }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<LeadMetricasModal tipo="acoes" leadId={2} leadNome="Lima" onClose={vi.fn()} />)

    expect(await screen.findByRole("dialog", { name: "Ações da lead" })).toBeInTheDocument()
    expect(await screen.findByText("Não foi possível carregar os registros.")).toBeInTheDocument()
  })
})
