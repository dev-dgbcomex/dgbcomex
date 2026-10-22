import { describe, expect, it } from "vitest"
import { getInfoContent } from "./index"

function texto(path: string) {
  const info = getInfoContent(path)
  return [
    info?.description ?? "",
    ...(info?.rules ?? []),
    ...(info?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ...(info?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
    ...(info?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
  ].join("\n")
}

describe("info-content do WMS", () => {
  it("explica que o WMS usa o banco local e o ERP é somente leitura", () => {
    const t = texto("/wms")
    expect(t).toMatch(/PostgreSQL local/)
    expect(t).toMatch(/somente leitura/)
    expect(t).toMatch(/raw\.cte_peca/)
    expect(t).toMatch(/raw\.cte_baixa/)
  })

  it("documenta as regras de alocação", () => {
    const t = texto("/wms")
    expect(t).toMatch(/endereço de destino válido/)
    expect(t).toMatch(/Nro\. Rolo \+ Nro\. Peça/)
    expect(t).toMatch(/Transferência/)
    expect(t).toMatch(/movimento auditável/)
  })

  it("descreve os tipos de endereço", () => {
    const t = texto("/wms/enderecos")
    for (const tipo of ["PULMAO", "PICKING", "EXPEDICAO", "AVARIA"]) {
      expect(t).toContain(tipo)
    }
    expect(t).toMatch(/código.*único/i)
  })

  it("descreve o estoque em aberto e a busca", () => {
    const t = texto("/wms/estoque")
    expect(t).toMatch(/sem baixa/i)
    expect(t).toMatch(/nro_rolo_origem/)
    expect(t).toMatch(/número de rolo, produto, cor ou lote interno/)
  })

  it("descreve os movimentos", () => {
    const t = texto("/wms/movimentos")
    for (const tipo of ["ENTRADA", "SAIDA", "TRANSFERENCIA", "AJUSTE"]) {
      expect(t).toContain(tipo)
    }
    expect(t).toMatch(/imutável|não podem ser editados/i)
  })
})
