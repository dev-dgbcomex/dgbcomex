// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notificarDelecao } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { DELETE, PUT } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/notificar", () => ({
  registrarLog: vi.fn(),
  notificar: vi.fn(),
  notificarErro: vi.fn(),
  notificarDelecao: vi.fn(),
}))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() } }))

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }

function del(id: string) {
  return DELETE(new NextRequest(`http://localhost/api/crm/equipes/${id}`), {
    params: Promise.resolve({ id }),
  })
}

function put(id: string) {
  return PUT(
    new NextRequest(`http://localhost/api/crm/equipes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Equipe Norte" }),
    }),
    { params: Promise.resolve({ id }) }
  )
}

describe("/api/crm/equipes/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(notificarDelecao).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    db.select = vi.fn(() => createQueryBuilder([{ id: 1, nome: "Antiga" }]))
    db.update = vi.fn(() => createQueryBuilder([{ id: 1, nome: "Equipe Norte" }]))
    db.delete = vi.fn(() => createQueryBuilder(undefined))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    expect((await del("1")).status).toBe(401)
    expect((await put("1")).status).toBe(401)
  })

  it("retorna 403 para perfil comum", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "GERENTE" } },
      userId: 2,
    } as any)
    const res = await del("1")
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Sem permissão para excluir" })
    expect(db.delete).not.toHaveBeenCalled()
  })

  it.each(["COMERCIAL", "CRM"])("perfil %s exclui e edita equipe", async (role) => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role, name: "Ana" } },
      userId: 2,
    } as any)

    const exclusao = await del("1")
    expect(exclusao.status).toBe(200)
    expect(await exclusao.json()).toEqual({ success: true })
    expect(notificarDelecao).toHaveBeenCalled()

    const edicao = await put("1")
    expect(edicao.status).toBe(200)
    expect(db.update).toHaveBeenCalled()
  })
})
