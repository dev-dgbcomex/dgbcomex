import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core/dialect"
import { contadoresCliente, contadoresLead } from "./contadores-listagem"
import { contarFaixasConversao, itensDaFaixa } from "./faixa-conversao"

const dialect = new PgDialect()
const sqlTexto = (valor: unknown) => dialect.sqlToQuery(valor as never).sql

describe("contadores-listagem", () => {
  it("contabiliza o relacionamento dos clientes", () => {
    const contadores = contadoresCliente()

    expect(Object.keys(contadores)).toEqual([
      "totalOportunidades",
      "totalPedidos",
      "totalVisitas",
      "totalAcoes",
      "faixaConversao",
    ])

    const texto = Object.values(contadores).map(sqlTexto).join(" ")
    expect(texto).toMatch(/crm_oportunidades/)
    expect(texto).toMatch(/crm_pedidos_venda/)
    expect(texto).toMatch(/crm_visitas/)
    expect(texto).toMatch(/crm_acoes_prospeccao/)
    expect(texto).toContain('"clientes"."id"')
    expect(texto).toContain(
      '"crm_pedidos_venda"."oportunidade_id" = "crm_oportunidades"."id"'
    )
    expect(texto).not.toMatch(/where "cliente_id" = "id"/)
    expect(texto).toContain("'NEGOCIACAO'")
    expect(texto).toContain("'PROPOSTA'")
    expect(texto).toContain("'QUENTE'")
    expect(texto).toContain("'MORNO'")
    expect(texto).toContain('"crm_leads"."cliente_id"')
    expect(texto).not.toContain('"clientes"."status"')
    expect(texto).not.toContain('"crm_leads"."status"')
  })

  it("contabiliza o relacionamento das leads", () => {
    const contadores = contadoresLead()

    expect(Object.keys(contadores)).toEqual([
      "totalOportunidades",
      "totalPedidos",
      "totalVisitas",
      "totalAcoes",
      "faixaConversao",
    ])

    const texto = Object.values(contadores).map(sqlTexto).join(" ")
    expect(texto).toMatch(/crm_oportunidades/)
    expect(texto).toMatch(/crm_pedidos_venda/)
    expect(texto).toMatch(/crm_visitas/)
    expect(texto).toMatch(/crm_acoes_prospeccao/)
    expect(texto).toContain('"crm_leads"."id"')
    expect(texto).toContain(
      '"crm_pedidos_venda"."oportunidade_id" = "crm_oportunidades"."id"'
    )
    expect(texto).not.toMatch(/where "lead_id" = "id"/)
    expect(texto).toContain("'NEGOCIACAO'")
    expect(texto).toContain("'PROPOSTA'")
    expect(texto).toContain("'QUENTE'")
    expect(texto).toContain("'MORNO'")
    expect(texto).not.toContain('"crm_leads"."status"')
  })

  it("conta cada lead/cliente em uma única faixa de conversão", () => {
    const contagem = contarFaixasConversao([
      { faixaConversao: "QUENTE" },
      { faixaConversao: "MORNO" },
      { faixaConversao: "FRIO" },
      { faixaConversao: null },
      {},
    ])

    expect(contagem).toEqual({ QUENTE: 1, MORNO: 1, FRIO: 3 })
  })

  it("filtra a lista de cada faixa com a mesma regra da contagem", () => {
    const itens = [
      { id: 1, faixaConversao: "QUENTE" },
      { id: 2, faixaConversao: "MORNO" },
      { id: 3, faixaConversao: "FRIO" },
      { id: 4, faixaConversao: null },
      { id: 5 },
    ]

    expect(itensDaFaixa(itens, "QUENTE").map((item) => item.id)).toEqual([1])
    expect(itensDaFaixa(itens, "MORNO").map((item) => item.id)).toEqual([2])
    expect(itensDaFaixa(itens, "FRIO").map((item) => item.id)).toEqual([3, 4, 5])
  })
})
