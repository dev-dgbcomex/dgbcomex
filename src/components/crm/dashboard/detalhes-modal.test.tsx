// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, renderPage, routeJson } from "@/test/harness"
import { DashboardDetalhesModal } from "./detalhes-modal"

vi.setConfig({ testTimeout: 15000 })

const payload = {
  bloco: "oportunidades",
  titulo: "Oportunidades",
  listagem: "/comercial/crm/oportunidades",
  itens: [
    {
      id: 11,
      titulo: "Oportunidade 11",
      subtitulo: "Em andamento",
      status: "NEGOCIACAO",
      valor: 12500,
      href: "/comercial/crm/oportunidades/11",
    },
  ],
}

describe("DashboardDetalhesModal", () => {
  it("carrega a lista e abre cada registro pelo link", async () => {
    const fetchMock = createFetchMock(
      routeJson({ "GET /api/crm/dashboard/detalhes?bloco=oportunidades": payload })
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(
      <DashboardDetalhesModal detalhe={{ bloco: "oportunidades" }} onClose={vi.fn()} />
    )

    expect(await screen.findByRole("heading", { name: "Oportunidades" })).toBeInTheDocument()
    expect(await screen.findByText("Oportunidade 11")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Oportunidade 11/ })).toHaveAttribute(
      "href",
      "/comercial/crm/oportunidades/11"
    )
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute(
      "href",
      "/comercial/crm/oportunidades"
    )
  })
})
