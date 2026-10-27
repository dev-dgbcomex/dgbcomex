import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { listarPedidos } from "@/lib/wms/repo"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ listarPedidos: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

function req(query = "") {
  return new NextRequest(`http://localhost/api/wms/pedidos${query}`)
}

describe("GET /api/wms/pedidos", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(listarPedidos).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(req())).status).toBe(401)
  })

  it("repassa busca, situação e paginação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(listarPedidos).mockResolvedValue({ itens: [], total: 7 })

    const res = await GET(req("?busca=5902&statusSeparacao=SEM_SEPARACAO&limite=10&offset=20"))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ itens: [], total: 7 })
    expect(listarPedidos).toHaveBeenCalledWith({
      busca: "5902",
      statusSeparacao: "SEM_SEPARACAO",
      arquivados: false,
      limite: 10,
      offset: 20,
    })
  })
})
