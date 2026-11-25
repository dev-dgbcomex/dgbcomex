// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { atualizarEspelhosErp } from "@/lib/crm/erp-espelho"
import {
  recalcularValorOportunidade,
  somaOportunidade,
} from "@/lib/crm/valor-oportunidade"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { registrarLog } from "@/lib/notificar"
import { buscarFaturamentosPorPedido, requisitarErp } from "@/lib/erp/cliente"
import {
  aplicarVerificacaoPedidoFaturado,
  verificarPedidoFaturado,
} from "./verificar-pedido-faturado"
import { createQueryBuilder } from "@/test/route-db-mock"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/crm/erp-espelho", () => ({
  atualizarEspelhosErp: vi.fn(),
  itensParaCrm: vi.fn(),
  itensParaCrmFaturamento: vi.fn(),
  criarPedidoEspelho: vi.fn(),
}))
vi.mock("@/lib/crm/valor-oportunidade", () => ({
  somaOportunidade: vi.fn(),
  recalcularValorOportunidade: vi.fn(),
}))
vi.mock("@/lib/crm/automacoes-crm", () => ({ processarAutomacaoCRM: vi.fn() }))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn() }))
vi.mock("@/lib/erp/cliente", () => ({
  requisitarErp: vi.fn(),
  buscarFaturamentosPorPedido: vi.fn(),
  buscarPedidosDaNotaErp: vi.fn(),
  buscarPedidoFaturadoErp: vi.fn(),
}))

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
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValue({
      paginacao: { total: 1, pagina: 1, por_pagina: 50, total_paginas: 1 },
      itens: [
        {
          empresa: "13",
          pedido: "013618",
          nr_nota: "001234",
          serie: "1",
          cliente_cnpj: "00.000.000/0001-00",
          cliente_nome: null,
          data_nota: "2026-11-20",
          data_emissao: "2026-11-20",
          pedido_origem: "00007075",
          status: "S",
          condicao_pagamento: null,
          valor_nota: 58782,
          total_itens: 1,
          quantidade: 1,
          valor_total: 58782,
        },
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
    expect(vi.mocked(buscarFaturamentosPorPedido)).toHaveBeenCalledWith("00007075")
  })

  it("recalcula o valor de cada oportunidade ao aplicar a verificação", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([sessionPedido]))
      .mockReturnValueOnce(createQueryBuilder([{ id: 9, empresaId: null }]))
      .mockReturnValueOnce(createQueryBuilder(itensVazios))
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValueOnce({
      paginacao: { total: 0, pagina: 1, por_pagina: 50, total_paginas: 0 },
      itens: [],
    })
    vi.mocked(recalcularValorOportunidade).mockResolvedValue(1250)
    vi.mocked(somaOportunidade).mockResolvedValue(1250)
    vi.mocked(processarAutomacaoCRM).mockResolvedValue({ ok: true } as never)

    const resultado = await aplicarVerificacaoPedidoFaturado({
      pedidoIds: [1],
      autor: { nome: "Tiago" },
    })

    expect(recalcularValorOportunidade).toHaveBeenCalledWith(9)
    expect(somaOportunidade).toHaveBeenCalledWith(9)
    expect(processarAutomacaoCRM).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "OPORTUNIDADE",
        entidadeId: 9,
        statusNovo: "FECHADO_GANHO",
        valorEstimado: 1250,
      })
    )
    expect(resultado).toMatchObject({
      oportunidadeId: 9,
      valorOportunidade: 1250,
      oportunidades: [{ oportunidadeId: 9, valorEstimado: 1250 }],
    })
  })
})
