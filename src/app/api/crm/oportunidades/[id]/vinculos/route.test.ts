// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"
import { registrarLog } from "@/lib/notificar"
import { createQueryBuilder } from "@/test/route-db-mock"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}))
vi.mock("@/lib/erp/cliente", () => ({
  ErroErp: class ErroErp extends Error {
    status: number
    constructor(mensagem: string, status = 500) {
      super(mensagem)
      this.status = status
    }
  },
  requisitarErp: vi.fn(),
}))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn() }))

const sessao = {
  session: { user: { id: "1", role: "CRM", name: "Tiago" } },
  userId: 1,
}

const oportunidade = {
  id: 7,
  titulo: "Venda de malha",
  empresaId: 3,
  empresaNome: "Tecelagem Alpha",
  empresaCnpj: "61.174.572/0001-81",
}

const insercoes: { tabela: unknown; valores: any }[] = []

const pedidoErp = {
  empresa: "13",
  pedido: "00006979",
  cliente_cnpj: "61.174.572/0001-81",
  cliente_nome: "LINOFORTE MOVEIS",
  data_pedido: "2026-10-30",
  status: "2",
  status_pedido: "2",
  total_itens: 1,
  quantidade: 100,
  valor_total: 5200,
  itens: [
    {
      item: 1,
      produto: "MALHA 100% ALGODAO",
      descricao: "Malha",
      situacao: "AZUL",
      cor: "AZUL",
      desenho: "123",
      quantidade: 100,
      metros: 2500,
      unidade: "MT",
      valor_unitario: 52,
      valor_total: 5200,
    },
  ],
}

const faturamentoErp = {
  ...pedidoErp,
  nr_nota: "12756",
  serie: "1",
  data_nota: "2026-10-31",
  data_emissao: "2026-10-31",
  pedido_origem: "00006979",
  status: "S",
  valor_nota: 5200,
}

function post(body: Record<string, unknown>, id = "7") {
  return POST(
    new NextRequest(`http://localhost/api/crm/oportunidades/${id}/vinculos`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
}

function mockSelect(...resultados: any[][]) {
  const fila = [...resultados]
  vi.mocked(db.select).mockImplementation(() => createQueryBuilder(fila.shift() ?? []))
}

function mockTransaction(id = 42) {
  vi.mocked(db.transaction).mockImplementation(async (fn: any) =>
    fn({
      insert: vi.fn((tabela: any) => {
        const builder: any = {
          values: vi.fn((valores: any) => {
            insercoes.push({ tabela, valores })
            return builder
          }),
          returning: vi.fn(() => Promise.resolve([{ id, numero: "00006979" }])),
          then: (resolve: any) => Promise.resolve([]).then(resolve),
        }
        return builder
      }),
      update: vi.fn(() => createQueryBuilder([])),
      select: vi.fn(() => createQueryBuilder([])),
    })
  )
}

describe("POST /api/crm/oportunidades/[id]/vinculos", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(db.select).mockReset()
    vi.mocked(db.transaction).mockReset()
    vi.mocked(registrarLog).mockReset()
    vi.mocked(requireAuth).mockResolvedValue(sessao as any)
    insercoes.length = 0
    mockTransaction()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post({ tipo: "PEDIDO", empresa: "13", pedido: "00006979" })
    expect(res.status).toBe(401)
  })

  it("recusa tipo de vínculo inválido", async () => {
    const res = await post({ tipo: "NOTA", empresa: "13", pedido: "00006979" })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("Tipo de vínculo inválido")
  })

  it("recusa vínculo sem empresa/pedido", async () => {
    const res = await post({ tipo: "PEDIDO", empresa: "13" })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("Empresa e pedido do ERP são obrigatórios")
  })

  it("exige o número da nota no faturamento", async () => {
    const res = await post({ tipo: "FATURAMENTO", empresa: "13", pedido: "00006979" })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("Número da nota é obrigatório")
  })

  it("devolve 404 quando a oportunidade não existe", async () => {
    mockSelect([])
    const res = await post({ tipo: "PEDIDO", empresa: "13", pedido: "00006979" })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Oportunidade não encontrada" })
  })

  it("vincula o pedido do ERP espelhando cabeçalho e itens", async () => {
    mockSelect([oportunidade], [])
    vi.mocked(requisitarErp).mockResolvedValue(pedidoErp as any)

    const res = await post({ tipo: "PEDIDO", empresa: "13", pedido: "00006979" })

    expect(res.status).toBe(201)
    expect(requisitarErp).toHaveBeenCalledWith("/crm/pedidos/13/00006979")

    const cabecalho = insercoes.find((i) => i.valores.oportunidadeId === 7)
    expect(cabecalho).toBeDefined()
    expect(cabecalho!.valores.origem).toBe("ERP")
    expect(cabecalho!.valores.referenciaExterna).toBe("13/00006979")
    expect(cabecalho!.valores.status).toBe("ABERTO")
    expect(cabecalho!.valores.numero).toBe("00006979")
    expect(cabecalho!.valores.observacao).toContain("status ERP: Aprovado")

    const itens = insercoes.find((i) => Array.isArray(i.valores))
    expect(itens).toBeDefined()
    expect(itens!.valores[0]).toMatchObject({
      produto: "MALHA 100% ALGODAO",
      codigo: "MALHA 100% ALGODAO",
      unidade: "METROS",
      quantidade: "100",
      valorTotal: "5200",
    })
    expect(registrarLog).toHaveBeenCalled()
  })

  it("bloqueia documento do ERP já vinculado", async () => {
    mockSelect([oportunidade], [{ id: 9 }])
    vi.mocked(requisitarErp).mockResolvedValue(pedidoErp as any)

    const res = await post({ tipo: "PEDIDO", empresa: "13", pedido: "00006979" })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain("já está vinculado")
  })

  it("vincula o faturamento do ERP", async () => {
    mockSelect([oportunidade], [])
    vi.mocked(requisitarErp).mockResolvedValue(faturamentoErp as any)

    const res = await post({
      tipo: "FATURAMENTO",
      empresa: "13",
      pedido: "00006979",
      nota: "12756",
    })

    expect(res.status).toBe(201)
    expect(requisitarErp).toHaveBeenCalledWith("/crm/faturamentos/13/00006979/12756")
    expect(registrarLog).toHaveBeenCalled()
  })

  it("repassa o erro da api-microdata", async () => {
    mockSelect([oportunidade])
    vi.mocked(requisitarErp).mockRejectedValue(new ErroErp("pedido não encontrado", 404))
    const res = await post({ tipo: "PEDIDO", empresa: "13", pedido: "999" })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "pedido não encontrado" })
  })
})
