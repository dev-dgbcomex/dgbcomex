import { describe, it, expect } from "vitest"
import { getInfoContent } from "./index"

describe("getInfoContent", () => {
  it("returns exact match for known path", () => {
    const result = getInfoContent("/dashboard")
    expect(result).not.toBeNull()
    expect(result?.title).toContain("Dashboard")
  })

  it("returns null for unknown path", () => {
    const result = getInfoContent("/nonexistent/path")
    expect(result).toBeNull()
  })

  it("returns best partial match for prefix", () => {
    const result = getInfoContent("/dashboard/amostra-comercial")
    expect(result).not.toBeNull()
    expect(result?.title).toContain("Amostras Comerciais")
  })

  it("matches cadastro paths", () => {
    const result = getInfoContent("/cadastros/clientes")
    expect(result).not.toBeNull()
  })

  it("matches admin paths", () => {
    const result = getInfoContent("/admin/usuarios")
    expect(result).not.toBeNull()
  })

  it("matches crm paths", () => {
    const result = getInfoContent("/comercial/crm")
    expect(result).not.toBeNull()
  })

  it("returns result with required fields", () => {
    const result = getInfoContent("/dashboard")
    expect(result).not.toBeNull()
    expect(result?.title).toBeDefined()
    expect(result?.description).toBeDefined()
  })

  it("o conteúdo de Contas Pagas reflete a dinâmica atual", () => {
    const result = getInfoContent("/bi/integracoes/contas-pagas")
    expect(result).not.toBeNull()

    const texto = [
      result?.description ?? "",
      ...(result?.rules ?? []),
      ...(result?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(result?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    // 5º card e as janelas fixas.
    expect(texto).toContain("Período selecionado")
    expect(texto).toMatch(/Mês atual/)
    // A tela nasce com um trimestre, não com o último mês com baixa.
    expect(texto).toMatch(/três meses atrás/)
    // O seletor 'Mês' e o 'Todos'.
    expect(texto).toContain("Todos os meses do período")
    // Todos os gráficos, inclusive o mês a mês, respeitam os filtros.
    expect(texto).toMatch(/mês a mês[\s\S]*respeitam os filtros|respeitam os filtros[\s\S]*mês a mês/)
    // O 'Limpar' volta ao período padrão, não fica no mês escolhido.
    expect(texto).toMatch(/Limpar: .*período padrão/)
    // Não pode sobrar a descrição do recuo automático (aviso azul), que não existe mais.
    expect(texto).not.toMatch(/aviso azul|recua sozinha|último mês fechado/i)
  })
})
