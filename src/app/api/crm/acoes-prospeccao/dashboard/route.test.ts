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

function mockSelects(results: unknown[]) {
  for (const r of results) {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder(r as any))
  }
}

describe("GET /api/crm/acoes-prospeccao/dashboard", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autentica??o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "N?o autorizado" }), { status: 401 }) as any
    )
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard"))
    expect(res.status).toBe(401)
  })

  it("agrega KPIs b?sicos", async () => {
    mockSelects([
      [{ total: 37 }],
      [{ total: 37 }],
      [{ total: 0 }],
      [{ total: 0 }],
      [{ total: 5 }],
      [{ total: 37 }],
      [{ tipo: "PRESENCIAL", total: 30 }],
      [{ status: "REALIZADA", total: 37 }],
      [{ dia: "2026-08-10", total: 5 }],
      [{ gerenteId: 8, gerenteNome: "Ernandes", dataAcao: "2026-08-20", total: 7 }],
      [{ viagemId: 1, viagemTitulo: "Viagem", total: 37, realizadas: 35, minData: "2026-08-10", maxData: "2026-08-20" }],
      [{ viagemId: 1, totalInvestimento: "5200" }],
      [{ oportunidadeId: 10, valorEstimado: "120000", viagemId: 1 }],
      [{ viagemId: 1, valorTotal: "30000" }],
      [{ viagemId: 1, valorTotal: "20000" }],
      [],
      [{ total: 0 }],
      [{ total: 0 }],
      [{ total: 0 }],
    ])
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(37)
    expect(body.porDia).toEqual([{ dia: "2026-08-10", total: 5 }])
    expect(body.porGerente[0]).toMatchObject({ gerenteNome: "Ernandes", visitas: 7 })
  })
})
