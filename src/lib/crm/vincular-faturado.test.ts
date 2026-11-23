// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { requisitarErp } from "@/lib/erp/cliente"
import {
  criarOuAtualizarFaturamento,
  somaItensPedido,
  somaOportunidade,
} from "@/lib/crm/verificar-pedido-faturado"
import { criarPedidoEspelho, itensParaCrmFaturamento } from "@/lib/crm/erp-espelho"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { registrarLog } from "@/lib/notificar"
import { previewVincularFaturado, aplicarVinculacaoFaturado } from "./vincular-faturado"
import { createQueryBuilder } from "@/test/route-db-mock"

const fetchMock = vi.fn()
globalThis.fetch = fetchMock

vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/erp/cliente", () => ({ requisitarErp: vi.fn() }))
vi.mock("@/lib/crm/verificar-pedido-faturado", () => ({
  criarOuAtualizarFaturamento: vi.fn(),
  somaItensPedido: vi.fn(),
  somaOportunidade: vi.fn(),
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
      nosso_pedido: "00007046",
      status_gravado: "2",
      cond_pagto_extenso: "A vista",
      valor_total: 9162.37,
      total_itens: 1,
      quantidade: 10,
    },
  ],
}

const pedidoErp = {
  empresa: "13",
  pedido: "013541",
  cliente_nome: "Cliente Teste",
  data_pedido: "2026-11-13",
  status: "2",
  itens: [
    { produto: "000028", descricao: "PRODUTO TESTE", unidade: "UN", qtde: 10, vr_unitario: 916.237, vr_total: 9162.37 },
  ],
}

describe("previewVincularFaturado", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.resetAllMocks()
    vi.mocked(db.select).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(somaOportunidade).mockResolvedValue(0)
    const builder = createQueryBuilder(undefined)
    vi.mocked(db.update).mockReturnValue(builder)
    vi.mocked(db.insert).mockReturnValue(builder)
  })

  it("avisa quando não há faturamento para o pedido", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ paginacao: { total: 0, pagina: 1, por_pagina: 50, total_paginas: 0 }, itens: [] }), { status: 200, headers: { "Content-Type": "application/json" } })
    )

    const resultado = await previewVincularFaturado({ oportunidadeId: 14, codigoPedido: "00007046" })

    expect(resultado.notas).toHaveLength(0)
    expect(resultado.mensagem).toBe("Não há faturamento no ERP para este pedido.")
    expect(resultado.jaVinculado).toBe(false)
  })

  it("mostra preview da nota faturada e valor da oportunidade", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(notasLista), { status: 200, headers: { "Content-Type": "application/json" } })
    )
    vi.mocked(requisitarErp).mockResolvedValueOnce(pedidoErp)
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await previewVincularFaturado({ oportunidadeId: 14, codigoPedido: "00007046" })

    expect(resultado.notas).toHaveLength(1)
    expect(resultado.notas[0].nr_nota).toBe("012754")
    expect(resultado.notas[0].valorTotal).toBe(9162.37)
    expect(resultado.pedidoErp?.pedido).toBe("013541")
    expect(resultado.valorPedido).toBe(9162.37)
    expect(resultado.jaVinculado).toBe(false)
    expect(resultado.mensagem).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/crm/erp/faturamentos?pedido_origem=00007046"),
      expect.objectContaining({ cache: "no-store" })
    )
  })

  it("avisa quando pedido já vinculado a outra oportunidade", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(notasLista), { status: 200, headers: { "Content-Type": "application/json" } })
    )
    vi.mocked(requisitarErp).mockResolvedValueOnce(pedidoErp)
    vi.mocked(db.select).mockReturnValueOnce(
      createQueryBuilder([{ id: 5, numero: "00007046", referenciaExterna: "13/00007046", oportunidadeId: 99 }])
    )

    const resultado = await previewVincularFaturado({ oportunidadeId: 14, codigoPedido: "00007046" })

    expect(resultado.jaVinculado).toBe(true)
    expect(resultado.mensagem).toBe("Este pedido do ERP já está vinculado a outra oportunidade.")
  })
})

describe("aplicarVinculacaoFaturado", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(db.select).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(criarPedidoEspelho).mockReset()
    vi.mocked(criarOuAtualizarFaturamento).mockReset()
    vi.mocked(somaOportunidade).mockReset()
    vi.mocked(processarAutomacaoCRM).mockResolvedValue({ ok: true } as any)
    vi.mocked(registrarLog).mockReset()
    const builder = createQueryBuilder(undefined)
    vi.mocked(db.update).mockReturnValue(builder)
    vi.mocked(db.insert).mockReturnValue(builder)
  })

  it("cria pedido, processa faturamento e fecha oportunidade", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(notasLista), { status: 200, headers: { "Content-Type": "application/json" } })
    )
    vi.mocked(requisitarErp)
      .mockResolvedValueOnce(pedidoErp) // pedidoErp for creating pedido espelho
      .mockResolvedValueOnce({ ...notasLista.itens[0], itens: pedidoErp.itens }) // documentoErp for faturamento
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([{ id: 14, empresaId: 17 }])) // oportunidade
      .mockReturnValueOnce(createQueryBuilder([])) // nenhum pedido vinculado
      .mockReturnValueOnce(createQueryBuilder([])) // sem lead
    vi.mocked(criarPedidoEspelho).mockResolvedValue({ id: 10, numero: "00007046", total: 9162.37 })
    vi.mocked(somaOportunidade).mockResolvedValue(9162.37)
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
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/crm/erp/faturamentos?pedido_origem=00007046"),
      expect.objectContaining({ cache: "no-store" })
    )
    expect(vi.mocked(criarPedidoEspelho)).toHaveBeenCalledWith({
      oportunidadeId: 14,
      empresa: "13",
      pedidoReferencia: "00007046",
      pedidoDetalhe: "013541",
      usuarioNome: "Tiago",
    })
    expect(vi.mocked(criarOuAtualizarFaturamento)).toHaveBeenCalledWith(
      expect.objectContaining({
        oportunidadeId: 14,
        pedidoVendaId: 10,
        empresa: "13",
        pedidoReferencia: "00007046",
        nota: expect.objectContaining({ numero: "012754", valorTotal: 9162.37 }),
      })
    )
    expect(resultado.status).toBe("FATURADO")
  })
})
