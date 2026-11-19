// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

describe("/api/crm/acoes-prospeccao/[id]/localizacoes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("GET retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/localizacoes"), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(401)
  })

  it("GET lista localiza��es", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([{ id: 1, latitude: -16.8 }]))
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/localizacoes"), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(1)
  })

  it("POST retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await POST(new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/localizacoes", { method: "POST", body: JSON.stringify({ latitude: 1, longitude: 2 }) }), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(401)
  })

  it("POST valida latitude/longitude", async () => {
    const res = await POST(new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/localizacoes", { method: "POST", body: JSON.stringify({ latitude: null, longitude: 2 }) }), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(400)
  })

  it("POST cria localiza��o", async () => {
    ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([{ id: 10, latitude: -16.8, longitude: -49.2 }]))
    const res = await POST(new NextRequest("http://localhost/api/crm/acoes-prospeccao/1/localizacoes", { method: "POST", body: JSON.stringify({ latitude: -16.8, longitude: -49.2 }) }), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe(10)
  })
})
