import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { listarEstoque } from "@/lib/wms/repo"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ listarEstoque: vi.fn() }))

function req(query = "") {
  return new NextRequest(`http://localhost/api/wms/estoque${query}`)
}

describe("GET /api/wms/estoque", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(listarEstoque).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(req())).status).toBe(401)
  })

  it("repassa busca, filtros e paginação", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(listarEstoque).mockResolvedValue({
      itens: [],
      total: 120,
    })

    const res = await GET(
      req("?busca=R1&gaveta=A-01&subLote=L1&aviso=A1&cor=010&produto=29&limite=10&offset=20")
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ itens: [], total: 120 })
    expect(listarEstoque).toHaveBeenCalledWith({
      busca: "R1",
      gaveta: "A-01",
      subLote: "L1",
      aviso: "A1",
      cor: "010",
      produto: "29",
      limite: 10,
      offset: 20,
    })
  })

  it("usa os padrões quando a paginação não vem na query", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(listarEstoque).mockResolvedValue({ itens: [], total: 0 })

    await GET(req())

    expect(listarEstoque).toHaveBeenCalledWith({
      busca: "",
      gaveta: "",
      subLote: "",
      aviso: "",
      cor: "",
      produto: "",
      limite: 50,
      offset: 0,
    })
  })
})
