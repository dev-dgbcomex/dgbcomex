import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { adicionarPecas } from "@/lib/wms/repo"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({ adicionarPecas: vi.fn() }))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function req(body: unknown) {
  return new NextRequest("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/wms/separacoes/[id]/pecas", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(adicionarPecas).mockReset()
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await POST(req({ item: 1, pecas: [] }), params("9"))).status).toBe(401)
  })

  it("rejeita id inválido", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    expect((await POST(req({ item: 1, pecas: [] }), params("abc"))).status).toBe(400)
  })

  it("exige o item", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    expect((await POST(req({ pecas: [{ nroRolo: "R1", nroPeca: "1" }] }), params("9"))).status).toBe(
      400
    )
  })

  it("exige ao menos uma peça válida", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())

    const res = await POST(
      req({ item: 1, pecas: [{ nroRolo: " ", nroPeca: "1" }, { nroRolo: "R2" }] }),
      params("9")
    )

    expect(res.status).toBe(400)
    expect(adicionarPecas).not.toHaveBeenCalled()
  })

  it("reserva as peças para o item", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(adicionarPecas).mockResolvedValue({
      separacao: { id: 9, status: "EM_SEPARACAO" },
      adicionadas: 2,
    } as Awaited<ReturnType<typeof adicionarPecas>>)

    const res = await POST(
      req({
        item: 3,
        pecas: [
          { empresa: "13", nroRolo: " R1 ", nroPeca: " 1 " },
          { nroRolo: "R2", nroPeca: "2" },
          { nroRolo: "", nroPeca: "9" },
        ],
      }),
      params("9")
    )

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ adicionadas: 2 })
    expect(adicionarPecas).toHaveBeenCalledWith(9, {
      item: 3,
      pecas: [
        { empresa: "13", nroRolo: "R1", nroPeca: "1" },
        { empresa: null, nroRolo: "R2", nroPeca: "2" },
      ],
      usuarioId: 1,
    })
  })
})
