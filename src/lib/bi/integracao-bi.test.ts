import { describe, expect, it } from "vitest"
import { INTEGRACAO_DA_TELA, ROTA_DETALHE, resolverIntegracaoBi } from "./integracao-bi"

const INTEGRACOES = [
  { id: 1, nome: "Faturamento do Dia", baseUrl: "http://erp/faturamento/{data}" },
  { id: 2, nome: "Faturamento Dia (diário)", baseUrl: "http://erp/faturamento-dia/{data}" },
  { id: 3, nome: "Contas Pagas", baseUrl: "http://erp/contas-pagas/{data}" },
  { id: 4, nome: "Custos Administrativos Anual", baseUrl: "http://erp/custos-administrativos-anual" },
  { id: 5, nome: "Custos Administrativos Mensal", baseUrl: "http://erp/custos-administrativos-mensal" },
]

describe("resolverIntegracaoBi", () => {
  it("acha pelo nome exato", () => {
    expect(resolverIntegracaoBi(INTEGRACOES, "Contas Pagas")?.id).toBe(3)
  })

  it("não pega o card parecido quando o nome não bate", () => {
    // "Faturamento Dia (diário)" também tem "faturamento" no nome, mas serve outro
    // endpoint: a tela de faturamento usa o card "Faturamento do Dia".
    expect(resolverIntegracaoBi(INTEGRACOES, "Faturamento do Dia")?.id).toBe(1)
  })

  it("não confunde o card mensal com o anual", () => {
    expect(resolverIntegracaoBi(INTEGRACOES, "Custos Administrativos Mensal")?.id).toBe(5)
    expect(resolverIntegracaoBi(INTEGRACOES, "Custos Administrativos Anual")?.id).toBe(4)
  })

  it("cai na URL base quando o nome não existe", () => {
    const integracao = resolverIntegracaoBi(
      INTEGRACOES,
      "Faturamento Detalhe",
      /faturamento-detalhe/i
    )
    expect(integracao).toBeUndefined()

    const comDetalhe = [
      ...INTEGRACOES,
      { id: 9, nome: "Faturamento Detalhe", baseUrl: "http://erp/faturamento-detalhe" },
    ]
    expect(resolverIntegracaoBi(comDetalhe, "Faturamento Detalhe", /faturamento-detalhe/i)?.id).toBe(9)
  })

  it("devolve indefinido quando não há nada", () => {
    expect(resolverIntegracaoBi([], "Contas Pagas")).toBeUndefined()
    expect(resolverIntegracaoBi(undefined, "Contas Pagas")).toBeUndefined()
  })

  it("acha pela rota da tela, que é o inverso do mapa do card", () => {
    expect(resolverIntegracaoBi(INTEGRACOES, "/bi/integracoes/faturamento")?.id).toBe(1)
    expect(resolverIntegracaoBi(INTEGRACOES, "/bi/integracoes/contas-pagas")?.id).toBe(3)
    expect(
      resolverIntegracaoBi(INTEGRACOES, "/bi/integracoes/custos-administrativos")?.id
    ).toBe(5)
    expect(
      resolverIntegracaoBi(INTEGRACOES, "/bi/integracoes/custos-administrativos-anual")?.id
    ).toBe(4)
  })

  it("mantém o mapa do card e o da tela coerentes", () => {
    for (const [nome, rota] of Object.entries(ROTA_DETALHE)) {
      expect(INTEGRACAO_DA_TELA[rota]).toBe(nome)
    }
  })
})
