// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import ViagemDetailPage from "./page"
import { createFetchMock, renderPage, navMock } from "@/test/harness"

const viagem = {
  id: 1,
  titulo: "Feira Agritech",
  descricao: null,
  destinoCidade: "São Paulo",
  destinoUf: "SP",
  dataInicio: "2026-07-01",
  dataFim: "2026-07-05",
  status: "PLANEJADA",
  possivelRetorno: 0,
  vendas: 0,
  retornoReal: 0,
  investimentos: [],
  visitas: [],
}

describe("ViagemDetailPage — Ações de Prospecção", () => {
  beforeEach(() => {
    navMock.setPathname("/comercial/crm/viagens/1")
    navMock.setParams({ id: "1" })
  })

  it("lista apenas as ações de prospecção vinculadas à viagem", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/crm/viagens/1") return { json: viagem }
      if (method === "GET" && url === "/api/crm/acoes-prospeccao?all=true") {
        return {
          json: [
            {
              id: 10,
              empresaNome: "Tecelagem Beta",
              dataAcao: "2026-07-02",
              hora: "11:00",
              status: "AGENDADA",
              viagemId: 1,
            },
            { id: 11, empresaNome: "Outra Empresa", viagemId: 2 },
          ],
        }
      }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<ViagemDetailPage />)

    expect(
      await screen.findByRole("heading", { name: "Ações de Prospecção Vinculadas" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Tecelagem Beta/ })).toHaveAttribute(
      "href",
      "/comercial/crm/acoes-prospeccao/10"
    )
    expect(screen.queryByText("Outra Empresa")).not.toBeInTheDocument()
  })
})
