// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { idsPessoasDoCliente } from "@/lib/crm/cliente-relacionamentos"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/crm/cliente-relacionamentos", () => ({ idsPessoasDoCliente: vi.fn() }))

function get(url: string) {
  return GET(new NextRequest(url))
}

describe("GET /api/crm/timeline", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(idsPessoasDoCliente).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(idsPessoasDoCliente).mockResolvedValue([7])
    db.select = vi.fn(() => createQueryBuilder([{ id: 1, tipo: "OPORTUNIDADE" }]))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await get("http://localhost/api/crm/timeline?pessoaId=7")
    expect(res.status).toBe(401)
  })

  it("exige pessoaId ou clienteId", async () => {
    const res = await get("http://localhost/api/crm/timeline")
    expect(res.status).toBe(400)
  })

  it("lista a timeline da pessoa", async () => {
    const res = await get("http://localhost/api/crm/timeline?pessoaId=7")
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(idsPessoasDoCliente).not.toHaveBeenCalled()
  })

  it("lista a timeline do cliente somando as pessoas promovidas", async () => {
    const res = await get("http://localhost/api/crm/timeline?clienteId=5")
    expect(res.status).toBe(200)
    expect(idsPessoasDoCliente).toHaveBeenCalledWith(5)
    const builder = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(builder.where).toHaveBeenCalled()
  })
})
