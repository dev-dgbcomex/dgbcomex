// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import { resumoIdEventoTimeline } from "@/lib/crm/href-evento-timeline"
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
        {
          id: 4,
          tipo: "RESUMO_IA",
          descricao: "MORNO: resumo salvo",
          dataEvento: "2026-11-17T10:00:00.000Z",
          metadados: { resumoId: 55 },
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

  it("abre o resumo IA pelo evento da timeline", async () => {
    const onAbrirResumo = vi.fn()
    renderPage(<CrmTimeline pessoaId="9" onAbrirResumo={onAbrirResumo} />)

    const botao = await screen.findByRole("button", { name: "MORNO: resumo salvo" })
    expect(screen.getByText("Resumo IA")).toBeInTheDocument()
    fireEvent.click(botao)
    expect(onAbrirResumo).toHaveBeenCalledWith(55)
  })

  it("extrai o id do resumo dos metadados do evento", () => {
    expect(resumoIdEventoTimeline({ tipo: "RESUMO_IA", metadados: { resumoId: 55 } })).toBe(55)
    expect(resumoIdEventoTimeline({ tipo: "RESUMO_IA", metadados: "{\"resumoId\":55}" })).toBe(55)
    expect(resumoIdEventoTimeline({ tipo: "RESUMO_IA", metadados: {} })).toBeNull()
  })
})
