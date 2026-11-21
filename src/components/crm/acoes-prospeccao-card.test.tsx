// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, findCall, renderPage } from "@/test/harness"
import { AcoesProspeccaoCard } from "./acoes-prospeccao-card"

describe("AcoesProspeccaoCard", () => {
  beforeEach(() => {
    const fetchMock = createFetchMock(({ url }) => {
      if (url === "/api/crm/acoes-prospeccao?all=true&empresaId=9") {
        return { json: [{ id: 12, relato: "Ação da lead", status: "CONCLUIDA" }] }
      }
      if (url === "/api/crm/acoes-prospeccao?all=true&clienteId=4") {
        return { json: [{ id: 13, relato: "Ação do cliente", status: "PENDENTE" }] }
      }
      return { status: 404, json: [] }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("busca e exibe as ações da lead com link para o detalhe", async () => {
    renderPage(<AcoesProspeccaoCard empresaId="9" />)

    expect(await screen.findByText("Ação da lead")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Ação da lead/ })).toHaveAttribute(
      "href",
      "/comercial/crm/acoes-prospeccao/12"
    )
  })

  it("busca as ações do cliente pelo filtro clienteId", async () => {
    const fetchMock = createFetchMock(() => ({
      json: [{ id: 13, relato: "Ação do cliente", status: "PENDENTE" }],
    }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<AcoesProspeccaoCard clienteId="4" />)

    expect(await screen.findByText("Ação do cliente")).toBeInTheDocument()
    expect(findCall(fetchMock.calls, "/api/crm/acoes-prospeccao?all=true&clienteId=4")).toBeDefined()
  })
})
