import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { contarPecasEmAberto, listarPecasEmAberto } from "@/lib/wms/repo"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({
  listarPecasEmAberto: vi.fn(),
  contarPecasEmAberto: vi.fn(),
}))

function req(query = "") {
  return new NextRequest(`http://localhost/api/wms/estoque${query}`)
}

describe("GET /api/wms/estoque", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(listarPecasEmAberto).mockReset()
    vi.mocked(contarPecasEmAberto).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(req())).status).toBe(401)
  })

  it("repassa busca e paginação", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(listarPecasEmAberto).mockResolvedValue([
      { nro_rolo: "R1", nro_peca: "1" } as Awaited<ReturnType<typeof listarPecasEmAberto>>[number],
    ])
    vi.mocked(contarPecasEmAberto).mockResolvedValue(120)

    const res = await GET(req("?busca=R1&limite=10&offset=20"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ itens: [{ nro_rolo: "R1", nro_peca: "1" }], total: 120 })
    expect(listarPecasEmAberto).toHaveBeenCalledWith({ busca: "R1", limite: 10, offset: 20 })
  })
})
