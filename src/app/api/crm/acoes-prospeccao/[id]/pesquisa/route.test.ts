// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { sendCrmEmail } from "@/lib/email"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/email", () => ({ sendCrmEmail: vi.fn() }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

describe("POST /api/crm/acoes-prospeccao/[id]/pesquisa", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(sendCrmEmail).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    vi.mocked(sendCrmEmail).mockResolvedValue({ id: "mail-1" } as any)
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await POST(new Request("http://localhost/api/crm/acoes-prospeccao/1/pesquisa", { method: "POST", body: JSON.stringify({ email: "a@b.com" }) }), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(401)
  })

  it("retorna 400 para email inv�lido", async () => {
    const res = await POST(new Request("http://localhost/api/crm/acoes-prospeccao/1/pesquisa", { method: "POST", body: JSON.stringify({ email: "invalido" }) }), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(400)
  })

  it("retorna 404 se a��o n�o existe", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([]))
    const res = await POST(new Request("http://localhost/api/crm/acoes-prospeccao/1/pesquisa", { method: "POST", body: JSON.stringify({ email: "a@b.com" }) }), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(404)
  })

  it("cria pesquisa, grava respostas e envia email", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([{ id: 1, dataAcao: "2026-08-10" }]))
    ;(db.insert as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(createQueryBuilder([{ id: 99, acaoId: 1, email: "a@b.com" }]))
      .mockReturnValueOnce(createQueryBuilder([{ id: 1 }]))
    const res = await POST(new Request("http://localhost/api/crm/acoes-prospeccao/1/pesquisa", { method: "POST", body: JSON.stringify({ email: "a@b.com", nome: "Cliente", respostas: [{ pergunta: "Nota", resposta: "10" }] }) }), { params: Promise.resolve({ id: "1" }) })
    expect(res.status).toBe(201)
    expect(db.insert).toHaveBeenCalledTimes(2)
    expect(sendCrmEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@b.com", subject: expect.stringContaining("Pesquisa de Satisfa��o") }))
  })
})
