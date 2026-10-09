import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Integracao } from "@/lib/db/schema/integracoes"
import { autenticarIntegracao, loginTokenCache } from "./autenticar"

const fetchMock = vi.fn()

function integracao(parcial: Partial<Integracao>): Integracao {
  return {
    id: 1,
    nome: "BI",
    baseUrl: "https://api.exemplo.com",
    tipoAuth: "bearer",
    authConfig: {},
    telas: [],
    mapping: {},
    ativo: true,
    createdAt: null,
    updatedAt: null,
    ...parcial,
  }
}

describe("autenticarIntegracao", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    loginTokenCache.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("começa com os headers base de JSON", async () => {
    const { ok, headers } = await autenticarIntegracao(integracao({ tipoAuth: "bearer" }))
    expect(ok).toBe(true)
    if (ok) {
      expect(headers["Content-Type"]).toBe("application/json")
      expect(headers["Accept"]).toBe("application/json")
    }
  })

  it("anexa o token bearer", async () => {
    const { headers } = await autenticarIntegracao(
      integracao({ tipoAuth: "bearer", authConfig: { token: "segredo123" } })
    )
    expect(headers).toMatchObject({ Authorization: "Bearer segredo123" })
  })

  it("faz login e guarda o token em cache com a janela do servidor", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ token: "tokabc", expira_em_minutos: 25 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    const config = {
      login_url: "https://api.exemplo.com/auth/login",
      email: "svc@exemplo.com",
      senha: "x",
    }
    const integ = integracao({ id: 7, tipoAuth: "login", authConfig: config })
    const primeiro = await autenticarIntegracao(integ)
    expect(primeiro).toEqual({ ok: true, headers: expect.objectContaining({ Authorization: "Bearer tokabc" }) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(loginTokenCache.get(7)?.token).toBe("tokabc")

    fetchMock.mockClear()
    const segundo = await autenticarIntegracao(integ)
    expect(segundo).toEqual(primeiro)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("renova o login depois que a janela expira", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ token: "t1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    )
    const integ = integracao({
      id: 8,
      tipoAuth: "login",
      authConfig: {
        login_url: "https://api.exemplo.com/auth/login",
        email: "svc@exemplo.com",
        senha: "x",
      },
    })
    await autenticarIntegracao(integ)
    const cached = loginTokenCache.get(8)!
    cached.expiresAt = Date.now() - 1
    fetchMock.mockClear()
    const res = await autenticarIntegracao(integ)
    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("devolve erro estruturado quando o login falha", async () => {
    fetchMock.mockResolvedValue(new Response("401 Unauthorized", { status: 401 }))
    const res = await autenticarIntegracao(
      integracao({
        id: 9,
        tipoAuth: "login",
        authConfig: {
          login_url: "https://api.exemplo.com/auth/login",
          email: "svc@exemplo.com",
          senha: "errada",
        },
      })
    )
    expect(res).toEqual({ ok: false, erro: "Falha no login: 401 401 Unauthorized", status: 401 })
  })

  it("devolve erro quando o login não traz token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    const res = await autenticarIntegracao(
      integracao({
        id: 10,
        tipoAuth: "login",
        authConfig: {
          login_url: "https://api.exemplo.com/auth/login",
          email: "svc@exemplo.com",
          senha: "x",
        },
      })
    )
    expect(res).toEqual({ ok: false, erro: "Login não retornou token", status: 200 })
  })

  it("monta basic e api_key em header e oauth2 por client_credentials", async () => {
    const basic = await autenticarIntegracao(
      integracao({ tipoAuth: "basic", authConfig: { username: "u", password: "p" } })
    )
    expect(basic.ok && (basic as any).headers.Authorization).toBe(
      "Basic " + Buffer.from("u:p").toString("base64")
    )

    const apiKey = await autenticarIntegracao(
      integracao({ tipoAuth: "api_key", authConfig: { key: "k9", key_name: "x-api-key" } })
    )
    expect(apiKey.ok && (apiKey as any).headers["x-api-key"]).toBe("k9")

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: "oa2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    const oauth2 = await autenticarIntegracao(
      integracao({
        tipoAuth: "oauth2",
        authConfig: {
          token_url: "https://auth.exemplo.com/token",
          client_id: "cid",
          client_secret: "csec",
        },
      })
    )
    expect(oauth2.ok && (oauth2 as any).headers.Authorization).toBe("Bearer oa2")
  })
})