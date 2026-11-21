// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { notificar, notificarDelecao, registrarLog } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { DELETE, PUT } from "./route"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/notificar", () => ({
  notificar: vi.fn(),
  notificarDelecao: vi.fn(),
  registrarLog: vi.fn(),
  notificarErro: vi.fn(),
}))
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
}))

function put(id: string, body: Record<string, unknown>) {
  return PUT(
    new NextRequest(`http://localhost/api/cadastros/produto-cru/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
}

function del(id: string) {
  return DELETE(new NextRequest(`http://localhost/api/cadastros/produto-cru/${id}`), {
    params: Promise.resolve({ id }),
  })
}

describe("/api/cadastros/produto-cru/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(notificar).mockReset()
    vi.mocked(notificarDelecao).mockReset()
    vi.mocked(registrarLog).mockReset()
    resetDb(db)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Tiago", role: "ADMIN" },
    } as any)
    db.select = vi.fn(() => createQueryBuilder([]))
    db.delete = vi.fn(() => createQueryBuilder(undefined))
    db.transaction = vi.fn((cb: any) =>
      cb({ update: vi.fn(() => createQueryBuilder([{ id: 1, status: "APROVADO" }])) })
    )
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    expect((await put("1", { status: "APROVADO" })).status).toBe(401)
    expect((await del("1")).status).toBe(401)
  })

  it("retorna 403 para perfil comum aprovar/reprovar", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Jo", role: "GERENTE" },
    } as any)
    const res = await put("1", { status: "APROVADO" })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Sem permissão para aprovar/reprovar produtos" })
  })

  it("retorna 403 para perfil comum excluir", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Jo", role: "GERENTE" },
    } as any)
    const res = await del("1")
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Sem permissão para excluir" })
    expect(db.delete).not.toHaveBeenCalled()
  })

  it.each(["COMERCIAL", "CRM"])("perfil %s aprova e exclui produto", async (role) => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Ana", role },
    } as any)

    const aprovacao = await put("1", { status: "APROVADO" })
    expect(aprovacao.status).toBe(200)
    expect(await aprovacao.json()).toMatchObject({ id: 1, status: "APROVADO" })
    expect(db.transaction).toHaveBeenCalled()

    const exclusao = await del("1")
    expect(exclusao.status).toBe(200)
    expect(await exclusao.json()).toEqual({ success: true })
    expect(db.delete).toHaveBeenCalled()
    expect(notificarDelecao).toHaveBeenCalled()
  })
})
