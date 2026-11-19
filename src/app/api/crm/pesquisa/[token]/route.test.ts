// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { notificarErro } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))

vi.mock("@/lib/notificar", () => ({
  notificarErro: vi.fn(),
}))

const token = "token-publico"
const respostas = [
  { pergunta: "Como voce avaliaria o atendimento?", tipo: "ESTRELAS", resposta: "5" },
  { pergunta: "Observacoes livres", tipo: "ABERTA", resposta: "Otimo" },
]

function get() {
  return GET(new NextRequest(`http://localhost/api/crm/pesquisa/${token}`), {
    params: Promise.resolve({ token }),
  })
}

function post(body: unknown) {
  return POST(
    new NextRequest(`http://localhost/api/crm/pesquisa/${token}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ token }) }
  )
}

function pesquisaAcao(status = "ENVIADO") {
  return {
    id: 7,
    acaoId: 42,
    email: "cliente@example.com",
    nome: "Cliente",
    token,
    status,
    enviadoEm: new Date("2026-08-09T12:00:00Z"),
    abertoEm: null,
    respondidoEm: null,
    criadoPor: 1,
    createdAt: new Date("2026-08-09T12:00:00Z"),
  }
}

function pesquisaVisita(status = "ENVIADO") {
  return {
    id: 9,
    visitaId: 15,
    email: "cliente@example.com",
    nome: "Cliente",
    token,
    status,
    enviadoEm: new Date("2026-07-09T12:00:00Z"),
    abertoEm: null,
    respondidoEm: null,
    criadoPor: 1,
    createdAt: new Date("2026-07-09T12:00:00Z"),
  }
}

beforeEach(() => {
  resetDb(db)
  vi.mocked(notificarErro).mockReset()
})

describe("GET /api/crm/pesquisa/[token]", () => {
  it("resolve token de ação de prospecção antes de visita", async () => {
    db.select
      .mockReturnValueOnce(createQueryBuilder([pesquisaAcao()]))
      .mockReturnValueOnce(createQueryBuilder([{ id: 42, dataAcao: "2026-08-10" }]))
    db.update.mockReturnValue(createQueryBuilder([{ id: 7 }]))

    const res = await get()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toMatchObject({
      origem: "acao",
      acaoId: 42,
      visitaId: null,
      dataAcao: "2026-08-10",
    })
    expect(data.token).toBeUndefined()
    expect(db.update).toHaveBeenCalled()
    expect(db.update.mock.results[0].value.set.mock.calls[0][0]).toMatchObject({
      status: "ABERTO",
    })
  })

  it("marca pesquisa de ação já respondida", async () => {
    db.select.mockReturnValueOnce(createQueryBuilder([pesquisaAcao("RESPONDIDO")]))

    const res = await get()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.alreadyAnswered).toBe(true)
    expect(db.update).not.toHaveBeenCalled()
  })

  it("mantém fallback para token de visita", async () => {
    db.select
      .mockReturnValueOnce(createQueryBuilder([]))
      .mockReturnValueOnce(createQueryBuilder([pesquisaVisita()]))
      .mockReturnValueOnce(createQueryBuilder([{ id: 15, dataVisita: "2026-07-10" }]))
    db.update.mockReturnValue(createQueryBuilder([{ id: 9 }]))

    const res = await get()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toMatchObject({
      origem: "visita",
      visitaId: 15,
      acaoId: null,
      dataVisita: "2026-07-10",
    })
  })

  it("retorna 404 quando o token não existe", async () => {
    db.select.mockReturnValueOnce(createQueryBuilder([])).mockReturnValueOnce(createQueryBuilder([]))

    const res = await get()

    expect(res.status).toBe(404)
  })
})

describe("POST /api/crm/pesquisa/[token]", () => {
  it("grava respostas na tabela de ações quando o token pertence a uma ação", async () => {
    db.select.mockReturnValueOnce(createQueryBuilder([pesquisaAcao("ABERTO")]))
    db.insert.mockReturnValue(createQueryBuilder([{ id: 1 }]))
    db.update.mockReturnValue(createQueryBuilder([{ id: 7 }]))

    const res = await post({ respostas })

    expect(res.status).toBe(200)
    expect(db.insert.mock.results[0].value.values.mock.calls[0][0]).toEqual([
      {
        pesquisaId: 7,
        pergunta: "Como voce avaliaria o atendimento?",
        tipo: "ESTRELAS",
        resposta: "5",
      },
      { pesquisaId: 7, pergunta: "Observacoes livres", tipo: "ABERTA", resposta: "Otimo" },
    ])
    expect(db.update.mock.results[0].value.set.mock.calls[0][0]).toMatchObject({
      status: "RESPONDIDO",
    })
  })

  it("mantém gravação na tabela de visitas para tokens antigos", async () => {
    db.select
      .mockReturnValueOnce(createQueryBuilder([]))
      .mockReturnValueOnce(createQueryBuilder([pesquisaVisita("ABERTO")]))
    db.insert.mockReturnValue(createQueryBuilder([{ id: 1 }]))
    db.update.mockReturnValue(createQueryBuilder([{ id: 9 }]))

    const res = await post({ respostas })

    expect(res.status).toBe(200)
    expect(db.insert.mock.results[0].value.values.mock.calls[0][0][0]).toMatchObject({
      pesquisaId: 9,
      resposta: "5",
    })
  })

  it("valida respostas obrigatórias", async () => {
    const res = await post({ respostas: [] })

    expect(res.status).toBe(400)
    expect(db.select).not.toHaveBeenCalled()
  })
})
