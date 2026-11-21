import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core/dialect"
import { contadoresCliente, contadoresLead } from "./contadores-listagem"

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
    ])

    const texto = Object.values(contadores).map(sqlTexto).join(" ")
    expect(texto).toMatch(/crm_oportunidades/)
    expect(texto).toMatch(/crm_pedidos_venda/)
    expect(texto).toMatch(/crm_visitas/)
    expect(texto).toMatch(/crm_acoes_prospeccao/)
  })

  it("contabiliza o relacionamento das leads", () => {
    const contadores = contadoresLead()

    expect(Object.keys(contadores)).toEqual([
      "totalOportunidades",
      "totalPedidos",
      "totalVisitas",
      "totalAcoes",
    ])

    const texto = Object.values(contadores).map(sqlTexto).join(" ")
    expect(texto).toMatch(/crm_oportunidades/)
    expect(texto).toMatch(/crm_pedidos_venda/)
    expect(texto).toMatch(/crm_visitas/)
    expect(texto).toMatch(/crm_acoes_prospeccao/)
  })
})
