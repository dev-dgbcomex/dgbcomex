// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

function check(id: string, tipo: string, session?: Record<string, unknown>) {
  if (session) vi.mocked(requireAuth).mockResolvedValue(session as any)
  return POST(
    new NextRequest(`http://localhost/api/crm/acoes-prospeccao/${id}/check`, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    }),
    { params: Promise.resolve({ id }) }
  )
}

describe("POST /api/crm/acoes-prospeccao/[id]/check", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await check("1", "check_in")
    expect(res.status).toBe(401)
  })

  it("retorna 400 para tipo inválido", async () => {
    const res = await check("1", "foo")
    expect(res.status).toBe(400)
  })

  it("retorna 404 se ação não existe", async () => {
    db.select = vi.fn(() => createQueryBuilder([]))
    const res = await check("1", "check_in")
    expect(res.status).toBe(404)
  })

  it("retorna 403 para perfil comum em ação de outro usuário", async () => {
    db.select = vi.fn(() =>
      createQueryBuilder([{ id: 1, criadoPor: 99, status: "AGENDADA", checkInTime: null }])
    )
    const res = await check("1", "check_in", {
      session: { user: { id: "2", role: "GERENTE" } },
      userId: 2,
    })
    expect(res.status).toBe(403)
  })

  it.each(["COMERCIAL", "CRM"])("perfil %s faz check-in em ação de outro usuário", async (role) => {
    db.select = vi.fn(() =>
      createQueryBuilder([{ id: 1, criadoPor: 99, status: "AGENDADA", checkInTime: null }])
    )
    db.update = vi.fn(() =>
      createQueryBuilder([{ id: 1, status: "EM_ANDAMENTO", checkInTime: new Date() }])
    )

    const res = await check("1", "check_in", {
      session: { user: { id: "2", role, name: "Ana" } },
      userId: 2,
    })

    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe("EM_ANDAMENTO")
    expect(db.update).toHaveBeenCalled()
  })
})
