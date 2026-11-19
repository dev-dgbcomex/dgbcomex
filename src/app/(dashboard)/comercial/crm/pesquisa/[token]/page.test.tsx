// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import PesquisaSatisfacaoPage from "./page"

function renderPesquisa(data: Record<string, unknown>) {
  navMock.setParams({ token: "token-publico" })
  const fetchMock = createFetchMock(() => ({ status: 200, json: data }))
  vi.stubGlobal("fetch", fetchMock.fn)
  renderPage(<PesquisaSatisfacaoPage />)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("página pública de pesquisa de satisfação", () => {
  it("exibe a data da ação quando o token veio de uma ação de prospecção", async () => {
    const fetchMock = renderPesquisa({
      id: 7,
      origem: "acao",
      visitaId: null,
      acaoId: 42,
      email: "cliente@example.com",
      nome: "Cliente",
      status: "ABERTO",
      dataVisita: null,
      dataAcao: "2026-08-10",
    })

    expect(await screen.findByText("Ação: 10/08/2026")).toBeTruthy()
    expect(fetchMock.calls[0].url).toBe("/api/crm/pesquisa/token-publico")
  })

  it("mantém o rótulo de visita para tokens antigos", async () => {
    renderPesquisa({
      id: 9,
      origem: "visita",
      visitaId: 15,
      acaoId: null,
      email: "cliente@example.com",
      nome: "Cliente",
      status: "ABERTO",
      dataVisita: "2026-07-10",
      dataAcao: null,
    })

    expect(await screen.findByText("Visita: 10/07/2026")).toBeTruthy()
  })
})
