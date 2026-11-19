// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn() } }))
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue({ id: "ok" }) }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

describe("POST /api/crm/acoes-prospeccao/lembretes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autoriza��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await POST(new NextRequest("http://localhost/api/crm/acoes-prospeccao/lembretes?tipo=dia-da-acao", { method: "POST" }))
    expect(res.status).toBe(401)
  })

  it("retorna 400 para tipo inv�lido", async () => {
    const res = await POST(new NextRequest("http://localhost/api/crm/acoes-prospeccao/lembretes?tipo=invalido", { method: "POST" }))
    expect(res.status).toBe(400)
  })

  it("processa lembretes quando n�o h� a��es pendentes", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([]))
    const res = await POST(new NextRequest("http://localhost/api/crm/acoes-prospeccao/lembretes?tipo=dia-da-acao", { method: "POST" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, tipo: "dia-da-acao", total: 0, enviados: 0, erros: 0 })
  })
})
