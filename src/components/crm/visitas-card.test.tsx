// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, findCall, renderPage } from "@/test/harness"
import { VisitasCard } from "./visitas-card"

describe("VisitasCard", () => {
  beforeEach(() => {
    const fetchMock = createFetchMock(({ url }) => {
      if (url === "/api/crm/visitas?all=true&empresaId=9") {
        return { json: [{ id: 21, relato: "Visita da lead", status: "REALIZADA" }] }
      }
      if (url === "/api/crm/visitas?all=true&clienteId=4") {
        return { json: [{ id: 22, relato: "Visita do cliente", status: "PENDENTE" }] }
      }
      return { status: 404, json: [] }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("busca e exibe as visitas da lead com link para o detalhe", async () => {
    renderPage(<VisitasCard empresaId="9" />)

    expect(await screen.findByText("Visita da lead")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Visita da lead/ })).toHaveAttribute(
      "href",
      "/comercial/crm/visitas/21"
    )
  })

  it("busca as visitas do cliente pelo filtro clienteId", async () => {
    const fetchMock = createFetchMock(() => ({
      json: [{ id: 22, relato: "Visita do cliente", status: "PENDENTE" }],
    }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<VisitasCard clienteId="4" />)

    expect(await screen.findByText("Visita do cliente")).toBeInTheDocument()
    expect(findCall(fetchMock.calls, "/api/crm/visitas?all=true&clienteId=4")).toBeDefined()
  })
})
