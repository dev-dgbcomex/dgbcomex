// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), execute: vi.fn() } }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

describe("POST /api/crm/acoes-prospeccao/sync-google", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await POST({} as NextRequest)
    expect(res.status).toBe(401)
  })

  it("retorna 400 quando Google Calendar n�o est� configurado", async () => {
    vi.mocked(db.select as any).mockImplementation(() => { throw new Error("relation does not exist") })
    const res = await POST({} as NextRequest)
    expect(res.status).toBe(400)
  })
})
