// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"
import { atualizarEspelhosErp } from "@/lib/crm/erp-espelho"
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
vi.mock("@/lib/crm/erp-espelho", () => ({ atualizarEspelhosErp: vi.fn() }))

const resultado = { desde: null, documentos: 1, itens: 4 }
const espelhos = { verificados: 2, atualizados: 1, falhas: 0 }

describe("POST /api/crm/erp/pedidos/sincronizar", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(atualizarEspelhosErp).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as any)
    vi.mocked(requisitarErp).mockResolvedValue(resultado as any)
    vi.mocked(atualizarEspelhosErp).mockResolvedValue(espelhos)
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("varre os pedidos na api-microdata e atualiza os espelhos", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ...resultado, espelhos })
    expect(requisitarErp).toHaveBeenCalledWith("/crm/pedidos/sincronizar", { metodo: "POST" })
    expect(atualizarEspelhosErp).toHaveBeenCalledWith("PEDIDO")
  })

  it("repassa o erro da api-microdata", async () => {
    vi.mocked(requisitarErp).mockRejectedValue(new ErroErp("ERP indisponível.", 503))
    const res = await POST()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "ERP indisponível." })
  })
})
