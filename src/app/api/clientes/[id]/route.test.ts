// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { registrarLog } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { DELETE, PUT } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: { transaction: vi.fn(), select: vi.fn(), update: vi.fn() },
}))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

function del(id: string) {
  return DELETE(new NextRequest(`http://localhost/api/clientes/${id}`), {
    params: Promise.resolve({ id }),
  })
}

function put(body: Record<string, unknown>) {
  return PUT(
    new NextRequest("http://localhost/api/clientes/5", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "5" }) }
  )
}

function txMock() {
  return {
    delete: vi.fn(() => createQueryBuilder(undefined)),
    update: vi.fn(() => createQueryBuilder(undefined)),
    execute: vi.fn(() => createQueryBuilder(undefined)),
  }
}

describe("DELETE /api/clientes/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(registrarLog).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    vi.mocked(registrarLog).mockResolvedValue(undefined as any)
    db.select = vi.fn(() => createQueryBuilder([{ nome: "TecMais Ltda" }]))
    db.transaction = vi.fn((cb: any) => cb(txMock()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await del("5")
    expect(res.status).toBe(401)
  })

  it("retorna 403 para perfil comum", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "GERENTE" } },
      userId: 2,
    } as any)
    const res = await del("5")
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Sem permissão para excluir" })
  })

  it.each(["COMERCIAL", "CRM"])("perfil %s exclui cliente", async (role) => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role, name: "Ana" } },
      userId: 2,
    } as any)
    const res = await del("5")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.transaction).toHaveBeenCalled()
  })

  it("exclui o cliente e desvincula referências em transação", async () => {
    const res = await del("5")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.transaction).toHaveBeenCalled()
    expect(registrarLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "CrmCliente",
        entidadeId: 5,
        descricao: "Cliente excluído: TecMais Ltda",
      })
    )
  })

  it("propaga erro quando a exclusão falha", async () => {
    db.transaction = vi.fn(() => {
      throw new Error("fk violation")
    })
    const res = await del("5")
    expect(res.status).toBe(500)
  })
})

describe("PUT /api/clientes/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(registrarLog).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    vi.mocked(registrarLog).mockResolvedValue(undefined as any)
  })

  it("salva o status informado na edição", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([{ id: 5 }]) as never)
    const updateBuilder = createQueryBuilder(undefined)
    updateBuilder.returning = vi.fn(() => Promise.resolve([{ id: 5, nome: "Tecidos Silva" }]))
    vi.mocked(db.update).mockReturnValue(updateBuilder as never)

    const res = await put({ nome: "Tecidos Silva", cnpj: "47646133000101", status: "INATIVO" })

    expect(res.status).toBe(200)
    expect(updateBuilder.set).toHaveBeenCalledWith(expect.objectContaining({ status: "INATIVO" }))
  })
})
