import { describe, expect, it, vi } from "vitest"

vi.mock("./crm-timeline", () => ({
  excluirTimelineEventosEntidade: vi.fn().mockResolvedValue(undefined),
}))

import { excluirOportunidadeCascade } from "./crm-cascade"
import { crmAcoesProspeccao } from "./db/schema/crm-acoes-prospeccao"

function criarTx() {
  const whereDelete = vi.fn().mockResolvedValue(undefined)
  const whereUpdate = vi.fn().mockResolvedValue(undefined)
  const set = vi.fn(() => ({ where: whereUpdate }))
  const update = vi.fn(() => ({ set }))
  const selecionar = vi.fn(() => ({
    from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
  }))
  const excluir = vi.fn(() => ({ where: whereDelete }))

  return {
    tx: { select: selecionar, delete: excluir, update },
    set,
    whereUpdate,
  }
}

describe("excluirOportunidadeCascade", () => {
  it("desvincula ações de prospecção antes de excluir a oportunidade", async () => {
    const { tx, set, whereUpdate } = criarTx()

    await excluirOportunidadeCascade(tx as any, 3)

    expect(tx.update).toHaveBeenCalledWith(crmAcoesProspeccao)
    expect(set).toHaveBeenCalledWith({ oportunidadeId: null })
    expect(whereUpdate).toHaveBeenCalled()
  })
})
