// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { corDaPrioridade, rotuloDaPrioridade } from "./kanban"

describe("Kanban WMS — prioridade por posição", () => {
  it("pinta de vermelho o topo (5%) da coluna", () => {
    expect(corDaPrioridade(0, 20)).toBe("bg-red-500")
    expect(rotuloDaPrioridade(0, 20)).toBe("Prioridade alta")
  })

  it("pinta de amarelo o meio da coluna", () => {
    expect(corDaPrioridade(5, 20)).toBe("bg-amber-400")
    expect(rotuloDaPrioridade(5, 20)).toBe("Prioridade média")
  })

  it("pinta de verde o final da coluna", () => {
    expect(corDaPrioridade(19, 20)).toBe("bg-emerald-500")
    expect(rotuloDaPrioridade(19, 20)).toBe("Prioridade baixa")
  })

  it("o primeiro card é sempre vermelho mesmo em colunas pequenas", () => {
    expect(corDaPrioridade(0, 3)).toBe("bg-red-500")
    expect(corDaPrioridade(1, 3)).toBe("bg-amber-400")
    expect(corDaPrioridade(2, 3)).toBe("bg-emerald-500")
  })
})
