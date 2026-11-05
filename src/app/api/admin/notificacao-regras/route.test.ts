import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/notificar", () => ({
  TIPO_REGRA_GLOBAL: "TODOS",
  ROLES_GLOBAIS_PADRAO: ["ADMIN", "SUDO"],
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
}))

import { GET, PUT } from "./route"

const sessionAdmin = { user: { id: "1", role: "ADMIN", name: "Admin" } } as any
const sessionComercial = { user: { id: "2", role: "COMERCIAL", name: "Vendedor" } } as any

const regras = [
  { id: 1, tipo: "SOLICITACAO_CRIADA", roles: ["COMERCIAL"] },
  { id: 2, tipo: "TODOS", roles: ["ADMIN", "SUDO"] },
]

describe("GET /api/admin/notificacao-regras", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(getServerSession).mockReset()
  })

  it("retorna 401 para usuário sem perfil administrativo", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionComercial)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("retorna as regras por tipo e a regra global", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)
    db.select = vi.fn(() => createQueryBuilder(regras))

    const res = await GET()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.regras).toHaveLength(38)
    expect(data.regras.find((r: any) => r.tipo === "SOLICITACAO_CRIADA").roles).toEqual([
      "COMERCIAL",
    ])
    expect(data.regrasGlobais).toEqual({ tipo: "TODOS", roles: ["ADMIN", "SUDO"] })
  })

  it("usa ADMIN e SUDO quando a regra global não existe no banco", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)
    db.select = vi.fn(() => createQueryBuilder([regras[0]]))

    const res = await GET()
    const data = await res.json()
    expect(data.regrasGlobais.roles).toEqual(["ADMIN", "SUDO"])
  })
})

describe("PUT /api/admin/notificacao-regras", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(getServerSession).mockReset()
  })

  function put(body: any) {
    return PUT(
      new NextRequest("http://localhost/api/admin/notificacao-regras", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      })
    )
  }

  it("retorna 401 para usuário sem perfil administrativo", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionComercial)
    const res = await put({ tipo: "TODOS", roles: ["ADMIN"] })
    expect(res.status).toBe(401)
  })

  it("rejeita tipo desconhecido", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)
    const res = await put({ tipo: "TIPO_QUE_NAO_EXISTE", roles: ["ADMIN"] })
    expect(res.status).toBe(400)
  })

  it("salva a regra global de administradores", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)
    db.select = vi.fn(() => createQueryBuilder([{ id: 2 }]))
    db.update = vi.fn(() => createQueryBuilder(undefined))

    const res = await put({ tipo: "TODOS", roles: ["ADMIN"] })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(db.update).toHaveBeenCalled()
  })

  it("cria a regra global quando ela ainda não existe", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)
    db.select = vi.fn(() => createQueryBuilder([]))
    db.insert = vi.fn(() => createQueryBuilder(undefined))

    const res = await put({ tipo: "TODOS", roles: ["ADMIN", "SUDO"] })
    expect(res.status).toBe(200)
    expect(db.insert).toHaveBeenCalled()
  })
})
