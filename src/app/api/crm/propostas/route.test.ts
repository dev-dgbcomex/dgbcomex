// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { registrarLog } from "@/lib/notificar"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { clienteIdDaPessoa, idsPessoasDoCliente } from "@/lib/crm/cliente-relacionamentos"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn(), notificar: vi.fn() }))
vi.mock("@/lib/crm/notificar-atividade", () => ({ notificarAtividadeComercial: vi.fn() }))
vi.mock("@/lib/crm-timeline", () => ({ inserirTimelineEvento: vi.fn() }))
vi.mock("@/lib/crm/cliente-relacionamentos", () => ({
  idsPessoasDoCliente: vi.fn(),
  clienteIdDaPessoa: vi.fn(),
}))

function get(url: string) {
  return GET(new NextRequest(url))
}

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/crm/propostas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("/api/crm/propostas", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(idsPessoasDoCliente).mockReset()
    vi.mocked(clienteIdDaPessoa).mockReset()
    vi.mocked(registrarLog).mockReset()
    vi.mocked(inserirTimelineEvento).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(idsPessoasDoCliente).mockResolvedValue([7])
    vi.mocked(clienteIdDaPessoa).mockResolvedValue(null)
    vi.mocked(registrarLog).mockResolvedValue(undefined as any)
    vi.mocked(inserirTimelineEvento).mockResolvedValue(undefined as any)
    db.select = vi.fn(() => createQueryBuilder([]))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await get("http://localhost/api/crm/propostas")
    expect(res.status).toBe(401)
  })

  it("lista as propostas do cliente incluindo as pessoas promovidas", async () => {
    const res = await get("http://localhost/api/crm/propostas?clienteId=5")
    expect(res.status).toBe(200)
    expect(idsPessoasDoCliente).toHaveBeenCalledWith(5)
    const builder = (db.select as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(builder.where).toHaveBeenCalled()
  })

  it("vincula ao cliente a proposta criada em uma pessoa promovida", async () => {
    vi.mocked(clienteIdDaPessoa).mockResolvedValue(5)
    db.insert = vi.fn(() =>
      createQueryBuilder([{ id: 20, titulo: "Proposta", empresaId: 7, clienteId: 5 }])
    )

    const res = await post({ titulo: "Proposta", empresaId: 7 })
    expect(res.status).toBe(201)

    const insertBuilder = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value
    const valores = insertBuilder.values.mock.calls[0][0]
    expect(valores.clienteId).toBe(5)

    expect(inserirTimelineEvento).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 7, clienteId: 5 })
    )
  })
})
