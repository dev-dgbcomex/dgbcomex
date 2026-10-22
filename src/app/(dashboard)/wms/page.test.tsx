// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, navMock, renderPage, routeJson } from "@/test/harness"
import WmsPage from "./page"

describe("WMS — dashboard", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms")
  })

  it("renderiza os indicadores do armazém", async () => {
    const fetchMock = createFetchMock(
      routeJson({
        "GET /api/wms/dashboard": {
          enderecos: 12,
          enderecosAtivos: 10,
          pecasAlocadas: 42,
          metrosAlocados: 1234.5,
          pecasEmAberto: 18310,
          movimentosHoje: 7,
        },
      })
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<WmsPage />)

    expect(await screen.findByText("18310")).toBeTruthy()
    expect(await screen.findByText("42")).toBeTruthy()
    expect(screen.getByText("12")).toBeTruthy()
    expect(screen.getByText("7")).toBeTruthy()
    expect(screen.getByText("10 ativos")).toBeTruthy()
  })

  it("mostra atalhos para as telas do módulo", async () => {
    const fetchMock = createFetchMock(
      routeJson({
        "GET /api/wms/dashboard": {
          enderecos: 0,
          enderecosAtivos: 0,
          pecasAlocadas: 0,
          metrosAlocados: 0,
          pecasEmAberto: 0,
          movimentosHoje: 0,
        },
      })
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<WmsPage />)

    const links = await screen.findAllByRole("link")
    expect(links.map((l) => l.getAttribute("href"))).toEqual(
      expect.arrayContaining(["/wms/enderecos", "/wms/estoque", "/wms/movimentos"])
    )
  })
})
