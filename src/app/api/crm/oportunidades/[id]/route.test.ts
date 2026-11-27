// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notificarDelecao } from "@/lib/notificar"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, DELETE, PUT } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/notificar", () => ({
  registrarLog: vi.fn(),
  notificar: vi.fn(),
  notificarErro: vi.fn(),
  notificarDelecao: vi.fn(),
}))
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), transaction: vi.fn(), update: vi.fn() },
}))
vi.mock("@/lib/crm/automacoes-crm", () => ({ processarAutomacaoCRM: vi.fn() }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

function get(id: string) {
  return GET(new NextRequest(`http://localhost/api/crm/oportunidades/${id}`), {
    params: Promise.resolve({ id }),
  })
}

function del(id: string) {
  return DELETE(new NextRequest(`http://localhost/api/crm/oportunidades/${id}`), {
    params: Promise.resolve({ id }),
  })
}

function txMock() {
  return {
    select: vi.fn(() => createQueryBuilder([])),
    delete: vi.fn(() => createQueryBuilder(undefined)),
    update: vi.fn(() => createQueryBuilder(undefined)),
  }
}

describe("GET /api/crm/oportunidades/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await get("1")
    expect(res.status).toBe(401)
  })

  it("retorna 404 quando a oportunidade não existe", async () => {
    db.select.mockReturnValueOnce(createQueryBuilder([]))
    const res = await get("99")
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Oportunidade não encontrada" })
  })

  it("retorna a oportunidade com faturamentos e pedidos de venda", async () => {
    const oportunidade = {
      id: 1,
      titulo: "Venda de malha 100% algodão",
      contatoId: null,
      propostas: [],
    }
    db.select
      .mockReturnValueOnce(createQueryBuilder([oportunidade]))
      .mockReturnValueOnce(createQueryBuilder([]))
      .mockReturnValueOnce(
        createQueryBuilder([
          { id: 10, numero: "NF-001", status: "EMITIDO", origem: "MANUAL", total: 1250 },
        ])
      )
      .mockReturnValueOnce(
        createQueryBuilder([
          {
            id: 11,
            numero: "PV-001",
            status: "FATURADO",
            statusErp: "ABERTO",
            statusErpCodigo: "2",
            origem: "ERP",
            total: 850,
          },
        ])
      )

    const res = await get("1")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.propostas).toEqual([])
    expect(body.faturamentos).toHaveLength(1)
    expect(body.faturamentos[0]).toMatchObject({ numero: "NF-001", total: 1250 })
    expect(body.pedidosVenda).toHaveLength(1)
    expect(body.pedidosVenda[0]).toMatchObject({
      numero: "PV-001",
      status: "FATURADO",
      statusErp: "ABERTO",
      statusErpCodigo: "2",
      total: 850,
    })
    expect(db.select).toHaveBeenCalledTimes(4)
  })
})

describe("DELETE /api/crm/oportunidades/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    db.transaction = vi.fn((cb: any) => cb(txMock()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await del("1")
    expect(res.status).toBe(401)
  })

  it("retorna 403 para perfil comum", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "GERENTE" } },
      userId: 2,
    } as any)
    const res = await del("1")
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Sem permissão para excluir" })
  })

  it.each(["COMERCIAL", "CRM"])("perfil %s exclui oportunidade", async (role) => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role, name: "Ana" } },
      userId: 2,
    } as any)
    const res = await del("5")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.transaction).toHaveBeenCalled()
  })

  it("exclui a oportunidade e tudo vinculado em transação", async () => {
    const res = await del("5")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.transaction).toHaveBeenCalled()
    expect(notificarDelecao).toHaveBeenCalledWith("Oportunidade CRM", "5", "Tiago")
  })

  it("propaga erro quando a exclusão falha", async () => {
    db.transaction = vi.fn(() => {
      throw new Error("fk violation")
    })
    const res = await del("5")
    expect(res.status).toBe(500)
  })
})

describe("PUT /api/crm/oportunidades/[id]", () => {
  const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

  function put(id: string, body: Record<string, unknown>) {
    return PUT(
      new NextRequest(`http://localhost/api/crm/oportunidades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    )
  }

  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(sessionAdmin as any)
    vi.mocked(processarAutomacaoCRM).mockReset().mockResolvedValue({
      ok: true,
      registro: { id: 1, status: "PROPOSTA" },
      avisos: [],
      gatilhos: { executadas: [], puladas: [], erros: [] },
    } as any)
    resetDb(db)
    vi.mocked(db.update).mockReturnValue(createQueryBuilder([{ id: 1, status: "PROPOSTA" }]))
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([]))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("bloqueia alterar para PROPOSTA sem valor estimado e probabilidade", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([{ id: 1, status: "NOVO", valorEstimado: null, probabilidade: null }])
    )
    const res = await put("1", { status: "PROPOSTA" })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.validacaoObrigatoria.campos).toEqual(["valorEstimado", "probabilidade"])
    expect(processarAutomacaoCRM).not.toHaveBeenCalled()
  })

  it("bloqueia limpar valor estimado quando já está em PROPOSTA", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([{ id: 1, status: "PROPOSTA", valorEstimado: 100, probabilidade: 50 }])
    )
    const res = await put("1", { status: "PROPOSTA", valorEstimado: null })
    expect(res.status).toBe(409)
    expect(processarAutomacaoCRM).not.toHaveBeenCalled()
  })

  it("permite alterar para PROPOSTA com valores válidos", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([{ id: 1, status: "NOVO", valorEstimado: null, probabilidade: null }])
    )
    const res = await put("1", { status: "PROPOSTA", valorEstimado: 250, probabilidade: 30 })
    expect(res.status).toBe(200)
    expect(processarAutomacaoCRM).toHaveBeenCalledWith(
      expect.objectContaining({ statusNovo: "PROPOSTA", entidadeId: 1 })
    )
    expect(db.update).toHaveBeenCalled()
  })

  it("permite editar título sem alterar status quando valores existentes são válidos", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([{ id: 1, status: "PROPOSTA", valorEstimado: 100, probabilidade: 50 }])
    )
    const res = await put("1", { titulo: "Novo título" })
    expect(res.status).toBe(200)
    expect(processarAutomacaoCRM).not.toHaveBeenCalled()
  })

  it("permite NOVO e QUALIFICACAO sem campos obrigatórios", async () => {
    for (const status of ["NOVO", "QUALIFICACAO"]) {
      vi.mocked(db.select).mockReturnValue(
        createQueryBuilder([{ id: 1, status, valorEstimado: null, probabilidade: null }])
      )
      const res = await put("1", { status })
      expect(res.status).toBe(200)
    }
  })
})
