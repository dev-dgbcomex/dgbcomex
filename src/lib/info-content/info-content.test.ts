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
    // O gráfico de barras em pé com a participação (%) do fornecedor no total.
    expect(texto).toMatch(/participação do fornecedor/i)
    expect(texto).toMatch(/barras em pé|barras EM PÉ/i)
    // Os dois gráficos sobre o faturamento e a fonte (vwFaturamento / data da nota).
    expect(texto).toMatch(/sobre o faturamento/i)
    expect(texto).toMatch(/vwFaturamento/)
    // O detalhe vermelho a partir de 65%.
    expect(texto).toMatch(/65%/)
    expect(texto).toMatch(/do faturamento/)
    // Não pode sobrar a descrição do recuo automático (aviso azul), que não existe mais.
    expect(texto).not.toMatch(/aviso azul|recua sozinha|último mês fechado/i)
  })

  it("o conteúdo do WMS reflete a ordenação vertical e as prioridades", () => {
    const pedidos = getInfoContent("/wms/pedidos")
    const separacoes = getInfoContent("/wms/separacoes")
    const estoque = getInfoContent("/wms/estoque")
    const gavetas = getInfoContent("/wms/gavetas")

    const texto = [pedidos, separacoes, estoque, gavetas]
      .flatMap((item) => [
        item?.description ?? "",
        ...(item?.rules ?? []),
      ])
      .join("\n")

    expect(texto).toMatch(/ordem vertical dos cartões é global/i)
    expect(texto).toMatch(/arrastando o cartão para cima ou para baixo|arrastando para cima\/baixo/i)
    expect(texto).toMatch(/vermelha no topo \(5%\)/)
    expect(texto).toMatch(/COMERCIAL, EXPEDICAO, ADMIN e SUDO/)
    expect(texto).toMatch(/artigos do pedido/i)
    expect(texto).toMatch(/Voltar para as separações/)
    expect(texto).toMatch(/cancela a ordem, liberando as peças/i)
  })
})
