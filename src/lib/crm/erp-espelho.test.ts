// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { requisitarErp } from "@/lib/erp/cliente"
import { registrarLog } from "@/lib/log"
import { createQueryBuilder } from "@/test/route-db-mock"
import { atualizarEspelhosErp } from "./erp-espelho"

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}))
vi.mock("@/lib/erp/cliente", () => ({ requisitarErp: vi.fn() }))
vi.mock("@/lib/log", () => ({ registrarLog: vi.fn() }))

const pedido = {
  id: 10,
  oportunidadeId: 7,
  numero: "00006979",
  dataEmissao: "2026-10-30",
  status: "ABERTO",
  observacao: "Pedido vinculado do ERP (13/00006979) · cliente ANTIGO · status ERP: Em análise",
  origem: "ERP",
  referenciaExterna: "13/00006979",
}

const itemAtual = {
  id: 100,
  pedidoVendaId: 10,
  produto: "MALHA ANTIGA",
  codigo: "000001",
  unidade: "METROS",
  quantidade: "10",
  valorUnitario: "50",
  valorTotal: "500",
}

const documento = {
  empresa: "13",
  pedido: "00006979",
  cliente_nome: "LINOFORTE MOVEIS",
  data_pedido: "2026-10-30",
  status: "2",
  itens: [
    {
      item: 1,
      produto: "000002",
      quantidade: 20,
      unidade: "MT",
      valor_unitario: 50,
      valor_total: 1000,
    },
    {
      item: 2,
      produto: "000003",
      quantidade: 5,
      unidade: "MT",
      valor_unitario: 80,
      valor_total: 400,
    },
  ],
}

const itensAtuaisIguais = [
  {
    id: 101,
    pedidoVendaId: 10,
    produto: "000002",
    codigo: "000002",
    unidade: "METROS",
    quantidade: "20",
    valorUnitario: "50",
    valorTotal: "1000",
  },
  {
    id: 102,
    pedidoVendaId: 10,
    produto: "000003",
    codigo: "000003",
    unidade: "METROS",
    quantidade: "5",
    valorUnitario: "80",
    valorTotal: "400",
  },
]

const transacao = createQueryBuilder(null)
const tx = {
  update: vi.fn(() => transacao),
  delete: vi.fn(() => transacao),
  insert: vi.fn(() => transacao),
}

function prepararBanco(cabecalho: typeof pedido = pedido, itens = [itemAtual]) {
  vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([pedido]))
  vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder(itens))
  vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([cabecalho]))
  vi.mocked(db.transaction).mockImplementation(async (callback: any) => callback(tx))
}

describe("atualizarEspelhosErp", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(db.transaction).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(registrarLog).mockReset()
    vi.mocked(tx.update).mockClear()
    vi.mocked(tx.delete).mockClear()
    vi.mocked(tx.insert).mockClear()
    vi.mocked(transacao.values).mockClear()
  })

  it("regrava cabeçalho e itens quando o ERP mudou", async () => {
    prepararBanco()
    vi.mocked(requisitarErp).mockResolvedValue(documento as any)

    const resultado = await atualizarEspelhosErp("PEDIDO")

    expect(requisitarErp).toHaveBeenCalledWith("/crm/pedidos-faturados/13/00006979")
    expect(tx.update).toHaveBeenCalledOnce()
    expect(tx.delete).toHaveBeenCalledOnce()
    expect(tx.insert).toHaveBeenCalledOnce()
    const valores = vi.mocked(transacao.values).mock.calls[0][0] as any[]
    expect(valores).toHaveLength(2)
    expect(valores[0]).toEqual(
      expect.objectContaining({
        pedidoVendaId: 10,
        produto: "000002",
        unidade: "METROS",
        quantidade: "20",
      })
    )
    expect(registrarLog).toHaveBeenCalledWith(expect.objectContaining({ acao: "atualizar_erp" }))
    expect(resultado).toEqual({ verificados: 1, atualizados: 1, falhas: 0 })
  })

  it("não grava nada quando o espelho já está atualizado", async () => {
    const igual = {
      ...pedido,
      observacao: "Pedido vinculado do ERP (13/00006979) · cliente LINOFORTE MOVEIS · status ERP: Aprovado",
    }
    prepararBanco(igual, itensAtuaisIguais)
    vi.mocked(requisitarErp).mockResolvedValue(documento as any)

    const resultado = await atualizarEspelhosErp("PEDIDO")

    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.delete).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
    expect(registrarLog).not.toHaveBeenCalled()
    expect(resultado).toEqual({ verificados: 1, atualizados: 0, falhas: 0 })
  })

  it("contabiliza falha sem derrubar a sincronização", async () => {
    prepararBanco()
    vi.mocked(requisitarErp).mockRejectedValue(new Error("ERP fora do ar"))

    const resultado = await atualizarEspelhosErp("PEDIDO")

    expect(tx.update).not.toHaveBeenCalled()
    expect(resultado).toEqual({ verificados: 1, atualizados: 0, falhas: 1 })
  })
})
