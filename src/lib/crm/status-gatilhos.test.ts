// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { registrarLog } from "@/lib/log"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { executarGatilhos } from "./status-gatilhos"

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))
vi.mock("@/lib/log", () => ({ registrarLog: vi.fn() }))

const contexto = {
  tipo: "OPORTUNIDADE" as const,
  statusNome: "FECHADO_GANHO",
  statusAnterior: "NEGOCIACAO",
  oportunidadeId: 10,
  empresaId: 4,
  responsavelId: 2,
  titulo: "Venda de malha",
  usuarioNome: "Tiago",
}

describe("executarGatilhos", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(registrarLog).mockReset()
  })

  it("não executa nada quando o status não existe no cadastro", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await executarGatilhos(contexto)

    expect(resultado).toEqual({ executadas: [], erros: [] })
  })

  it("cria pedido de venda quando o status tem o gatilho configurado", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([{ id: 7 }]))
      .mockReturnValueOnce(
        createQueryBuilder([
          { id: 1, statusId: 7, acao: "CRIAR_PEDIDO_VENDA", parametros: {}, ativo: true },
        ])
      )
    vi.mocked(db.insert).mockReturnValueOnce(createQueryBuilder([{ id: 33 }]))

    const resultado = await executarGatilhos(contexto)

    expect(resultado.executadas).toEqual(["CRIAR_PEDIDO_VENDA"])
    expect(resultado.erros).toEqual([])
    expect(vi.mocked(db.insert).mock.calls[0][0]).toBeDefined()
    expect(registrarLog).toHaveBeenCalledWith(
      expect.objectContaining({ descricao: expect.stringContaining("Pedido de venda #33") })
    )
  })

  it("ignora gatilhos inativos e ações desconhecidas", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([{ id: 7 }]))
      .mockReturnValueOnce(
        createQueryBuilder([
          { id: 1, statusId: 7, acao: "VIRAR_CLIENTE", parametros: {}, ativo: false },
          { id: 2, statusId: 7, acao: "ACAO_DESCONHECIDA", parametros: {}, ativo: true },
        ])
      )

    const resultado = await executarGatilhos(contexto)

    expect(resultado.executadas).toEqual([])
    expect(db.insert).not.toHaveBeenCalled()
  })

  it("registra o erro de uma ação sem interromper as demais", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([{ id: 7 }]))
      .mockReturnValueOnce(
        createQueryBuilder([
          { id: 1, statusId: 7, acao: "NOTIFICAR_RESPONSAVEL", parametros: {}, ativo: true },
          { id: 2, statusId: 7, acao: "REGISTRAR_TIMELINE", parametros: {}, ativo: true },
        ])
      )
    vi.mocked(db.insert)
      .mockReturnValueOnce({
        values: () => {
          throw new Error("falha ao notificar")
        },
      })
      .mockReturnValueOnce(createQueryBuilder([{ id: 5 }]))

    const resultado = await executarGatilhos(contexto)

    expect(resultado.erros).toEqual(["NOTIFICAR_RESPONSAVEL"])
    expect(resultado.executadas).toEqual(["REGISTRAR_TIMELINE"])
  })
})
