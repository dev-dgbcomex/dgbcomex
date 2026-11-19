// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notificar } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { DELETE, PATCH } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() } }))
vi.mock("@/lib/notificar", () => ({ notificar: vi.fn() }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

describe("PATCH /api/crm/acoes-prospeccao/bulk", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(notificar).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await PATCH(new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", { method: "PATCH", body: JSON.stringify({ ids: [1], status: "CANCELADA" }) }))
    expect(res.status).toBe(401)
  })

  it("atualiza status em lote", async () => {
    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(createQueryBuilder(undefined))
    const res = await PATCH(new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", { method: "PATCH", body: JSON.stringify({ ids: [1, 2], status: "CANCELADA" }) }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ updated: 2 })
  })

  it("retorna 403 para n�o-admin alterando a��es de outros", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ session: { user: { id: "2", role: "COMERCIAL" } }, userId: 2 } as any)
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(createQueryBuilder([{ id: 1, criadoPor: 99 }]))
    const res = await PATCH(new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", { method: "PATCH", body: JSON.stringify({ ids: [1], status: "CANCELADA" }) }))
    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/crm/acoes-prospeccao/bulk", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(notificar).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any)
    const res = await DELETE(new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", { method: "DELETE", body: JSON.stringify({ ids: [1] }) }))
    expect(res.status).toBe(401)
  })

  it("exclui em lote e notifica com tipo ACAO_PROSPECCAO_EXCLUIDA", async () => {
    ;(db.delete as ReturnType<typeof vi.fn>).mockReturnValue(createQueryBuilder(undefined))
    const res = await DELETE(new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", { method: "DELETE", body: JSON.stringify({ ids: [1, 2] }) }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: 2 })
    expect(notificar).toHaveBeenCalledWith("ACAO_PROSPECCAO_EXCLUIDA", expect.stringContaining("excluída"), "/comercial/crm/acoes-prospeccao", "Tiago")
  })

  it("retorna 403 para papel sem permiss�o", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ session: { user: { id: "2", role: "GERENTE" } }, userId: 2 } as any)
    const res = await DELETE(new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", { method: "DELETE", body: JSON.stringify({ ids: [1] }) }))
    expect(res.status).toBe(403)
  })
})
