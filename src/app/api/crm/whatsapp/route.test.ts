// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { idsContatosDoCliente, idsPessoasDoCliente } from "@/lib/crm/cliente-relacionamentos"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/crm-timeline", () => ({ inserirTimelineEvento: vi.fn() }))
vi.mock("@/lib/crm/cliente-relacionamentos", () => ({
  idsPessoasDoCliente: vi.fn(),
  idsContatosDoCliente: vi.fn(),
}))
vi.mock("@/lib/evolution-api", () => ({
  enviarMensagem: vi.fn(),
  evolutionConfigurado: vi.fn(() => false),
}))

function get(url: string) {
  return GET(new NextRequest(url))
}

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/crm/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("GET /api/crm/whatsapp", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(idsPessoasDoCliente).mockReset()
    vi.mocked(idsContatosDoCliente).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(idsPessoasDoCliente).mockResolvedValue([7])
    vi.mocked(idsContatosDoCliente).mockResolvedValue([100])
    db.select = vi.fn(() => createQueryBuilder([{ id: 1, mensagem: "Olá" }]))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await get("http://localhost/api/crm/whatsapp?empresaId=7")
    expect(res.status).toBe(401)
  })

  it("lista a conversa da pessoa", async () => {
    const res = await get("http://localhost/api/crm/whatsapp?empresaId=7")
    expect(res.status).toBe(200)
    expect(idsPessoasDoCliente).not.toHaveBeenCalled()
  })

  it("lista a conversa do cliente com as pessoas e contatos promovidos", async () => {
    const res = await get("http://localhost/api/crm/whatsapp?clienteId=5")
    expect(res.status).toBe(200)
    expect(idsPessoasDoCliente).toHaveBeenCalledWith(5)
    expect(idsContatosDoCliente).toHaveBeenCalledWith(5)
    const builder = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(builder.where).toHaveBeenCalled()
  })
})

describe("POST /api/crm/whatsapp", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(inserirTimelineEvento).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(inserirTimelineEvento).mockResolvedValue(undefined as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post({ mensagem: "Olá" })
    expect(res.status).toBe(401)
  })

  it("envia a mensagem do cliente usando o contato principal e registra na timeline", async () => {
    const contato = {
      id: 100,
      nome: "Ana",
      whatsapp: "5511999990001",
      principal: true,
      empresaId: null,
    }
    db.select = vi.fn(() => createQueryBuilder([contato]))
    db.insert = vi.fn(() =>
      createQueryBuilder([{ id: 55, mensagem: "Olá", clienteId: 5, empresaId: null }])
    )

    const res = await post({ clienteId: 5, mensagem: "Olá" })
    expect(res.status).toBe(201)

    const insertBuilder = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value
    const valores = insertBuilder.values.mock.calls[0][0]
    expect(valores.clienteId).toBe(5)
    expect(valores.remoteJid).toBe("5511999990001")

    expect(inserirTimelineEvento).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 5, tipo: "WHATSAPP" })
    )
  })
})
