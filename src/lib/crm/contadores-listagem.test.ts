import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core/dialect"
import { contadoresCliente, contadoresLead } from "./contadores-listagem"
import { contarFaixasConversao } from "./faixa-conversao"

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
})
