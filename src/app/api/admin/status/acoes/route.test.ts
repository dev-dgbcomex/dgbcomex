// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST, PUT, DELETE } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/notificar", () => ({
  registrarLog: vi.fn(),
  notificar: vi.fn(),
  notificarErro: vi.fn(),
  notificarDelecao: vi.fn(),
}))
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const sessionAdmin = {
  session: { user: { id: "1", role: "ADMIN", name: "Tiago" } },
  userId: 1,
}

function req(method: string, url: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe("/api/admin/status/acoes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET(req("GET", "/api/admin/status/acoes?statusId=1"))
    expect(res.status).toBe(401)
  })

  it("exige statusId no GET", async () => {
    const res = await GET(req("GET", "/api/admin/status/acoes"))
    expect(res.status).toBe(400)
  })

  it("lista os gatilhos do status", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      createQueryBuilder([{ id: 10, statusId: 1, acao: "VIRAR_CLIENTE", parametros: {} }])
    )

    const res = await GET(req("GET", "/api/admin/status/acoes?statusId=1"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].acao).toBe("VIRAR_CLIENTE")
  })

  it("recusa ação que não se aplica ao tipo do status", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([{ id: 1, tipo: "PROPOSTA" }]))

    const res = await POST(
      req("POST", "/api/admin/status/acoes", { statusId: 1, acao: "VIRAR_CLIENTE" })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/não se aplica/)
  })

  it("recusa ação inexistente", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([{ id: 1, tipo: "OPORTUNIDADE" }]))

    const res = await POST(
      req("POST", "/api/admin/status/acoes", { statusId: 1, acao: "ACAO_QUALQUER" })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("Ação inválida")
  })

  it("cria o gatilho do status", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([{ id: 1, tipo: "OPORTUNIDADE" }]))
    vi.mocked(db.insert).mockReturnValueOnce(
      createQueryBuilder([{ id: 11, statusId: 1, acao: "VIRAR_CLIENTE", parametros: {} }])
    )

    const res = await POST(
      req("POST", "/api/admin/status/acoes", { statusId: 1, acao: "VIRAR_CLIENTE" })
    )
    expect(res.status).toBe(201)
    expect((await res.json()).acao).toBe("VIRAR_CLIENTE")
  })

  it("bloqueia criação para usuário sem perfil administrativo", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "2", role: "CRM" } },
      userId: 2,
    } as any)

    const res = await POST(
      req("POST", "/api/admin/status/acoes", { statusId: 1, acao: "VIRAR_CLIENTE" })
    )
    expect(res.status).toBe(403)
  })

  it("atualiza os parâmetros do gatilho", async () => {
    vi.mocked(db.update).mockReturnValueOnce(
      createQueryBuilder([{ id: 10, statusId: 1, acao: "NOTIFICAR_RESPONSAVEL" }])
    )

    const res = await PUT(
      req("PUT", "/api/admin/status/acoes", {
        id: 10,
        parametros: { mensagem: "Aviso" },
      })
    )
    expect(res.status).toBe(200)
    expect((await res.json()).id).toBe(10)
  })

  it("exclui o gatilho", async () => {
    vi.mocked(db.delete).mockReturnValueOnce(createQueryBuilder(undefined))

    const res = await DELETE(req("DELETE", "/api/admin/status/acoes", { id: 10 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })
})
