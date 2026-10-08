// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { montarTabelaKpi } from "./kpi-export"
import { BI_KPI_METADADOS } from "./bi-kpi-metadados"

const real = (valor: string | number) => String(valor).replace(/\u00A0/g, " ")

describe("montarTabelaKpi", () => {
  it("monta tabela período × campo para cards com janelas (comparativo)", () => {
    const meta = BI_KPI_METADADOS["Faturamento do Dia"]
    const tabela = montarTabelaKpi(
      {
        MesAtual: { Faturamento: 373631.58 },
        MesAnterior: { Faturamento: 1508833.55 },
        AnoAtual: { Faturamento: 7861871.64 },
        AnoAnterior: { Faturamento: 26430276.47 },
      },
      meta
    )

    expect(tabela).not.toBeNull()
    expect(tabela!.colunas).toEqual(["Período", "Faturamento"])
    expect(tabela!.linhas).toHaveLength(4)
    expect(tabela!.linhas[0].map(real)).toEqual(["Mês atual", "R$ 373.631,58"])
    expect(tabela!.linhas[3][0]).toBe("Ano anterior")
  })

  it("usa o campo chave como rótulo quando indisponível (Descontos)", () => {
    const meta = BI_KPI_METADADOS["Descontos"]
    const tabela = montarTabelaKpi({ MesAtual: { Desconto: 4321.5 } }, meta)
    expect(tabela!.colunas).toEqual(["Período", "Desconto"])
    expect(real(tabela!.linhas[0][1])).toBe("R$ 4.321,50")
  })

  it("monta uma única linha com subcampos para cards sem janelas (anual)", () => {
    const meta = BI_KPI_METADADOS["Custos Administrativos Anual"]
    const tabela = montarTabelaKpi(
      {
        Faturamento: { Total: 27522110.16, Media: 2293509.18 },
        Administrativo: { Total: 9906460.7, Media: 825538.39 },
        Porc_Administrativo: 0.3599,
      },
      meta
    )

    expect(tabela!.colunas[0]).toBe("Período")
    expect(tabela!.linhas).toHaveLength(1)
    expect(tabela!.linhas[0][0]).toBe("Período consultado")
    expect(tabela!.colunas).toContain("Faturamento médio mensal")
    expect(tabela!.colunas).toContain("Custo administrativo total (12 meses)")
    expect(tabela!.linhas[0].map(real)).toContain("R$ 2.293.509,18")
    expect(tabela!.linhas[0]).toContain("35,99%")
  })

  it("cards com janelas e campos usam as janelas (mensal)", () => {
    const meta = BI_KPI_METADADOS["Custos Administrativos Mensal"]
    const tabela = montarTabelaKpi(
      {
        Faturamento: 373631.58,
        Administrativo: 0,
        Porc_Administrativo: 0,
        MesAnterior: {
          Faturamento: 1508833.55,
          Administrativo: 170459.83,
          Porc_Administrativo: 0.113,
        },
      },
      meta
    )

    expect(tabela!.colunas).toEqual(["Período", "Faturamento", "Custo administrativo", "% do faturamento"])
    expect(tabela!.linhas).toHaveLength(1)
    expect(tabela!.linhas[0][0]).toBe("Mês anterior")
  })

  it("retorna null sem body, sem janelas ou sem meta", () => {
    expect(montarTabelaKpi(null, BI_KPI_METADADOS["Faturamento do Dia"])).toBeNull()
    expect(montarTabelaKpi(undefined, BI_KPI_METADADOS["Contas Pagas"])).toBeNull()
    expect(montarTabelaKpi({ valor: 1 })).toBeNull()
  })
})