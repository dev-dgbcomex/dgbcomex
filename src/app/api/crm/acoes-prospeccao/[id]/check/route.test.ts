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

describe("POST /api/crm/acoes-prospeccao/[id]/check", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any
    )
    const res = await POST(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/check", {
        method: "POST",
        body: JSON.stringify({ tipo: "check_in" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    )
    expect(res.status).toBe(401)
  })

  it("retorna 400 para tipo inv�lido", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/check", {
        method: "POST",
        body: JSON.stringify({ tipo: "foo" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    )
    expect(res.status).toBe(400)
  })

  it("retorna 404 se a��o n�o existe", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([]))
    const res = await POST(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/check", {
        method: "POST",
        body: JSON.stringify({ tipo: "check_in" }),
      }),
      { params: Promise.resolve({ id: "1" }) }
    )
    expect(res.status).toBe(404)
  })
})
