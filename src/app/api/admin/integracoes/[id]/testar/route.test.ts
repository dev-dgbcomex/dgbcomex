import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
}))

const session = { user: { id: "1" } }
const fetchMock = vi.fn()

function get(id: string, query = "") {
  const url = `http://localhost/api/admin/integracoes/${id}/testar${query}`
  return GET(new NextRequest(url), { params: Promise.resolve({ id }) })
}

describe("GET /api/admin/integracoes/[id]/testar", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    resetDb(db)
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    vi.mocked(getServerSession).mockResolvedValue(session as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna 401 quando não está autenticado", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    const res = await get("1")
    expect(res.status).toBe(401)
  })

  it("retorna 404 quando a integração não existe", async () => {
    db.select = vi.fn(() => createQueryBuilder([]))
    const res = await get("99")
    expect(res.status).toBe(404)
  })

  it("faz login e usa o token nas integrações com tipoAuth login", async () => {
    db.select = vi.fn(() =>
      createQueryBuilder([
        {
          id: 4,
          nome: "BI Microdata",
          baseUrl: "https://api.exemplo.com/kpi",
          tipoAuth: "login",
          authConfig: {
            login_url: "https://api.exemplo.com/auth/login",
            email: "servico@exemplo.com",
            senha: "segredo123",
          },
        },
      ])
    )
    fetchMock.mockImplementation(async (input: any) => {
      const url = String(input)
      if (url.includes("/auth/login")) {
        return new Response(JSON.stringify({ token: "toklogin123456789012345" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ Valor: 200 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const res = await get("4")
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.responseBody).toEqual({ Valor: 200 })
    expect(data.requestHeaders.Authorization).toBe("Bearer tokl****2345")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain("/auth/login")
  })

  it("troca {data} pela data de hoje quando a query não traz a data", async () => {
    db.select = vi.fn(() =>
      createQueryBuilder([
        {
          id: 1,
          nome: "Faturamento do Dia",
          baseUrl: "https://api.exemplo.com/faturamento/{data}",
          tipoAuth: "bearer",
          authConfig: { token: "tok123" },
        },
      ])
    )
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ Valor: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const res = await get("1")
    const data = await res.json()
    const hoje = new Date()
    const esperada = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
      hoje.getDate()
    ).padStart(2, "0")}`
    expect(data.request.url).toBe(`https://api.exemplo.com/faturamento/${esperada}`)
  })

  it("usa o {data} da query quando ele vem", async () => {
    db.select = vi.fn(() =>
      createQueryBuilder([
        {
          id: 1,
          nome: "Faturamento do Dia",
          baseUrl: "https://api.exemplo.com/faturamento/{data}",
          tipoAuth: "bearer",
          authConfig: { token: "tok123" },
        },
      ])
    )
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ Valor: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const res = await get("1", "?data=2026-10-05")
    const data = await res.json()
    expect(data.request.url).toBe("https://api.exemplo.com/faturamento/2026-10-05")
  })

  it("avisa quando o login falha", async () => {
    db.select = vi.fn(() =>
      createQueryBuilder([
        {
          id: 5,
          nome: "BI Microdata",
          baseUrl: "https://api.exemplo.com/kpi",
          tipoAuth: "login",
          authConfig: {
            login_url: "https://api.exemplo.com/auth/login",
            email: "servico@exemplo.com",
            senha: "errada",
          },
        },
      ])
    )
    fetchMock.mockResolvedValue(new Response("401 Unauthorized", { status: 401 }))

    const res = await get("5")
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain("Falha no login")
  })
})
