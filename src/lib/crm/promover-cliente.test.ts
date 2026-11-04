// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() } }))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn() }))
vi.mock("@/lib/crm/notificar-atividade", () => ({ notificarAtividadeComercial: vi.fn() }))
vi.mock("@/lib/crm-timeline", () => ({ inserirTimelineEvento: vi.fn() }))

import { db } from "@/lib/db"
import { registrarLog } from "@/lib/notificar"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { createQueryBuilder } from "@/test/route-db-mock"
import { promoverPessoaParaCliente } from "./promover-cliente"

describe("promoverPessoaParaCliente", () => {
  beforeEach(() => {
    vi.mocked(registrarLog).mockReset()
    vi.mocked(inserirTimelineEvento).mockReset()
    vi.mocked(registrarLog).mockResolvedValue(undefined as any)
    vi.mocked(inserirTimelineEvento).mockResolvedValue(undefined as any)

    const select = vi.fn()
    ;(db as any).select = select

    select
      .mockImplementationOnce(() =>
        createQueryBuilder([
          {
            id: 7,
            nome: "TecMais",
            razaoSocial: "TecMais Ltda",
            nomeFantasia: "TecMais",
            cnpj: "12.345.678/0001-99",
            email: "contato@tecmais.com",
            clienteId: null,
            promovidaCliente: false,
          },
        ])
      )
      .mockImplementationOnce(() => createQueryBuilder([{ total: 2, valor: 8000 }]))
      .mockImplementationOnce(() => createQueryBuilder([{ total: 1, valor: 5000 }]))
      .mockImplementationOnce(() => createQueryBuilder([{ total: 3 }]))
      .mockImplementationOnce(() => createQueryBuilder([]))

    ;(db as any).insert = vi.fn(() =>
      createQueryBuilder([{ id: 5, nome: "TecMais", cnpj: "12.345.678/0001-99" }])
    )

    const update = vi.fn(() => createQueryBuilder([{ id: 7, clienteId: 5 }]))
    ;(db as any).update = update
  })

  it("passa o negócio da pessoa para o cliente", async () => {
    const resultado = await promoverPessoaParaCliente({
      pessoaId: 7,
      usuarioId: 1,
      usuarioNome: "Tiago",
    })

    expect(resultado.clienteId).toBe(5)
    expect(resultado.clienteCriado).toBe(true)
    expect(resultado.resumo.oportunidades).toBe(2)
    expect(resultado.resumo.propostas).toBe(1)
    expect(resultado.resumo.visitas).toBe(3)

    // Atualização da pessoa + o negócio (oportunidades, propostas e visitas)
    const updates = (db.update as ReturnType<typeof vi.fn>).mock.results
    expect(updates).toHaveLength(4)
    for (const resultado of updates.slice(1)) {
      expect(resultado.value.set.mock.calls[0][0]).toEqual({ clienteId: 5 })
    }

    expect(inserirTimelineEvento).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 7, clienteId: 5, tipo: "CONVERSAO_CLIENTE" })
    )

    expect(registrarLog).toHaveBeenCalledWith(
      expect.objectContaining({ entidade: "CrmCliente", entidadeId: 5 })
    )
  })
})
