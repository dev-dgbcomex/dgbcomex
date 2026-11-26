// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { createQueryBuilder } from "@/test/route-db-mock"
import { registrarEventoPedidoVenda } from "./timeline-pedido"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/crm-timeline", () => ({ inserirTimelineEvento: vi.fn() }))

describe("registrarEventoPedidoVenda", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(inserirTimelineEvento).mockReset()
  })

  it("registra o evento com metadados do pedido e da oportunidade", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))

    await registrarEventoPedidoVenda({
      pedidoVendaId: 123,
      oportunidadeId: 9,
      empresaId: 3,
      clienteId: null,
      tipo: "PEDIDO_VENDA",
      descricao: "Pedido PV-001 criado",
      chaveEvento: "pedido-criacao-123",
    })

    expect(inserirTimelineEvento).toHaveBeenCalledWith({
      empresaId: 3,
      clienteId: null,
      tipo: "PEDIDO_VENDA",
      descricao: "Pedido PV-001 criado",
      metadados: {
        pedidoVendaId: 123,
        oportunidadeId: 9,
        chaveEvento: "pedido-criacao-123",
      },
    })
  })

  it("não duplica evento com a mesma chave", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([{ id: 7 }]))

    await registrarEventoPedidoVenda({
      pedidoVendaId: 123,
      empresaId: 3,
      clienteId: null,
      tipo: "PEDIDO_VENDA",
      descricao: "Pedido PV-001 criado",
      chaveEvento: "pedido-criacao-123",
    })

    expect(inserirTimelineEvento).not.toHaveBeenCalled()
  })

  it("resolve empresa e cliente a partir da oportunidade", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([]))
      .mockReturnValueOnce(createQueryBuilder([{ empresaId: 3, clienteId: 4 }]))

    await registrarEventoPedidoVenda({
      pedidoVendaId: 123,
      oportunidadeId: 9,
      tipo: "FATURAMENTO",
      descricao: "Nota 012804 vinculada",
      metadados: { faturamentoId: 45, statusAntigo: "ABERTO", statusNovo: "PARCIAL" },
      chaveEvento: "faturamento-vinculo-45-123",
    })

    expect(inserirTimelineEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: 3,
        clienteId: 4,
        tipo: "FATURAMENTO",
        metadados: expect.objectContaining({
          pedidoVendaId: 123,
          oportunidadeId: 9,
          faturamentoId: 45,
          chaveEvento: "faturamento-vinculo-45-123",
        }),
      })
    )
  })
})
