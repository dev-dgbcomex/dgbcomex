// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { registrarLog } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn() }))

const session = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  vi.mocked(requireAuth).mockReset()
  vi.mocked(registrarLog).mockReset()
  resetDb(db)
  vi.mocked(requireAuth).mockResolvedValue(session as never)
})

describe("POST /api/clientes", () => {
  it("rejeita CNPJ com menos de 14 dígitos", async () => {
    const res = await post({ nome: "Empresa", cnpj: "123" })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "CNPJ deve ter 14 dígitos" })
  })

  it("salva CNPJ pontuado quando recebe apenas dígitos", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([]) as never)
    const insertBuilder = createQueryBuilder(undefined)
    insertBuilder.returning = vi.fn(() =>
      Promise.resolve([{ id: 17, nome: "Conforto Prime", cnpj: "47.646.133/0001-01" }])
    )
    vi.mocked(db.insert).mockReturnValue(insertBuilder as never)

    const res = await post({ nome: "Conforto Prime", cnpj: "47646133000101" })
    expect(res.status).toBe(201)
    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({ cnpj: "47.646.133/0001-01" })
    )
  })

  it("bloqueia CNPJ duplicado com pontuação diferente", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([{ id: 19 }]) as never)

    const res = await post({ nome: "Duplicata", cnpj: "47646133000101" })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "CNPJ já cadastrado" })
  })
})
