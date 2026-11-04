// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { DELETE } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/notificar", () => ({
  registrarLog: vi.fn(),
  notificar: vi.fn(),
  notificarErro: vi.fn(),
  notificarDelecao: vi.fn(),
}))
vi.mock("@/lib/db", () => ({
  db: { transaction: vi.fn(), select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

function del(id: string) {
  return DELETE(new NextRequest(`http://localhost/api/crm/pessoas/${id}`), {
    params: Promise.resolve({ id }),
  })
}

describe("DELETE /api/crm/pessoas/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await del("1")
    expect(res.status).toBe(401)
  })

  it("bloqueia a exclusão e orienta a transformar a pessoa em cliente", async () => {
    const res = await del("7")
    expect(res.status).toBe(403)
    const corpo = await res.json()
    expect(corpo.fkError).toBe(true)
    expect(corpo.error).toContain("não podem ser excluídas")
    expect(corpo.error).toContain("transforme a pessoa em cliente")
  })

  it("bloqueia a exclusão para qualquer perfil autenticado", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "CRM" } },
      userId: 2,
    } as any)
    const res = await del("7")
    expect(res.status).toBe(403)
  })
})
