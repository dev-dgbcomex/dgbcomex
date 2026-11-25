// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import {
  buscarFaturamentosPorPedido,
  buscarPedidoFaturadoErp,
  buscarPedidosDaNotaErp,
  requisitarErp,
} from "@/lib/erp/cliente"
import type { PedidoErp } from "@/lib/erp/tipos"
import {
  criarOuAtualizarFaturamento,
  garantirPedidoErpVinculado,
} from "@/lib/crm/verificar-pedido-faturado"
import {
  recalcularValorOportunidade,
  somaOportunidade,
} from "@/lib/crm/valor-oportunidade"
import { criarPedidoEspelho, itensParaCrmFaturamento } from "@/lib/crm/erp-espelho"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { registrarLog } from "@/lib/notificar"
import {
  aplicarVinculacaoFaturado,
  previewVincularFaturado,
} from "./vincular-faturado"
import { createQueryBuilder } from "@/test/route-db-mock"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/erp/cliente", () => ({
  requisitarErp: vi.fn(),
  buscarFaturamentosPorPedido: vi.fn(),
  buscarPedidoFaturadoErp: vi.fn(),
  buscarPedidosDaNotaErp: vi.fn(),
}))
vi.mock("@/lib/crm/verificar-pedido-faturado", () => ({
  criarOuAtualizarFaturamento: vi.fn(),
  garantirPedidoErpVinculado: vi.fn(),
}))
vi.mock("@/lib/crm/valor-oportunidade", () => ({
  somaOportunidade: vi.fn(),
  recalcularValorOportunidade: vi.fn(),
}))
vi.mock("@/lib/crm/erp-espelho", () => ({
  criarPedidoEspelho: vi.fn(),
  itensParaCrmFaturamento: vi.fn(() => []),
}))
vi.mock("@/lib/crm/automacoes-crm", () => ({
  processarAutomacaoCRM: vi.fn(),
}))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn() }))

const notasLista = {
  paginacao: { total: 1, pagina: 1, por_pagina: 50, total_paginas: 1 },
  itens: [
    {
      empresa: "13",
      pedido: "013541",
      nr_nota: "012754",
      serie: "1",
      cliente_cnpj: "00.000.000/0001-00",
      cliente_nome: "Cliente Teste",
      data_nota: "2026-11-13",
      data_emissao: "2026-11-13",
      vr_nota: 9162.37,
      soma_itens: 9162.37,
      pedido_origem: "00007046",
      status: "S",
      condicao_pagamento: "A vista",
      valor_nota: 9162.37,
      status_gravado: "2",
      cond_pagto_extenso: "A vista",
      valor_total: 9162.37,
      total_itens: 1,
      quantidade: 10,
    },
  ],
}

const pedidoErp: PedidoErp = {
  empresa: "13",
  pedido: "00007046",
  pedido_origem: "00007046",
  cliente_cnpj: "00.000.000/0001-00",
  cliente_nome: "Cliente Teste",
  data_pedido: "2026-11-13",
  data_entrega: null,
  status: "2",
  status_pedido: "2",
  condicao_pagamento: "A vista",
  representante: null,
  identificador_erp: "013541",
  total_itens: 1,
  quantidade: 10,
  valor_total: 9162.37,
  itens: [
    {
      item: 1,
      produto: "000028",
      descricao: "PRODUTO TESTE",
      quantidade: 10,
      unidade: "UN",
      valor_unitario: 916.237,
      valor_total: 9162.37,
    },
  ],
}

const pedidoErp2 = {
  ...pedidoErp,
  pedido: "00007047",
  pedido_origem: "00007047",
  identificador_erp: "013542",
  valor_total: 1000,
  itens: [],
}

const notaDetalhe = { ...notasLista.itens[0], itens: pedidoErp.itens }

