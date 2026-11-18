// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/erp/cliente", () => ({
  ErroErp: class ErroErp extends Error {
    status: number
    constructor(mensagem: string, status = 500) {
      super(mensagem)
      this.status = status
    }
  },
  requisitarErp: vi.fn(),
}))

const resultado = { desde: "2026-11-18T00:00:00", documentos: 2, itens: 4 }

describe("POST /api/crm/erp/faturamentos/sincronizar", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as any)
    vi.mocked(requisitarErp).mockResolvedValue(resultado as any)
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("carrega o diferencial na api-microdata", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(resultado)
    expect(requisitarErp).toHaveBeenCalledWith("/crm/faturamentos/sincronizar", {
      metodo: "POST",
    })
  })

  it("repassa o erro da api-microdata", async () => {
    vi.mocked(requisitarErp).mockRejectedValue(new ErroErp("ERP indisponível.", 503))
    const res = await POST()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "ERP indisponível." })
  })
})
