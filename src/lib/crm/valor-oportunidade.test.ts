// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { createQueryBuilder } from "@/test/route-db-mock"
import { recalcularValorOportunidade, somaOportunidade } from "./valor-oportunidade"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn() } }))

describe("valor-oportunidade", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(db.update).mockReset()
  })

  it("soma os itens de todos os pedidos da oportunidade", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([{ valorTotal: "100" }, { valorTotal: "25.5" }])
    )

    expect(await somaOportunidade(7)).toBe(125.5)
  })

  it("grava o valor recalculado e a data de atualização", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([{ valorTotal: "100" }, { valorTotal: "25.5" }])
    )
    const builder = createQueryBuilder([])
    vi.mocked(db.update).mockReturnValue(builder)

    const valor = await recalcularValorOportunidade(7)

    expect(valor).toBe(125.5)
    expect(db.update).toHaveBeenCalled()
    expect(builder.set).toHaveBeenCalledWith(
      expect.objectContaining({ valorEstimado: 125.5, updatedAt: expect.any(Date) })
    )
    expect(builder.where).toHaveBeenCalled()
  })

  it("grava zero quando a oportunidade não tem pedidos", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([]))
    const builder = createQueryBuilder([])
    vi.mocked(db.update).mockReturnValue(builder)

    expect(await recalcularValorOportunidade(9)).toBe(0)
    expect(builder.set).toHaveBeenCalledWith(
      expect.objectContaining({ valorEstimado: 0 })
    )
  })
})
