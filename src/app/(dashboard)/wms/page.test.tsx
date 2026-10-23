// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, navMock, renderPage, routeJson } from "@/test/harness"
import WmsPage from "./page"

const resumo = {
  pedidosLiberados: 3,
  separacoesLiberadas: 1,
  separacoesEmAndamento: 2,
  separacoesConcluidas: 4,
  pecasReservadas: 42,
  metrosReservados: 1234.5,
  pecasEmAberto: 18310,
  gavetas: 829,
}

describe("WMS — dashboard", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms")
  })

  it("renderiza os indicadores de separação e estoque", async () => {
    const fetchMock = createFetchMock(routeJson({ "GET /api/wms/dashboard": resumo }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<WmsPage />)

    expect(await screen.findByText("Pedidos liberados")).toBeTruthy()
    expect(screen.getByText("18.310")).toBeTruthy()
    expect(screen.getByText("42")).toBeTruthy()
    expect(screen.getByText("1 liberadas · 2 em andamento")).toBeTruthy()
    expect(screen.getByText("1234.5 m reservados")).toBeTruthy()
    expect(screen.getByText("endereços do ERP")).toBeTruthy()
  })

  it("mostra atalhos para as telas do módulo", async () => {
    const fetchMock = createFetchMock(routeJson({ "GET /api/wms/dashboard": resumo }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<WmsPage />)

    const links = await screen.findAllByRole("link")
    expect(links.map((l) => l.getAttribute("href"))).toEqual(
      expect.arrayContaining([
        "/wms/pedidos",
        "/wms/separacoes",
        "/wms/estoque",
        "/wms/gavetas",
      ])
    )
  })
})
