import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { iniciarSeparacao } from "@/lib/wms/repo"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ iniciarSeparacao: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const req = () => new NextRequest("http://localhost", { method: "POST" })

describe("POST /api/wms/separacoes/[id]/iniciar", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(iniciarSeparacao).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await POST(req(), params("9"))).status).toBe(401)
  })

  it("rejeita id inválido", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    expect((await POST(req(), params("0"))).status).toBe(400)
  })

  it("inicia a ordem com o usuário da sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(iniciarSeparacao).mockResolvedValue({
      id: 9,
      status: "EM_SEPARACAO",
    } as Awaited<ReturnType<typeof iniciarSeparacao>>)

    const res = await POST(req(), params("9"))

    expect(res.status).toBe(200)
    expect(iniciarSeparacao).toHaveBeenCalledWith(9, 1)
  })
})
