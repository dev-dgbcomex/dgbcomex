// @vitest-environment node
import { describe, expect, it } from "vitest"
import { hrefEventoTimeline } from "./href-evento-timeline"

describe("hrefEventoTimeline", () => {
  it("usa o ID da ação dos metadados e ignora o ID do evento de timeline", () => {
    expect(
      hrefEventoTimeline({
        id: 214,
        tipo: "ACAO_PROSPECCAO",
        metadados: { acaoProspeccaoId: 87 },
      })
    ).toBe("/comercial/crm/acoes-prospeccao/87")
  })

  it("aceita metadados serializados em JSON", () => {
    expect(
      hrefEventoTimeline({
        id: 214,
        tipo: "ACAO_PROSPECCAO",
        metadados: JSON.stringify({ acaoProspeccaoId: 87 }),
      })
    ).toBe("/comercial/crm/acoes-prospeccao/87")
  })

  it("resolve a visita pelo ID salvo no evento", () => {
    expect(hrefEventoTimeline({ id: 214, tipo: "VISITA", metadados: { visitaId: 42 } })).toBe(
      "/comercial/crm/visitas/42"
    )
  })

  it("usa leadId com fallback para empresaId", () => {
    expect(hrefEventoTimeline({ tipo: "LEAD", metadados: { empresaId: 7 } })).toBe(
      "/comercial/crm/leads/7"
    )
    expect(hrefEventoTimeline({ tipo: "LEAD", metadados: { leadId: 9, empresaId: 7 } })).toBe(
      "/comercial/crm/leads/9"
    )
  })

  it("não gera link quebrado sem metadados ou com tipo sem rota", () => {
    expect(hrefEventoTimeline({ id: 214, tipo: "ACAO_PROSPECCAO" })).toBeNull()
    expect(hrefEventoTimeline({ tipo: "WHATSAPP", metadados: { whatsappId: 5 } })).toBeNull()
  })
})
