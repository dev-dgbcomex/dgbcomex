// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { createQueryBuilder } from "@/test/route-db-mock"
import { PATCH } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn() } }))
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

function mockOportunidade(registro: any) {
  vi.mocked(db.select).mockReturnValue(createQueryBuilder([registro]))
}

describe("PATCH /api/crm/oportunidades/[id]/status", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(processarAutomacaoCRM).mockReset().mockResolvedValue({
      ok: true,
      registro: { id: 10, status: "NEGOCIACAO" },
      avisos: [],
    } as any)
    vi.mocked(db.update).mockReturnValue(createQueryBuilder([]))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await patch({ status: "NEGOCIACAO" })
    expect(res.status).toBe(401)
  })

  it("retorna 404 quando a oportunidade não existe", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([]))
    const res = await patch({ status: "NEGOCIACAO" })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Oportunidade não encontrada" })
  })

  it("bloqueia PROPOSTA sem valor estimado e probabilidade", async () => {
    mockOportunidade({ id: 10, status: "NOVO", valorEstimado: null, probabilidade: null })
    const res = await patch({ status: "PROPOSTA" })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.validacaoObrigatoria.campos).toEqual(["valorEstimado", "probabilidade"])
    expect(processarAutomacaoCRM).not.toHaveBeenCalled()
  })

  it("permite PROPOSTA quando valores existentes são maiores que 1", async () => {
    mockOportunidade({ id: 10, status: "NOVO", valorEstimado: 100, probabilidade: 50 })
    const res = await patch({ status: "PROPOSTA" })
    expect(res.status).toBe(200)
    expect(processarAutomacaoCRM).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "OPORTUNIDADE",
        entidadeId: 10,
        statusNovo: "PROPOSTA",
        autor: { id: 1, nome: "Tiago" },
      })
    )
  })

  it("persiste valor estimado e probabilidade enviados no body", async () => {
    mockOportunidade({ id: 10, status: "NOVO", valorEstimado: null, probabilidade: null })
    const res = await patch({ status: "PROPOSTA", valorEstimado: 250, probabilidade: 30 })
    expect(res.status).toBe(200)
    expect(processarAutomacaoCRM).toHaveBeenCalled()
    expect(db.update).toHaveBeenCalled()
    const body = await res.json()
    expect(body.valorEstimado).toBe(250)
    expect(body.probabilidade).toBe(30)
  })

  it("repassa decisão pendente do motor", async () => {
    mockOportunidade({ id: 10, status: "NOVO", valorEstimado: 100, probabilidade: 50 })
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
})
