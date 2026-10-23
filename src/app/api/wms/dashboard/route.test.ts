import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { dashboard } from "@/lib/wms/repo"
import { ErroWms } from "@/lib/wms/cliente"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ dashboard: vi.fn() }))

const resumo = {
  pedidosLiberados: 3,
  separacoesLiberadas: 1,
  separacoesEmAndamento: 2,
  separacoesConcluidas: 4,
  pecasReservadas: 42,
  metrosReservados: 1234.5,
  pecasEmAberto: 18310,
  gavetas: 829,
}

describe("GET /api/wms/dashboard", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(dashboard).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("retorna o resumo do armazém", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(dashboard).mockResolvedValue(resumo)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(resumo)
  })

  it("repassa o status/mensagem da api-microdata", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(dashboard).mockRejectedValue(new ErroWms("api-microdata indisponível.", 503))

    const res = await GET()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "api-microdata indisponível." })
  })
})
