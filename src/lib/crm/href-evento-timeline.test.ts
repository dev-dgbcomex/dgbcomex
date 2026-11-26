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

  it("abre o pedido de venda a partir do evento de timeline", () => {
    expect(
      hrefEventoTimeline({ tipo: "PEDIDO_VENDA", metadados: { pedidoVendaId: 123 } })
    ).toBe("/comercial/crm/pedidos-venda/123")
  })

  it("abre o faturamento vinculado e faz fallback para o pedido", () => {
    expect(
      hrefEventoTimeline({
        tipo: "FATURAMENTO",
        metadados: { pedidoVendaId: 123, faturamentoId: 45 },
      })
    ).toBe("/comercial/crm/faturamentos/45")
    expect(
      hrefEventoTimeline({ tipo: "FATURAMENTO", metadados: { pedidoVendaId: 123 } })
    ).toBe("/comercial/crm/pedidos-venda/123")
  })

  it("não gera link quebrado sem metadados ou com tipo sem rota", () => {
    expect(hrefEventoTimeline({ id: 214, tipo: "ACAO_PROSPECCAO" })).toBeNull()
    expect(hrefEventoTimeline({ tipo: "WHATSAPP", metadados: { whatsappId: 5 } })).toBeNull()
  })
})
