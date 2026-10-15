import { describe, expect, it } from "vitest"

import { searchRegistry } from "./search-registry"
import { todasTelas } from "./telas-disponiveis"

/**
 * `todasTelas()` alimenta o "selecionar tela" do /perfil/menus e a busca geral.
 * Ela caminha `src/app` no disco, mas na Vercel esse diretorio nao existe no bundle:
 * la, o que sobra e o `searchRegistry`. Por isso o registro e a garantia real — sem
 * ele a tela some do seletor de telas em producao, enquanto em dev aparece.
 */
describe("telas disponiveis", () => {
  it("a tela de disponibilidade vem do registro, que e o que existe na Vercel", () => {
    const noRegistro = searchRegistry.find((item) => item.href === "/comercial/disponibilidade")

    expect(noRegistro).toBeDefined()
    expect(noRegistro?.module).toBe("Comercial")
    expect(noRegistro?.label).toBe("Disponibilidade")
  })

  it("a tela de disponibilidade aparece para escolher", () => {
    const tela = todasTelas().find((item) => item.href === "/comercial/disponibilidade")

    expect(tela).toBeDefined()
    expect(tela?.label).toBe("Disponibilidade")
  })

  it("todo item do registro tem id unico", () => {
    const ids = searchRegistry.map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  // Existem 8 hrefs repetidas de proposito (a tela e o Kanban dela, mesma URL,
  // com rotulos diferentes). O que nao pode e a tela nova entrar nessa conta.
  it("a tela de disponibilidade nao repete href", () => {
    const repetidas = searchRegistry.filter((item) => item.href === "/comercial/disponibilidade")

    expect(repetidas).toHaveLength(1)
  })

  it("toda tela do registro tem rotulo, descricao e modulo", () => {
    const invalidas = searchRegistry.filter(
      (item) => !item.label || !item.href || !item.module || !item.description
    )

    expect(invalidas.map((item) => item.id)).toEqual([])
  })
})
