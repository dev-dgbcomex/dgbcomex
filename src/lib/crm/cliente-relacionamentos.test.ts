// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

import { db } from "@/lib/db"
import { createQueryBuilder } from "@/test/route-db-mock"
import {
  clienteIdDaPessoa,
  idsContatosDoCliente,
  idsPessoasDoCliente,
} from "./cliente-relacionamentos"

describe("cliente-relacionamentos", () => {
  beforeEach(() => {
    ;(db as any).select = vi.fn()
  })

  it("lista as pessoas promovidas do cliente", async () => {
    ;(db as any).select = vi.fn(() => createQueryBuilder([{ id: 7 }, { id: 9 }]))
    const ids = await idsPessoasDoCliente(5)
    expect(ids).toEqual([7, 9])
  })

  it("lista os contatos do cliente e os das pessoas promovidas", async () => {
    const select = vi.fn()
    ;(db as any).select = select
    select.mockImplementationOnce(() => createQueryBuilder([{ id: 7 }]))
    select.mockImplementationOnce(() => createQueryBuilder([{ id: 100 }, { id: 101 }]))

    const ids = await idsContatosDoCliente(5)
    expect(ids).toEqual([100, 101])
  })

  it("devolve o cliente da pessoa promovida", async () => {
    ;(db as any).select = vi.fn(() => createQueryBuilder([{ clienteId: 5 }]))
    expect(await clienteIdDaPessoa(7)).toBe(5)
  })

  it("devolve null quando a pessoa ainda não é cliente", async () => {
    ;(db as any).select = vi.fn(() => createQueryBuilder([{ clienteId: null }]))
    expect(await clienteIdDaPessoa(7)).toBeNull()
    expect(await clienteIdDaPessoa(null)).toBeNull()
  })
})
