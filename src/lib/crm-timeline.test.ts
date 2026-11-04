// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: { insert: vi.fn() } }))

import { db } from "@/lib/db"
import { createQueryBuilder } from "@/test/route-db-mock"
import { inserirTimelineEvento } from "./crm-timeline"

describe("inserirTimelineEvento", () => {
  beforeEach(() => {
    ;(db as any).insert = vi.fn(() => createQueryBuilder([]))
  })

  it("não grava evento sem pessoa nem cliente", async () => {
    await inserirTimelineEvento({ tipo: "OPORTUNIDADE", descricao: "Sem vínculo" })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it("grava o evento do cliente", async () => {
    await inserirTimelineEvento({
      clienteId: 5,
      tipo: "OPORTUNIDADE",
      descricao: "Oportunidade criada",
    })

    const builder = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value
    const valores = builder.values.mock.calls[0][0]
    expect(valores.clienteId).toBe(5)
    expect(valores.empresaId).toBeNull()
  })

  it("grava o evento da pessoa e do cliente", async () => {
    await inserirTimelineEvento({
      empresaId: 7,
      clienteId: 5,
      tipo: "CONVERSAO_CLIENTE",
      descricao: "Virou cliente",
    })

    const builder = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value
    const valores = builder.values.mock.calls[0][0]
    expect(valores.empresaId).toBe(7)
    expect(valores.clienteId).toBe(5)
  })
})
