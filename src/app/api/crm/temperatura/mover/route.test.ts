// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { carregarItensTemperatura } from "@/lib/crm/temperatura-server"
import { planoDaTransicao } from "@/lib/crm/temperatura"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/temperatura-server", () => ({ carregarItensTemperatura: vi.fn() }))
vi.mock("@/lib/crm/temperatura", () => ({ planoDaTransicao: vi.fn() }))
vi.mock("@/lib/crm/automacoes-crm", () => ({ processarAutomacaoCRM: vi.fn() }))

const session = { session: { user: { name: "Tiago" } }, userId: 1 }
const item = {
  id: "cliente-2",
  tipo: "cliente",
  entidadeId: 2,
  nome: "Cliente Lima",
  faixaConversao: "QUENTE",
  oportunidades: [{ id: 9, titulo: "Oportunidade 9", status: "NEGOCIACAO" }],
} as any

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/crm/temperatura/mover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("POST /api/crm/temperatura/mover", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(carregarItensTemperatura).mockReset().mockResolvedValue({
      itens: [item],
      contagem: { QUENTE: 0, MORNO: 1, FRIO: 0 },
    })
    vi.mocked(planoDaTransicao).mockReset().mockReturnValue({
      ok: true,
      plano: {
        destino: "MORNO",
        avisos: [],
        acoes: [
          { tipo: "ALTERAR_STATUS_OPORTUNIDADE", oportunidadeId: 9, status: "PROPOSTA" },
        ],
      },
    } as any)
    vi.mocked(processarAutomacaoCRM).mockReset().mockResolvedValue({
      ok: true,
      registro: { id: 9, status: "PROPOSTA" },
      avisos: [],
    } as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post({ id: item.id, destino: "MORNO" })
    expect(res.status).toBe(401)
  })

  it("rejeita destino inválido", async () => {
    const res = await post({ id: item.id, destino: "INVALIDO" })
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando o item não existe", async () => {
    const res = await post({ id: "inexistente", destino: "MORNO" })
    expect(res.status).toBe(404)
  })

  it("devolve erro 422 quando a transição é bloqueada", async () => {
    vi.mocked(planoDaTransicao).mockReturnValue({
      ok: false,
      erro: "Não é possível mover para Frio: existe ganho ou pedido neste trimestre.",
    } as any)
    const res = await post({ id: item.id, destino: "FRIO", escolhas: { motivoPerda: "Sem interesse" } })
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/trimestre/)
  })

  it("aplica a alteração de status e devolve o item atualizado", async () => {
    const res = await post({ id: item.id, destino: "MORNO" })
    expect(res.status).toBe(200)
    expect(processarAutomacaoCRM).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "OPORTUNIDADE",
        entidadeId: 9,
        acao: "ALTERAR_STATUS",
        statusNovo: "PROPOSTA",
        autor: { id: 1, nome: "Tiago" },
      })
    )
    const json = await res.json()
    expect(json).toMatchObject({ ok: true, acoes: 1, contagem: { MORNO: 1 } })
    expect(json.item.id).toBe(item.id)
  })
})
