import { describe, expect, it } from "vitest"
import { chavePedido, ordenarPorPosicao } from "./kanban"

describe("ordem do kanban do WMS", () => {
  it("usa empresa|pedido como chave, igual à salva pela API", () => {
    expect(chavePedido({ empresa: "13", pedido: "00005902" })).toBe("13|00005902")
  })

  it("ordena os itens pela posição salva e mantém o resto no fim", () => {
    const itens = [
      { empresa: "13", pedido: "A" },
      { empresa: "13", pedido: "B" },
      { empresa: "13", pedido: "C" },
    ]
    const ordenados = ordenarPorPosicao(itens, chavePedido, {
      "13|B": 0,
      "13|A": 1,
    })
    expect(ordenados.map((item) => item.pedido)).toEqual(["B", "A", "C"])
  })

  it("mantém a ordem original quando não há posições", () => {
    const itens = [
      { empresa: "13", pedido: "A" },
      { empresa: "13", pedido: "B" },
    ]
    expect(ordenarPorPosicao(itens, chavePedido).map((i) => i.pedido)).toEqual([
      "A",
      "B",
    ])
  })
})
