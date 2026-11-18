// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { carregarCamposVisiveis } from "@/lib/campos-visiveis"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/campos-visiveis", () => ({ carregarCamposVisiveis: vi.fn() }))

const auth = {
  session: { user: { id: "1", role: "COMERCIAL" } },
  userId: 1,
}

function get(cadastro?: string) {
  const url = cadastro
    ? `http://localhost/api/campos-visiveis?cadastro=${cadastro}`
    : "http://localhost/api/campos-visiveis"
  return GET(new NextRequest(url))
}

describe("GET /api/campos-visiveis", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(carregarCamposVisiveis).mockReset()
    vi.mocked(requireAuth).mockResolvedValue(auth as any)
    vi.mocked(carregarCamposVisiveis).mockResolvedValue({
      campos: { proposta_vinculada: false },
      falhou: false,
    })
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Não autorizado" }, { status: 401 }) as any
    )

    const response = await get("CRM_VISITA_DETALHE")
    expect(response.status).toBe(401)
  })

  it("valida o cadastro informado", async () => {
    expect((await get()).status).toBe(400)
    expect((await get("CADASTRO_INVALIDO")).status).toBe(400)
  })

  it("retorna a visibilidade para o perfil da sessão", async () => {
    const response = await get("CRM_VISITA_DETALHE")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      cadastro: "CRM_VISITA_DETALHE",
      campos: { proposta_vinculada: false },
      falhou: false,
    })
    expect(carregarCamposVisiveis).toHaveBeenCalledWith("CRM_VISITA_DETALHE", "COMERCIAL")
  })
})
