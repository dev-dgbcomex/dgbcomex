import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

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
vi.mock("@/lib/integracao/autenticar", () => ({
  autenticarIntegracao: vi.fn(),
}))

import { autenticarIntegracao } from "@/lib/integracao/autenticar"

const session = { user: { id: "1" } }
const fetchMock = vi.fn()

const integracaoBi = {
  id: 1,
  nome: "BI Microdata",
  baseUrl: "https://bi.exemplo.com/",
  tipoAuth: "bearer",
  authConfig: { token: "tok123" },
}

function chamar(method: "GET" | "POST", query = "", caminho = ["faturamento-detalhe"]) {
  const url = `http://localhost/api/integracao/1/detalhe/${caminho.join("/")}${query}`
  const req = new NextRequest(url, { method, body: method === "POST" ? undefined : undefined })
  return Promise.resolve(
    method === "GET"
      ? GET(req, { params: Promise.resolve({ id: "1", caminho }) })
      : POST(req, { params: Promise.resolve({ id: "1", caminho }) })
  )
}

describe("proxy /api/integracao/[id]/detalhe/[...caminho]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(autenticarIntegracao).mockReset()
    resetDb(db)
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    vi.mocked(getServerSession).mockResolvedValue(session as any)
    vi.mocked(autenticarIntegracao).mockResolvedValue({
      ok: true,
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok123" },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna 401 quando não está autenticado", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    const res = await chamar("GET")
    expect(res.status).toBe(401)
  })

  it("retorna 400 quando o caminho está vazio", async () => {
    const res = await chamar("GET", "", [])
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "caminho vazio" })
  })

  it("retorna 404 quando a integração não existe", async () => {
    db.select = vi.fn(() => createQueryBuilder([]))
    const res = await chamar("GET")
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Integração não encontrada" })
  })

  it("retorna 502 quando a autenticação da integração falha", async () => {
    db.select = vi.fn(() => createQueryBuilder([integracaoBi]))
    vi.mocked(autenticarIntegracao).mockResolvedValue({
      ok: false,
      erro: "Falha no login: 401 Unauthorized",
      status: 401,
    })
    const res = await chamar("GET")
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: "Falha no login: 401 Unauthorized", status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("repassa GET repassando a query e devolvendo o corpo da origem", async () => {
    db.select = vi.fn(() => createQueryBuilder([integracaoBi]))
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ estado: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    const res = await chamar("GET", "?data_inicio=2025-10-01")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ estado: "ok" })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://bi.exemplo.com/faturamento-detalhe?data_inicio=2025-10-01")
    expect(init.method).toBe("GET")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok123")
  })

  it("ignora o parâmetro tela na repassagem", async () => {
    db.select = vi.fn(() => createQueryBuilder([integracaoBi]))
    fetchMock.mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    )
    await chamar("GET", "?tela=bi&pagina=1")
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain("pagina=1")
    expect(url).not.toContain("tela")
  })

  it("repassa POST com corpo e devolve o status da origem", async () => {
    db.select = vi.fn(() => createQueryBuilder([integracaoBi]))
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ itens: 12 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    )
    const req = new NextRequest("http://localhost/api/integracao/1/detalhe/faturamento-detalhe/carga", {
      method: "POST",
      body: JSON.stringify({ forca: true }),
    })
    const res = await POST(req, {
      params: Promise.resolve({ id: "1", caminho: ["faturamento-detalhe", "carga"] }),
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ itens: 12 })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://bi.exemplo.com/faturamento-detalhe/carga")
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ forca: true }))
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  it("repassa a resposta de erro da origem (ex: 409 sem carga)", async () => {
    db.select = vi.fn(() => createQueryBuilder([integracaoBi]))
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Carga completa não realizada" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    )
    const res = await chamar("POST", "", ["faturamento-detalhe", "sync"])
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ detail: "Carga completa não realizada" })
  })
})