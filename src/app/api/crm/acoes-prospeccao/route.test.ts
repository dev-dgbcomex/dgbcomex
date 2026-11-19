// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { geocodificarCamposEndereco } from "@/lib/crm/geocode"
import { createQueryBuilder } from "@/test/route-db-mock"
import { notificarErro } from "@/lib/notificar"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
  },
}))
vi.mock("@/lib/crm/geocode", () => ({ geocodificarCamposEndereco: vi.fn() }))
vi.mock("@/lib/notificar", () => ({
  registrarLog: vi.fn(),
  notificar: vi.fn(),
  notificarErro: vi.fn(),
}))
vi.mock("@/lib/crm-timeline", () => ({ inserirTimelineEvento: vi.fn() }))
vi.mock("@/lib/crm/notificar-atividade", () => ({ notificarAtividadeAcaoProspeccao: vi.fn() }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

function acaoInserted(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    dataAcao: "2026-08-10",
    hora: "09:00",
    tipo: "PRESENCIAL",
    status: "AGENDADA",
    endereco: "Av. X",
    numero: "100",
    complemento: null,
    bairro: "Centro",
    cidade: "Goi�nia",
    uf: "GO",
    cep: null,
    ...overrides,
  }
}

describe("POST /api/crm/acoes-prospeccao", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(geocodificarCamposEndereco).mockReset()
    for (const key of ["select", "insert", "update"] as const) {
      ;(db[key] as ReturnType<typeof vi.fn>)?.mockReset()
    }
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    vi.mocked(geocodificarCamposEndereco).mockResolvedValue(null)
  })

  function mockInsert(rows: Record<string, unknown>[]) {
    ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValue(createQueryBuilder(rows))
  }

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any
    )
    const res = await POST(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao", {
        method: "POST",
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(401)
  })

  it("notifica a equipe e devolve 500 quando a cria��o da a��o de prospec��o falha", async () => {
    ;(db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("not-null violation")
    })
    const res = await POST(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao", {
        method: "POST",
        body: JSON.stringify({ dataAcao: "2026-08-10" }),
      })
    )
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: "Erro ao criar ação de prospecção. A equipe de suporte foi notificada.",
    })
    expect(notificarErro).toHaveBeenCalledWith("POST /api/crm/acoes-prospeccao", expect.any(Error))
  })

  it("geocodifica o endere�o da a��o de prospec��o e salva as coordenadas no cadastro", async () => {
    vi.mocked(geocodificarCamposEndereco).mockResolvedValue({ latitude: -16.82, longitude: -49.25 })
    mockInsert([acaoInserted(1)])
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(createQueryBuilder(undefined))

    const res = await POST(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao", {
        method: "POST",
        body: JSON.stringify({
          dataAcao: "2026-08-10",
          endereco: "Av. X",
          numero: "100",
          bairro: "Centro",
          cidade: "Goi�nia",
          uf: "GO",
        }),
      })
    )

    expect(res.status).toBe(201)
    expect(geocodificarCamposEndereco).toHaveBeenCalledWith({
      endereco: "Av. X",
      numero: "100",
      complemento: null,
      bairro: "Centro",
      cidade: "Goi�nia",
      uf: "GO",
    })
    expect(db.update).toHaveBeenCalledTimes(1)
    const body = await res.json()
    expect(body.acao.enderecoLat).toBe(-16.82)
    expect(body.acao.enderecoLng).toBe(-49.25)
  })

  it("n�o geocodifica nem atualiza quando n�o h� endere�o em nenhuma origem", async () => {
    mockInsert([
      acaoInserted(1, { endereco: null, numero: null, bairro: null, cidade: null, uf: null }),
    ])

    const update = db.update as ReturnType<typeof vi.fn>
    const res = await POST(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao", {
        method: "POST",
        body: JSON.stringify({ dataAcao: "2026-08-10", endereco: null }),
      })
    )

    expect(res.status).toBe(201)
    expect(geocodificarCamposEndereco).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
