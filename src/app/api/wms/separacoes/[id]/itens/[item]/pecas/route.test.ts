import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { pecasDoItem } from "@/lib/wms/repo"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ pecasDoItem: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

const params = (id: string, item: string) => ({
  params: Promise.resolve({ id, item }),
})

function req(query = "") {
  return new NextRequest(`http://localhost/api/wms/separacoes/9/itens/1/pecas${query}`)
}

describe("GET /api/wms/separacoes/[id]/itens/[item]/pecas", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(pecasDoItem).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(req(), params("9", "1"))).status).toBe(401)
  })

  it("rejeita item inválido", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    expect((await GET(req(), params("9", "0"))).status).toBe(400)
  })

  it("lista as peças compatíveis com o item", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(pecasDoItem).mockResolvedValue({
      itens: [],
      total: 462,
      item: { item: 1 },
    } as Awaited<ReturnType<typeof pecasDoItem>>)

    const res = await GET(req("?busca=R1&gaveta=A-01&limite=200&offset=0"), params("9", "1"))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ total: 462 })
    expect(pecasDoItem).toHaveBeenCalledWith(9, 1, {
      busca: "R1",
      gaveta: "A-01",
      subLote: "",
      aviso: "",
      campo: "",
      limite: 200,
      offset: 0,
    })
  })
})
