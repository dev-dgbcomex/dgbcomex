import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { listarGavetas } from "@/lib/wms/repo"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ listarGavetas: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

function req(query = "") {
  return new NextRequest(`http://localhost/api/wms/gavetas${query}`)
}

describe("GET /api/wms/gavetas", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(listarGavetas).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(req())).status).toBe(401)
  })

  it("repassa busca, zona e paginação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(listarGavetas).mockResolvedValue({ itens: [], total: 829 })

    const res = await GET(req("?busca=A-01&zona=DEP%C3%93SITO&limite=10&offset=20"))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ itens: [], total: 829 })
    expect(listarGavetas).toHaveBeenCalledWith({
      busca: "A-01",
      zona: "DEPÓSITO",
      limite: 10,
      offset: 20,
    })
  })
})
