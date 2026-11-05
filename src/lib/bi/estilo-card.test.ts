// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  CORES_DRACULA,
  PALETA_DRACULA,
  corPorTitulo,
  hashTitulo,
  iconePorTitulo,
} from "./estilo-card"

describe("corPorTitulo", () => {
  it("devolve sempre a mesma cor para o mesmo título", () => {
    expect(corPorTitulo("Faturamento").cor).toBe(corPorTitulo("Faturamento").cor)
    expect(corPorTitulo("Contas Pagas").cor).toBe(corPorTitulo("Contas Pagas").cor)
  })

  it("ignora caixa e espaços na definição da cor", () => {
    expect(corPorTitulo("  contas pagas ").cor).toBe(corPorTitulo("Contas Pagas").cor)
  })

  it("usa apenas cores do tema Dracula", () => {
    for (const titulo of [
      "Faturamento",
      "Contas Pagas",
      "Descontos",
      "Devoluções",
      "Estornos",
      "Custos Administrativos Mensal",
      "Média – Custo administrativo 12 meses",
      "Contas a Receber Programado",
      "Contas a Pagar Programado",
    ]) {
      expect(CORES_DRACULA).toContain(corPorTitulo(titulo).cor)
    }
  })

  it("gera fundo, borda e badge a partir da cor escolhida", () => {
    const estilo = corPorTitulo("Faturamento")

    expect(estilo.fundoClaro).toContain("linear-gradient")
    // Dracula background #282a36 = rgb(40, 42, 54)
    expect(estilo.fundoEscuro).toContain("rgba(40, 42, 54")
    expect(estilo.borda.startsWith("rgba(")).toBe(true)
    expect(estilo.fundoIcone.startsWith("rgba(")).toBe(true)
  })

  it("colors diferentes para títulos diferentes", () => {
    const cores = new Set(
      ["Faturamento", "Contas Pagas", "Descontos", "Devoluções", "Estornos"].map(
        (t) => corPorTitulo(t).cor
      )
    )
    expect(cores.size).toBeGreaterThan(1)
  })
})

describe("hashTitulo", () => {
  it("é estável e não depende de caixa", () => {
    expect(hashTitulo("Contas Pagas")).toBe(hashTitulo("contas pagas"))
    expect(hashTitulo("Contas Pagas")).not.toBe(hashTitulo("Contas a Pagar"))
  })
})

describe("iconePorTitulo", () => {
  it("escolhe um ícone representativo pelo título", () => {
    expect(iconePorTitulo("Faturamento")).toBeDefined()
    expect(iconePorTitulo("Contas a Receber Programado")).toBeDefined()
    expect(iconePorTitulo("Contas a Pagar Programado")).toBeDefined()
    expect(iconePorTitulo("Custos Administrativos Mensal")).toBeDefined()
    expect(iconePorTitulo("Descontos")).toBeDefined()
    expect(iconePorTitulo("Devoluções")).toBeDefined()
    expect(iconePorTitulo("Estornos")).toBeDefined()
  })

  it("mantém o mesmo ícone para o mesmo título", () => {
    expect(iconePorTitulo("Contas Pagas")).toBe(iconePorTitulo("Contas Pagas"))
  })
})
