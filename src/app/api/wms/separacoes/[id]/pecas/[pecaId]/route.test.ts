import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { removerPeca } from "@/lib/wms/repo"
import { DELETE } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ removerPeca: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

const params = (id: string, pecaId: string) => ({
  params: Promise.resolve({ id, pecaId }),
})

const req = () => new NextRequest("http://localhost", { method: "DELETE" })

describe("DELETE /api/wms/separacoes/[id]/pecas/[pecaId]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(removerPeca).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await DELETE(req(), params("9", "11"))).status).toBe(401)
  })

  it("rejeita ids inválidos", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    expect((await DELETE(req(), params("9", "0"))).status).toBe(400)
    expect((await DELETE(req(), params("x", "11"))).status).toBe(400)
  })

  it("remove a peça com o usuário da sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(removerPeca).mockResolvedValue({
      separacao: { id: 9 },
      removida: { id: 11 },
    } as Awaited<ReturnType<typeof removerPeca>>)

    const res = await DELETE(req(), params("9", "11"))

    expect(res.status).toBe(200)
    expect(removerPeca).toHaveBeenCalledWith(9, 11, 1)
  })
})
