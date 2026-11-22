// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { carregarItensTemperatura } from "@/lib/crm/temperatura-server"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/temperatura-server", () => ({ carregarItensTemperatura: vi.fn() }))

const session = { session: { user: { name: "Tiago" } }, userId: 1 }

describe("GET /api/crm/temperatura", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(carregarItensTemperatura).mockReset().mockResolvedValue({
      itens: [],
      contagem: { QUENTE: 0, MORNO: 0, FRIO: 0 },
    })
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("devolve itens e contagem", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      itens: [],
      contagem: { QUENTE: 0, MORNO: 0, FRIO: 0 },
    })
  })

  it("devolve erro quando a carga falha", async () => {
    vi.mocked(carregarItensTemperatura).mockRejectedValue(new Error("falha"))
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
