import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { concluirSeparacao } from "@/lib/wms/repo"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ concluirSeparacao: vi.fn() }))

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

describe("POST /api/wms/separacoes/[id]/concluir", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(concluirSeparacao).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await POST(req(), params("9"))).status).toBe(401)
  })

  it("rejeita id inválido", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    expect((await POST(req(), params("-1"))).status).toBe(400)
  })

  it("conclui com usuário e observação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(concluirSeparacao).mockResolvedValue({
      id: 9,
      status: "SEPARADO",
    } as Awaited<ReturnType<typeof concluirSeparacao>>)

    const res = await POST(req({ observacao: "  saldo ok  " }), params("9"))

    expect(res.status).toBe(200)
    expect(concluirSeparacao).toHaveBeenCalledWith(9, 1, "saldo ok")
  })

  it("conclui sem observação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(concluirSeparacao).mockResolvedValue({
      id: 9,
      status: "SEPARADO",
    } as Awaited<ReturnType<typeof concluirSeparacao>>)

    await POST(req(), params("9"))

    expect(concluirSeparacao).toHaveBeenCalledWith(9, 1, null)
  })
})
