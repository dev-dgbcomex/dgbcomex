// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/crm/automacoes-crm", () => ({ processarAutomacaoCRM: vi.fn() }))

const session = { session: { user: { name: "Tiago" } }, userId: 1 }

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/crm/pedidos-venda/converter-faturados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("POST /api/crm/pedidos-venda/converter-faturados", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(processarAutomacaoCRM).mockReset().mockResolvedValue({
      ok: true,
      avisos: ["Lead convertida em cliente"],
    } as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post({ pedidoIds: [1] })
    expect(res.status).toBe(401)
  })

  it("converte cada lead uma única vez e devolve o resumo", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      createQueryBuilder([
        { pedidoId: 1, empresaId: 4 },
        { pedidoId: 2, empresaId: 4 },
        { pedidoId: 3, empresaId: 5 },
      ])
    )

    const res = await post({ pedidoIds: [1, 2, 3] })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(processarAutomacaoCRM).toHaveBeenCalledTimes(2)
    expect(body.convertidas).toBe(3)
    expect(body.falhas).toBe(0)
  })

  it("rejeita requisição sem pedidos", async () => {
    const res = await post({ pedidoIds: [] })
    expect(res.status).toBe(400)
    expect(db.select).not.toHaveBeenCalled()
  })
})
