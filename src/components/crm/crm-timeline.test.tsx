// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import CrmTimeline from "./crm-timeline"

describe("CrmTimeline", () => {
  beforeEach(() => {
    const fetchMock = createFetchMock(() => ({
      json: [
        {
          id: 1,
          tipo: "VISITA",
          descricao: "Visita técnica",
          dataEvento: "2026-11-20T10:00:00.000Z",
          metadados: { visitaId: 42 },
        },
        {
          id: 2,
          tipo: "ACAO_PROSPECCAO",
          descricao: "Ação comercial",
          dataEvento: "2026-11-19T10:00:00.000Z",
          metadados: { acaoProspeccaoId: 7 },
        },
        {
          id: 3,
          tipo: "WHATSAPP",
          descricao: "Mensagem recebida",
          dataEvento: "2026-11-18T10:00:00.000Z",
          metadados: { whatsappId: 5 },
        },
      ],
    }))
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("exibe rótulos dos tipos e links para os eventos com detalhe", async () => {
    renderPage(<CrmTimeline pessoaId="9" />)

    expect(await screen.findByText("Visita técnica")).toBeInTheDocument()
    expect(screen.getByText("Ação de prospecção")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Visita técnica" })).toHaveAttribute(
      "href",
      "/comercial/crm/visitas/42"
    )
    expect(screen.getByRole("link", { name: "Ação comercial" })).toHaveAttribute(
      "href",
      "/comercial/crm/acoes-prospeccao/7"
    )
  })

  it("mantém eventos sem rota de detalhe como texto simples", async () => {
    renderPage(<CrmTimeline pessoaId="9" />)

    expect(await screen.findByText("Mensagem recebida")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Mensagem recebida" })).not.toBeInTheDocument()
  })
})
