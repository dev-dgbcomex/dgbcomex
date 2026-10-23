import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { cancelarSeparacao } from "@/lib/wms/repo"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ cancelarSeparacao: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function req(body: unknown = {}) {
  return new NextRequest("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/wms/separacoes/[id]/cancelar", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(cancelarSeparacao).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await POST(req(), params("9"))).status).toBe(401)
  })

  it("rejeita id inválido", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    expect((await POST(req(), params("x"))).status).toBe(400)
  })

  it("cancela com motivo e usuário", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(cancelarSeparacao).mockResolvedValue({
      id: 9,
      status: "CANCELADO",
    } as Awaited<ReturnType<typeof cancelarSeparacao>>)

    const res = await POST(req({ motivo: "  pedido cancelado  " }), params("9"))

    expect(res.status).toBe(200)
    expect(cancelarSeparacao).toHaveBeenCalledWith(9, "pedido cancelado", 1)
  })
})
