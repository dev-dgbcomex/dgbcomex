import { describe, expect, it } from "vitest"
import { getInfoContent } from "./index"

const textoDe = (pathname: string) => {
  const info = getInfoContent(pathname)
  if (!info) return ""
  return [
    info.description,
    ...(info.rules ?? []),
    ...(info.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
    ...(info.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ...(info.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
  ].join("\n")
}

describe("info-content do WMS", () => {
  it("cobre a tela do dashboard com o fluxo de ordens de separação", () => {
    const texto = textoDe("/wms")

    expect(texto).toMatch(/ordens de separação/i)
    expect(texto).toMatch(/LIBERADO/)
    expect(texto).toMatch(/EM_SEPARACAO/)
    expect(texto).toMatch(/concluir.*não libera|não libera.*concluir/i)
    expect(texto).toMatch(/somente leitura|nunca grava/i)
    expect(texto).not.toMatch(/endereço de destino|movimentaç/i)
  })

  it("explica os pedidos liberados e a marcação por pedido inteiro", () => {
    const texto = textoDe("/wms/pedidos")

    expect(texto).toMatch(/status 2/i)
    expect(texto).toMatch(/pedido inteiro/i)
    expect(texto).toMatch(/409|já.*ordem ativa/i)
    expect(texto).toMatch(/qtde.*romaneio.*acerto/i)
  })

  it("explica os status das ordens de separação", () => {
    const texto = textoDe("/wms/separacoes")

    for (const status of ["LIBERADO", "EM_SEPARACAO", "SEPARADO", "CANCELADO"]) {
      expect(texto).toContain(status)
    }
    expect(texto).toMatch(/peças.*voltam ao estoque em aberto/i)
  })

  it("detalha o estoque em aberto e a grade de seleção", () => {
    const texto = textoDe("/wms/estoque")

    expect(texto).toMatch(/nro_rolo_origem/)
    expect(texto).toMatch(/gaveta/)
    expect(texto).toMatch(/sub-lote/)
    expect(texto).toMatch(/largura não filtra/i)
  })

  it("documenta as gavetas como somente leitura", () => {
    const texto = textoDe("/wms/gavetas")

    expect(texto).toMatch(/somente leitura/i)
    expect(texto).toMatch(/ERP/)
    expect(texto).toMatch(/DEPÓSITO/)
    expect(texto).toMatch(/PRODUÇÃO/)
  })

  it("resolve o detalhe da ordem pelo prefixo das separações", () => {
    const info = getInfoContent("/wms/separacoes/9")

    expect(info?.title).toBe("Ordens de Separação")
  })
})
