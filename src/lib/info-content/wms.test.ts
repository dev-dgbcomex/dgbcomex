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

    expect(texto).toMatch(/ordens de separa/i)
    expect(texto).toMatch(/LIBERADO/)
    expect(texto).toMatch(/EM_SEPARACAO/)
    expect(texto).toMatch(/concluir.*n.o libera|n.o libera.*concluir/i)
    expect(texto).toMatch(/somente leitura|nunca grava/i)
    expect(texto).not.toMatch(/endere.o de destino|movimenta/i)
  })

  it("explica os pedidos liberados e o kanban por situações", () => {
    const texto = textoDe("/wms/pedidos")

    expect(texto).toMatch(/status 2/i)
    expect(texto).toMatch(/kanban/i)
    expect(texto).toMatch(/situa/i)
    expect(texto).toMatch(/Mover para/i)
    expect(texto).toMatch(/perfis/i)
    expect(texto).toMatch(/qtde.*romaneio.*acerto/i)
  })

  it("documenta o cadastro de situações e as ações", () => {
    const texto = textoDe("/wms/situacoes")

    expect(texto).toMatch(/coluna/i)
    expect(texto).toMatch(/CRIAR_ORDEM/)
    expect(texto).toMatch(/CONCLUIR_ORDEM/)
    expect(texto).toMatch(/CANCELAR_ORDEM/)
    expect(texto).toMatch(/ADMIN/)
    expect(texto).toMatch(/EXPEDICAO/)
    expect(texto).toMatch(/n.o podem ser exclu.das/i)
  })

  it("explica os status das ordens de separação", () => {
    const texto = textoDe("/wms/separacoes")

    for (const status of ["LIBERADO", "EM_SEPARACAO", "SEPARADO", "CANCELADO"]) {
      expect(texto).toContain(status)
    }
    expect(texto).toMatch(/pe.as.*voltam ao estoque em aberto/i)
  })

  it("detalha o estoque em aberto e a grade de seleção", () => {
    const texto = textoDe("/wms/estoque")

    expect(texto).toMatch(/nro_rolo_origem/)
    expect(texto).toMatch(/gaveta/)
    expect(texto).toMatch(/sub-lote/)
    expect(texto).toMatch(/largura n.o filtra/i)
    expect(texto).toMatch(/aviso/i)
  })

  it("documenta as gavetas como somente leitura", () => {
    const texto = textoDe("/wms/gavetas")

    expect(texto).toMatch(/somente leitura/i)
    expect(texto).toMatch(/ERP/)
    expect(texto).toMatch(/DEP.SITO/)
    expect(texto).toMatch(/PRODUÇÃO/)
  })

  it("documenta o arquivo de pedidos e ordens cancelados", () => {
    const texto = textoDe("/wms/arquivados")

    expect(texto).toMatch(/arquiv/i)
    expect(texto).toMatch(/CANCELADO/)
    expect(texto).toMatch(/LIBERADO|EM_SEPARACAO|producao/i)
    expect(texto).toMatch(/CSV|PDF/i)
  })

  it("resolve o detalhe da ordem pelo prefixo das separações", () => {
    const info = getInfoContent("/wms/separacoes/9")

    expect(info?.title).toBe("Ordens de Separação")
  })
})
