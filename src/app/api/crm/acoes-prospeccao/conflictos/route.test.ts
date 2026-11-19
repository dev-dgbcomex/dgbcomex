// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

describe("GET /api/crm/acoes-prospeccao/conflictos", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao/conflictos?dataAcao=2026-08-10&hora=09:00")
    )
    expect(res.status).toBe(401)
  })

  it("retorna lista vazia sem data/hora", async () => {
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/conflictos"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ conflictos: [] })
  })

  it("consulta conflitos quando data e hora são informados", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      createQueryBuilder([{ id: 2, dataAcao: "2026-08-10", hora: "09:00", tipo: "PRESENCIAL" }])
    )
    const res = await GET(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao/conflictos?dataAcao=2026-08-10&hora=09:00")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.conflictos).toHaveLength(1)
  })
})
