// @vitest-environment node
import { describe, expect, it } from "vitest"
import { planejarBackfillStatusPedidos } from "./backfill-status-pedidos"

describe("planejarBackfillStatusPedidos", () => {
  it("marca como FATURADO quando os faturamentos cobrem o pedido", () => {
    const planos = planejarBackfillStatusPedidos(
      [{ id: 7, status: "ABERTO", totalPedido: "1000.00" }],
      [{ id: 3, pedidoVendaId: 7, status: "EMITIDO", valorTotal: "1000.00" }]
    )

    expect(planos).toEqual([
      {
        pedidoVendaId: 7,
        statusAtual: "ABERTO",
        statusNovo: "FATURADO",
        totalPedido: 1000,
        totalFaturado: 1000,
        faturamentoIds: [3],
      },
    ])
  })

  it("marca como PARCIAL quando o total faturado é menor", () => {
    const planos = planejarBackfillStatusPedidos(
      [{ id: 8, status: null, totalPedido: 1000 }],
      [
        { id: 4, pedidoVendaId: 8, status: "EMITIDO", valorTotal: 400 },
        { id: 5, pedidoVendaId: 8, status: "RECEBIDO", valorTotal: 100 },
      ]
    )

    expect(planos).toMatchObject([
      { pedidoVendaId: 8, statusNovo: "PARCIAL", totalFaturado: 500, faturamentoIds: [4, 5] },
    ])
  })

  it("preserva cancelamentos e status já resolvidos", () => {
    const planos = planejarBackfillStatusPedidos(
      [
        { id: 1, status: "CANCELADO", totalPedido: 100 },
        { id: 2, status: "FATURADO", totalPedido: 100 },
        { id: 3, status: "PARCIAL", totalPedido: 100 },
      ],
      [
        { id: 10, pedidoVendaId: 1, status: "EMITIDO", valorTotal: 100 },
        { id: 11, pedidoVendaId: 2, status: "EMITIDO", valorTotal: 100 },
        { id: 12, pedidoVendaId: 3, status: "EMITIDO", valorTotal: 100 },
      ]
    )

    expect(planos).toEqual([])
  })

  it("ignora faturamentos cancelados e pedidos sem faturamento", () => {
    const planos = planejarBackfillStatusPedidos(
      [
        { id: 1, status: "ABERTO", totalPedido: 100 },
        { id: 2, status: "ABERTO", totalPedido: 100 },
      ],
      [{ id: 10, pedidoVendaId: 1, status: "CANCELADO", valorTotal: 100 }]
    )

    expect(planos).toEqual([])
  })

  it("considera centavos ao decidir entre FATURADO e PARCIAL", () => {
    const planos = planejarBackfillStatusPedidos(
      [{ id: 1, status: "ABERTO", totalPedido: 100.005 }],
      [{ id: 10, pedidoVendaId: 1, status: "EMITIDO", valorTotal: 100 }]
    )

    expect(planos).toMatchObject([{ statusNovo: "FATURADO", totalFaturado: 100 }])
  })
})