describe("previewVincularFaturado", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(db.select).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(buscarFaturamentosPorPedido).mockReset()
    vi.mocked(buscarPedidosDaNotaErp).mockReset()
    vi.mocked(buscarPedidoFaturadoErp).mockReset()
    vi.mocked(somaOportunidade).mockResolvedValue(0)
    const builder = createQueryBuilder(undefined)
    vi.mocked(db.update).mockReturnValue(builder)
    vi.mocked(db.insert).mockReturnValue(builder)
  })

  it("avisa quando não há faturamento para o pedido", async () => {
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValue({
      paginacao: { total: 0, pagina: 1, por_pagina: 50, total_paginas: 0 },
      itens: [],
    })

    const resultado = await previewVincularFaturado({
      oportunidadeId: 14,
      codigoPedido: "00007046",
    })

    expect(resultado.notas).toHaveLength(0)
    expect(resultado.mensagem).toBe("Não há faturamento no ERP para este pedido.")
    expect(resultado.jaVinculado).toBe(false)
  })

  it("mostra preview da nota e do pedido real do ERP", async () => {
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValueOnce(notasLista)
    vi.mocked(buscarPedidosDaNotaErp).mockResolvedValueOnce(["00007046"])
    vi.mocked(buscarPedidoFaturadoErp).mockResolvedValueOnce(pedidoErp)
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await previewVincularFaturado({
      oportunidadeId: 14,
      codigoPedido: "00007046",
    })

    expect(resultado.notas).toHaveLength(1)
    expect(resultado.notas[0].nr_nota).toBe("012754")
    expect(resultado.notas[0].valorTotal).toBe(9162.37)
    expect(resultado.pedidosErp).toHaveLength(1)
    expect(resultado.pedidosErp[0].pedido).toBe("00007046")
    expect(resultado.valorPedido).toBe(9162.37)
    expect(resultado.jaVinculado).toBe(false)
    expect(resultado.mensagem).toBeNull()
    expect(vi.mocked(buscarFaturamentosPorPedido)).toHaveBeenCalledWith("00007046")
    expect(vi.mocked(requisitarErp)).not.toHaveBeenCalled()
    expect(vi.mocked(buscarPedidosDaNotaErp)).toHaveBeenCalledWith(
      "13",
      "00007046",
      "012754"
    )
    expect(vi.mocked(buscarPedidoFaturadoErp)).toHaveBeenCalledWith("13", "00007046")
  })

  it("mostra todos os pedidos de uma nota com múltiplos pedidos", async () => {
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValueOnce(notasLista)
    vi.mocked(buscarPedidosDaNotaErp).mockResolvedValueOnce(["00007046", "00007047"])
    vi.mocked(buscarPedidoFaturadoErp)
      .mockResolvedValueOnce(pedidoErp)
      .mockResolvedValueOnce(pedidoErp2)
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await previewVincularFaturado({
      oportunidadeId: 14,
      codigoPedido: "00007046",
    })

    expect(resultado.pedidosErp.map((pedido) => pedido.pedido)).toEqual([
      "00007046",
      "00007047",
    ])
    expect(resultado.valorPedido).toBe(10162.37)
    expect(resultado.mensagem).toBe("Esta nota fatura 2 pedidos; todos serão vinculados.")
  })

  it("avisa quando um dos pedidos já vinculado a outra oportunidade", async () => {
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValueOnce(notasLista)
    vi.mocked(buscarPedidosDaNotaErp).mockResolvedValueOnce(["00007046"])
    vi.mocked(buscarPedidoFaturadoErp).mockResolvedValueOnce(pedidoErp)
    vi.mocked(db.select).mockReturnValueOnce(
      createQueryBuilder([
        {
          id: 5,
          numero: "00007046",
          referenciaExterna: "13/00007046",
          oportunidadeId: 99,
        },
      ])
    )

    const resultado = await previewVincularFaturado({
      oportunidadeId: 14,
      codigoPedido: "00007046",
    })

    expect(resultado.jaVinculado).toBe(true)
    expect(resultado.mensagem).toBe(
      "Um dos pedidos do ERP já está vinculado a outra oportunidade."
    )
  })
})

