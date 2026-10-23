import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { detalhePedido } from "@/lib/wms/repo"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ detalhePedido: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

const params = (empresa: string, pedido: string) => ({
  params: Promise.resolve({ empresa, pedido }),
})

describe("GET /api/wms/pedidos/[empresa]/[pedido]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(detalhePedido).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(new Request("http://localhost"), params("13", "00005902"))).status).toBe(401)
  })

  it("busca o detalhe decodificando os parâmetros", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(detalhePedido).mockResolvedValue({
      empresa: "13",
      pedido: "00005902",
      itens: [],
      status: "2",
    } as unknown as Awaited<ReturnType<typeof detalhePedido>>)

    const res = await GET(
      new Request("http://localhost"),
      params(encodeURIComponent("13"), encodeURIComponent("00005902"))
    )

    expect(res.status).toBe(200)
    expect(detalhePedido).toHaveBeenCalledWith("13", "00005902")
  })
})
