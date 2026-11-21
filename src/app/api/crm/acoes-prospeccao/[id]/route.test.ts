// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { propostaVinculadaAcaoProspeccaoVisivelPara } from "@/lib/campos-visiveis"
import { db } from "@/lib/db"
import { notificarDelecao } from "@/lib/notificar"
import { geocodificarCamposEndereco } from "@/lib/crm/geocode"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { DELETE, GET, PUT } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/notificar", () => ({
  registrarLog: vi.fn(),
  notificar: vi.fn(),
  notificarErro: vi.fn(),
  notificarDelecao: vi.fn(),
}))
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
vi.mock("@/lib/campos-visiveis", () => ({ propostaVinculadaAcaoProspeccaoVisivelPara: vi.fn() }))
vi.mock("@/lib/crm-timeline", () => ({
  inserirTimelineEvento: vi.fn(),
  excluirTimelineEventosEntidade: vi.fn(),
}))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }
const sessionComercial = {
  session: { user: { id: "2", role: "COMERCIAL", name: "Ana" } },
  userId: 2,
}
const sessionCrm = { session: { user: { id: "3", role: "CRM", name: "Bia" } }, userId: 3 }

function del(id: string) {
  return DELETE(new NextRequest("http://localhost/api/crm/acoes-prospeccao/" + id), {
    params: Promise.resolve({ id }),
  })
}

function txMock() {
  return {
    select: vi.fn(() => createQueryBuilder([])),
    delete: vi.fn(() => createQueryBuilder(undefined)),
  }
}

function acaoExistente(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    empresaId: null,
    clienteId: null,
    oportunidadeId: null,
    contatoId: null,
    viagemId: null,
    representanteId: null,
    propostaId: null,
    nomeAvulso: null,
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
    enderecoLat: null,
    enderecoLng: null,
    motivoCancelamento: null,
    relato: null,
    fotos: [],
    duracaoEstimada: null,
    ...overrides,
  }
}

describe("DELETE /api/crm/acoes-prospeccao/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivelPara).mockReset()
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivelPara).mockResolvedValue(true)
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    db.select = vi.fn(() => createQueryBuilder([]))
    db.transaction = vi.fn((cb: (tx: unknown) => unknown) => cb(txMock()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any
    )
    const res = await del("1")
    expect(res.status).toBe(401)
  })

  it("retorna 403 para papel n�o autorizado", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "GERENTE" } },
      userId: 2,
    } as any)
    const res = await del("1")
    expect(res.status).toBe(403)
  })

  it.each([
    ["COMERCIAL", sessionComercial],
    ["CRM", sessionCrm],
  ])("perfil %s exclui ação de outro usuário", async (_, session) => {
    vi.mocked(requireAuth).mockResolvedValue(session as any)
    db.select = vi.fn(() => createQueryBuilder([{ criadoPor: 99, googleEventId: null }]))

    const res = await del("10")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.transaction).toHaveBeenCalled()
  })

  it("exclui a a��o de prospec��o e limpa os eventos de timeline em transa��o", async () => {
    const res = await del("10")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.transaction).toHaveBeenCalled()
    expect(notificarDelecao).toHaveBeenCalledWith("Ação de Prospecção CRM", "10", "Tiago")
  })
})

describe("GET /api/crm/acoes-prospeccao/[id]", () => {
  function get(id: string) {
    return GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/" + id), {
      params: Promise.resolve({ id }),
    })
  }

  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivelPara).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    db.select = vi.fn(() =>
      createQueryBuilder([acaoExistente({ propostaId: 42, propostaTitulo: "Proposta Vinculada" })])
    )
  })

  it("remove os dados da proposta quando o campo est� oculto para o perfil", async () => {
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivelPara).mockResolvedValue(false)
    const res = await get("10")
    const corpo = await res.json()
    expect(res.status).toBe(200)
    expect(corpo).not.toHaveProperty("propostaId")
  })

  it("mant�m os dados da proposta quando o campo est� vis�vel", async () => {
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivelPara).mockResolvedValue(true)
    const res = await get("10")
    const corpo = await res.json()
    expect(res.status).toBe(200)
    expect(corpo.propostaId).toBe(42)
  })
})

describe("PUT /api/crm/acoes-prospeccao/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(geocodificarCamposEndereco).mockReset()
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivelPara).mockReset()
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivelPara).mockResolvedValue(true)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    vi.mocked(geocodificarCamposEndereco).mockResolvedValue(null)
  })

  function put(id: string, body: Record<string, unknown>) {
    return PUT(
      new NextRequest("http://localhost/api/crm/acoes-prospeccao/" + id, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    )
  }

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any
    )
    const res = await put("10", {})
    expect(res.status).toBe(401)
  })

  it.each([
    ["COMERCIAL", sessionComercial],
    ["CRM", sessionCrm],
  ])("perfil %s edita ação de outro usuário", async (_, session) => {
    vi.mocked(requireAuth).mockResolvedValue(session as any)
    db.select = vi.fn(() => createQueryBuilder([acaoExistente({ criadoPor: 99 })]))
    db.update = vi.fn(() => createQueryBuilder([acaoExistente({ criadoPor: 99 })]))

    const res = await put("10", { relato: "teste" })

    expect(res.status).toBe(200)
    expect(db.update).toHaveBeenCalled()
  })

  it("geocodifica e salva as coordenadas ao atualizar o endere�o", async () => {
    vi.mocked(geocodificarCamposEndereco).mockResolvedValue({ latitude: -16.82, longitude: -49.25 })
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([acaoExistente()]))
    const builder = createQueryBuilder([acaoExistente({ enderecoLat: -16.82, enderecoLng: -49.25 })])
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(builder)

    const res = await put("10", { endereco: "Av. X", numero: "100", bairro: "Centro", cidade: "Goi�nia", uf: "GO" })
    expect(res.status).toBe(200)
    expect(geocodificarCamposEndereco).toHaveBeenCalled()
    expect(builder.set.mock.calls[0][0].enderecoLat).toBe(-16.82)
  })
})
