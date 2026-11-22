// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { PATCH } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/automacoes-crm", () => ({ processarAutomacaoCRM: vi.fn() }))

const session = { session: { user: { name: "Tiago" } }, userId: 1 }

function patch(body: Record<string, unknown>) {
  return PATCH(
    new NextRequest("http://localhost/api/crm/oportunidades/10/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "10" }) }
  )
}

describe("PATCH /api/crm/oportunidades/[id]/status", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(processarAutomacaoCRM).mockReset().mockResolvedValue({
      ok: true,
      registro: { id: 10, status: "NEGOCIACAO" },
      avisos: [],
    } as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await patch({ status: "NEGOCIACAO" })
    expect(res.status).toBe(401)
  })

  it("devolve a decisão pendente quando o motor exige escolha do usuário", async () => {
    const decisaoPendente = {
      codigo: "PERDA_ULTIMA_OPORTUNIDADE",
      mensagem: "Escolha",
      opcoes: [],
      contexto: {},
    }
    vi.mocked(processarAutomacaoCRM).mockResolvedValue({
      ok: false,
      decisaoPendente,
      avisos: [],
    } as any)

    const res = await patch({ status: "FECHADO_PERDIDO", motivoPerda: "Sem interesse" })
    expect(res.status).toBe(409)
    expect((await res.json()).decisaoPendente).toEqual(decisaoPendente)
  })

  it("repassa status, motivo e autor ao motor", async () => {
    const res = await patch({ status: "FECHADO_PERDIDO", motivoPerda: "Sem interesse" })
    expect(res.status).toBe(200)
    expect(processarAutomacaoCRM).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "OPORTUNIDADE",
        entidadeId: 10,
        statusNovo: "FECHADO_PERDIDO",
        motivoPerda: "Sem interesse",
        autor: { id: 1, nome: "Tiago" },
      })
    )
  })
})
