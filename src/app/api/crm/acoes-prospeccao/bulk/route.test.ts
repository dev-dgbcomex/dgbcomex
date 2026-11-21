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

function patch(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

function del(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/crm/acoes-prospeccao/bulk", {
    method: "DELETE",
    body: JSON.stringify(body),
  })
}

describe("PATCH /api/crm/acoes-prospeccao/bulk", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(notificar).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    db.update = vi.fn(() => createQueryBuilder(undefined))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await PATCH(patch({ ids: [1], status: "CANCELADA" }))
    expect(res.status).toBe(401)
  })

  it("atualiza status em lote", async () => {
    const res = await PATCH(patch({ ids: [1, 2], status: "CANCELADA" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ updated: 2 })
  })

  it.each(["COMERCIAL", "CRM"])(
    "perfil %s altera ações de outros usuários",
    async (role) => {
      vi.mocked(requireAuth).mockResolvedValue({
        session: { user: { id: "2", role, name: "Ana" } },
        userId: 2,
      } as any)

      const res = await PATCH(patch({ ids: [1], status: "CANCELADA" }))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ updated: 1 })
      expect(db.update).toHaveBeenCalled()
    }
  )

  it("retorna 403 para perfil comum alterando ações de outros", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "GERENTE" } },
      userId: 2,
    } as any)
    db.select = vi.fn(() => createQueryBuilder([{ id: 1, criadoPor: 99 }]))

    const res = await PATCH(patch({ ids: [1], status: "CANCELADA" }))

    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/crm/acoes-prospeccao/bulk", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(notificar).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    db.delete = vi.fn(() => createQueryBuilder(undefined))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await DELETE(del({ ids: [1] }))
    expect(res.status).toBe(401)
  })

  it("exclui em lote e notifica com tipo ACAO_PROSPECCAO_EXCLUIDA", async () => {
    const res = await DELETE(del({ ids: [1, 2] }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: 2 })
    expect(notificar).toHaveBeenCalledWith(
      "ACAO_PROSPECCAO_EXCLUIDA",
      expect.stringContaining("excluída"),
      "/comercial/crm/acoes-prospeccao",
      "Tiago"
    )
  })

  it.each(["COMERCIAL", "CRM"])("perfil %s exclui ações de outros usuários", async (role) => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role, name: "Ana" } },
      userId: 2,
    } as any)

    const res = await DELETE(del({ ids: [1, 2] }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: 2 })
    expect(db.delete).toHaveBeenCalled()
  })

  it("retorna 403 para papel sem permissão", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "GERENTE" } },
      userId: 2,
    } as any)

    const res = await DELETE(del({ ids: [1] }))

    expect(res.status).toBe(403)
  })
})
