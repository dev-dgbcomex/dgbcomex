// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { getServerSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { notificar, notificarDelecao, registrarLog } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { DELETE } from "./route"

vi.mock("@/lib/auth", () => ({
  authOptions: {},
  requireAuth: vi.fn(),
  getServerSession: vi.fn(),
}))
vi.mock("@/lib/notificar", () => ({
  notificar: vi.fn(),
  notificarDelecao: vi.fn(),
  registrarLog: vi.fn(),
  notificarErro: vi.fn(),
}))
vi.mock("@/lib/db", () => ({ db: { delete: vi.fn() } }))

function del(id: string) {
  return DELETE(new NextRequest(`http://localhost/api/solicitacoes/${id}`), {
    params: Promise.resolve({ id }),
  })
}

describe("DELETE /api/solicitacoes/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(notificarDelecao).mockReset()
    resetDb(db)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Tiago", role: "ADMIN" },
    } as any)
    db.delete = vi.fn(() => createQueryBuilder(undefined))
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    const res = await del("1")
    expect(res.status).toBe(401)
  })

  it("retorna 403 para perfil comum", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Jo", role: "GERENTE" },
    } as any)
    const res = await del("1")
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Sem permissão para excluir" })
    expect(db.delete).not.toHaveBeenCalled()
  })

  it.each(["COMERCIAL", "CRM"])("perfil %s exclui solicitação", async (role) => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Ana", role },
    } as any)

    const res = await del("7")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.delete).toHaveBeenCalledTimes(2)
    expect(notificarDelecao).toHaveBeenCalled()
  })
})