describe("aplicarVinculacaoFaturado", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(db.select).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(buscarFaturamentosPorPedido).mockReset()
    vi.mocked(buscarPedidosDaNotaErp).mockReset()
    vi.mocked(buscarPedidoFaturadoErp).mockReset()
    vi.mocked(garantirPedidoErpVinculado).mockReset()
    vi.mocked(criarOuAtualizarFaturamento).mockReset()
    vi.mocked(somaOportunidade).mockReset()
    vi.mocked(recalcularValorOportunidade).mockReset()
    vi.mocked(processarAutomacaoCRM).mockResolvedValue({ ok: true } as never)
    vi.mocked(registrarLog).mockReset()
    const builder = createQueryBuilder(undefined)
    vi.mocked(db.update).mockReturnValue(builder)
    vi.mocked(db.insert).mockReturnValue(builder)
  })

  it("cria pedido real, processa faturamento e fecha oportunidade", async () => {
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValueOnce(notasLista)
    vi.mocked(requisitarErp).mockResolvedValueOnce(notaDetalhe)
    vi.mocked(buscarPedidosDaNotaErp).mockResolvedValueOnce(["00007046"])
    vi.mocked(buscarPedidoFaturadoErp).mockResolvedValueOnce(pedidoErp)
    vi.mocked(garantirPedidoErpVinculado).mockResolvedValueOnce({
      id: 10,
      numero: "00007046",
      referenciaExterna: "13/00007046",
      valorPedido: 9162.37,
    })
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([{ id: 14, empresaId: 17 }]))
      .mockReturnValueOnce(createQueryBuilder([]))
    vi.mocked(recalcularValorOportunidade).mockResolvedValue(9162.37)
    vi.mocked(criarOuAtualizarFaturamento).mockResolvedValue(100)

    const resultado = await aplicarVinculacaoFaturado({
      oportunidadeId: 14,
      codigoPedido: "00007046",
      nrNota: "012754",
      usuarioNome: "Tiago",
    })

    expect(resultado.pedidoId).toBe(10)
    expect(resultado.valorPedido).toBe(9162.37)
    expect(resultado.valorOportunidade).toBe(9162.37)
    expect(resultado.faturamentoId).toBe(100)
    expect(resultado.status).toBe("FATURADO")
    expect(recalcularValorOportunidade).toHaveBeenCalledWith(14)
    expect(somaOportunidade).not.toHaveBeenCalled()
    expect(vi.mocked(buscarFaturamentosPorPedido)).toHaveBeenCalledWith("00007046")
    expect(vi.mocked(requisitarErp)).toHaveBeenCalledWith("/crm/faturamentos/13/013541/012754")
    expect(vi.mocked(buscarPedidoFaturadoErp)).toHaveBeenCalledWith("13", "00007046")
    expect(vi.mocked(criarPedidoEspelho)).not.toHaveBeenCalled()
    expect(vi.mocked(garantirPedidoErpVinculado)).toHaveBeenCalledWith({
      oportunidadeId: 14,
      empresa: "13",
      pedido: "00007046",
      usuarioNome: "Tiago",
    })
    expect(vi.mocked(criarOuAtualizarFaturamento)).toHaveBeenCalledWith(
      expect.objectContaining({
        oportunidadeId: 14,
        pedidoVendaIds: [10],
        empresa: "13",
        pedido: "013541",
        pedidoReferencia: "00007046",
        pedidoErp: "013541",
        nota: expect.objectContaining({ numero: "012754", valorTotal: 9162.37 }),
      })
    )
  })

  it("vincula todos os pedidos da nota e grava o faturamento N:N", async () => {
    const notaMenor = {
      ...notasLista.itens[0],
      vr_nota: 9000,
      valor_total: 9000,
    }
    vi.mocked(buscarFaturamentosPorPedido).mockResolvedValueOnce({
      ...notasLista,
      itens: [notaMenor],
    })
    vi.mocked(requisitarErp).mockResolvedValueOnce({ ...notaMenor, itens: [] })
    vi.mocked(buscarPedidosDaNotaErp).mockResolvedValueOnce(["00007046", "00007047"])
    vi.mocked(buscarPedidoFaturadoErp)
      .mockResolvedValueOnce(pedidoErp)
      .mockResolvedValueOnce(pedidoErp2)
    vi.mocked(garantirPedidoErpVinculado)
      .mockResolvedValueOnce({
        id: 10,
        numero: "00007046",
        referenciaExterna: "13/00007046",
        valorPedido: 9162.37,
      })
      .mockResolvedValueOnce({
        id: 11,
        numero: "00007047",
        referenciaExterna: "13/00007047",
        valorPedido: 1000,
      })
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([{ id: 14, empresaId: null }]))
      .mockReturnValueOnce(createQueryBuilder([]))
    vi.mocked(recalcularValorOportunidade).mockResolvedValue(0)
    vi.mocked(criarOuAtualizarFaturamento).mockResolvedValue(101)

    const resultado = await aplicarVinculacaoFaturado({
      oportunidadeId: 14,
      codigoPedido: "00007046",
      nrNota: "012754",
      usuarioNome: "Tiago",
    })

    expect(resultado.pedidos.map((pedido) => pedido.id)).toEqual([10, 11])
    expect(resultado.valorPedido).toBe(10162.37)
    expect(resultado.status).toBe("PARCIAL")
    expect(recalcularValorOportunidade).toHaveBeenCalledWith(14)
    expect(garantirPedidoErpVinculado).toHaveBeenCalledTimes(2)
    expect(vi.mocked(criarOuAtualizarFaturamento)).toHaveBeenCalledWith(
      expect.objectContaining({ pedidoVendaIds: [10, 11] })
    )
    expect(vi.mocked(registrarLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        dados: expect.objectContaining({ pedidos: [10, 11], status: "PARCIAL" }),
      })
    )
  })
})
