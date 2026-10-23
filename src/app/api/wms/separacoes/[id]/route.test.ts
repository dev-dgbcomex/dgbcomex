import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { detalheSeparacao } from "@/lib/wms/repo"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ detalheSeparacao: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe("GET /api/wms/separacoes/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(detalheSeparacao).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(new Request("http://localhost"), params("9"))).status).toBe(401)
  })

  it("rejeita id inválido", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())

    const res = await GET(new Request("http://localhost"), params("abc"))

    expect(res.status).toBe(400)
    expect(detalheSeparacao).not.toHaveBeenCalled()
  })

  it("retorna o detalhe da ordem", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(detalheSeparacao).mockResolvedValue({
      id: 9,
      pedido: "00005902",
      itens: [],
      pecas: [],
    } as unknown as Awaited<ReturnType<typeof detalheSeparacao>>)

    const res = await GET(new Request("http://localhost"), params("9"))

    expect(res.status).toBe(200)
    expect(detalheSeparacao).toHaveBeenCalledWith(9)
  })
})
