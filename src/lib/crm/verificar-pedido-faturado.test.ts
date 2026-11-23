// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { atualizarEspelhosErp } from "@/lib/crm/erp-espelho"
import { requisitarErp } from "@/lib/erp/cliente"
import { verificarPedidoFaturado } from "./verificar-pedido-faturado"
import { createQueryBuilder } from "@/test/route-db-mock"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/crm/erp-espelho", () => ({
  atualizarEspelhosErp: vi.fn(),
  itensParaCrm: vi.fn(),
}))
vi.mock("@/lib/erp/cliente", () => ({ requisitarErp: vi.fn() }))

const sessionPedido = {
  id: 1,
  numero: "00007075",
  referenciaExterna: "13/00007075",
  oportunidadeId: 9,
  oportunidadeTitulo: "ORÇAMENTO UG",
  leadId: 17,
  leadNome: "U G INDUSTRIA DE COLCHOES DA AMAZONIA LTDA",
  jaConvertida: false,
}

const itensVazios: any[] = []

describe("verificarPedidoFaturado", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(db.select).mockReset()
    vi.mocked(atualizarEspelhosErp).mockResolvedValue({
      verificados: 1,
      atualizados: 0,
      falhas: 0,
    })
    vi.mocked(requisitarErp).mockResolvedValue({
      paginacao: { total: 1, pagina: 1, por_pagina: 50, total_paginas: 1 },
      itens: [
        { nr_nota: "001234", data_nota: "2026-11-20", valor_total: 58782 },
      ],
    })
  })

  it("avisa quando não há pedido vinculado", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await verificarPedidoFaturado(undefined, 9)

    expect(resultado.pedidos).toHaveLength(0)
    expect(resultado.mensagem).toBe(
      "Vincule ou lance um pedido com o mesmo número de pedido do ERP."
    )
  })

  it("faz preview do pedido vinculado com nota do ERP", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([sessionPedido]))
      .mockReturnValueOnce(createQueryBuilder(itensVazios))
      .mockReturnValueOnce(createQueryBuilder(itensVazios))

    const resultado = await verificarPedidoFaturado([1], undefined)

    expect(resultado.pedidos).toHaveLength(1)
    const pedido = resultado.pedidos[0]
    expect(pedido.pedidoId).toBe(1)
    expect(pedido.numero).toBe("00007075")
    expect(pedido.oportunidadeTitulo).toBe("ORÇAMENTO UG")
    expect(pedido.valorAntes).toBe(0)
    expect(pedido.valorDepois).toBe(0)
    expect(pedido.nota).toMatchObject({ numero: "001234" })
    expect(pedido.statusSugerido).toBe("FATURADO")
    expect(pedido.semNota).toBe(false)
    expect(resultado.mensagem).toBeNull()
    expect(vi.mocked(atualizarEspelhosErp)).toHaveBeenCalledWith("PEDIDO")
    expect(vi.mocked(requisitarErp)).toHaveBeenCalledWith(
      expect.stringContaining("/crm/faturamentos?pedido_origem=")
    )
  })
})
