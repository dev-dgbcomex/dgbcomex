// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, routeJson } from "@/test/harness"
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

const payloadPrevisao = {
  bloco: "previsao-abertas",
  titulo: "Oportunidades da previsão de receita",
  listagem: "/comercial/crm/oportunidades",
  itens: [
    {
      id: 12,
      titulo: "Oportunidade 12",
      status: "NEGOCIACAO",
      valor: 12500,
      data: "2026-11-20T12:00:00.000Z",
      href: "/comercial/crm/oportunidades/12",
    },
  ],
  totalRegistros: 40,
  totalValor: 480000,
}

describe("DashboardDetalhesModal", () => {
  it("carrega a lista e abre cada registro pelo link", async () => {
    const fetchMock = createFetchMock(
      routeJson({ "GET /api/crm/dashboard/detalhes?bloco=oportunidades": payload })
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<DashboardDetalhesModal detalhe={{ bloco: "oportunidades" }} onClose={vi.fn()} />)

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

  it("mostra total e exportação do bloco de previsão com todas as oportunidades", async () => {
    const fetchMock = createFetchMock(
      routeJson({
        "GET /api/crm/dashboard/detalhes?bloco=previsao-abertas&limite=500": payloadPrevisao,
      })
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<DashboardDetalhesModal detalhe={{ bloco: "previsao-abertas" }} onClose={vi.fn()} />)

    expect(
      await screen.findByRole("heading", { name: "Oportunidades da previsão de receita" })
    ).toBeInTheDocument()
    expect(screen.getByText("40 registro(s) encontrado(s)")).toBeInTheDocument()
    expect(screen.getByText("Total de 40 oportunidade(s)")).toBeInTheDocument()
    expect(screen.getByText(/480\.000,00/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "CSV" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "JSON" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "PDF" })).toBeInTheDocument()
    expect(
      findCall(
        fetchMock.calls,
        "/api/crm/dashboard/detalhes?bloco=previsao-abertas&limite=500",
        "GET"
      )
    ).toBeDefined()
  })
})
