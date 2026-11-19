// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

describe("GET /api/crm/acoes-prospeccao/dashboard-lista", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard-lista"))
    expect(res.status).toBe(401)
  })

  it("retorna lista de a��es", async () => {
    const rows = [{ id: 1, dataAcao: "2026-08-10", hora: "09:00", tipo: "PRESENCIAL", status: "AGENDADA", endereco: null, numero: null, complemento: null, bairro: null, cidade: null, uf: null, nomeAvulso: null, empresaId: null, empresaNome: null, clienteId: null, clienteNome: null, criadoPorNome: "Tiago", createdAt: new Date() }]
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(createQueryBuilder(rows))
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard-lista?filtro=total"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ id: 1, dataAcao: "2026-08-10" })
  })
})
