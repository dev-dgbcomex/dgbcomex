import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ENV = {
  MICRODATA_API_URL: "http://api.test",
  MICRODATA_SERVICE_EMAIL: "servico@teste.com",
  MICRODATA_SERVICE_SENHA: "segredo",
}

type Resposta = { status?: number; corpo?: unknown }

function resposta({ status = 200, corpo = {} }: Resposta = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response
}

async function carregar() {
  return import("./cliente")
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  Object.assign(process.env, ENV)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("requisitarWms", () => {
  it("falha com 503 claro quando as variáveis não estão configuradas", async () => {
    delete process.env.MICRODATA_API_URL
    const { requisitarWms, ErroWms } = await carregar()

    await expect(requisitarWms("/wms/dashboard")).rejects.toBeInstanceOf(ErroWms)
    await expect(requisitarWms("/wms/dashboard")).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("MICRODATA_API_URL"),
    })
  })

  it("autentica uma vez e reutiliza o token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta({ corpo: { token: "jwt-1" } }))
      .mockResolvedValueOnce(resposta({ corpo: { enderecos: 1 } }))
      .mockResolvedValueOnce(resposta({ corpo: { enderecos: 2 } }))
    vi.stubGlobal("fetch", fetchMock)
    const { requisitarWms } = await carregar()

    expect(await requisitarWms("/wms/dashboard")).toEqual({ enderecos: 1 })
    expect(await requisitarWms("/wms/dashboard")).toEqual({ enderecos: 2 })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/login")
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "GET",
      headers: { Authorization: "Bearer jwt-1" },
      cache: "no-store",
    })
  })

  it("envia o corpo JSON no POST", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta({ corpo: { token: "jwt-1" } }))
      .mockResolvedValueOnce(resposta({ status: 201, corpo: { ok: true } }))
    vi.stubGlobal("fetch", fetchMock)
    const { requisitarWms } = await carregar()

    await requisitarWms("/wms/enderecos", { metodo: "POST", corpo: { codigo: "A-01" } })

    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "POST",
      headers: { Authorization: "Bearer jwt-1", "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: "A-01" }),
    })
  })

  it("renova o token e repete uma vez em 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta({ corpo: { token: "jwt-1" } }))
      .mockResolvedValueOnce(resposta({ status: 401 }))
      .mockResolvedValueOnce(resposta({ corpo: { token: "jwt-2" } }))
      .mockResolvedValueOnce(resposta({ corpo: { itens: [] } }))
    vi.stubGlobal("fetch", fetchMock)
    const { requisitarWms } = await carregar()

    expect(await requisitarWms("/wms/estoque")).toEqual({ itens: [] })
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[2][0]).toBe("http://api.test/auth/login")
    expect(fetchMock.mock.calls[3][1]).toMatchObject({
      headers: { Authorization: "Bearer jwt-2" },
    })
  })

  it("mapeia o detail da api-microdata para ErroWms", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(resposta({ corpo: { token: "jwt-1" } }))
        .mockResolvedValueOnce(
          resposta({ status: 409, corpo: { detail: "Já existe um endereço com este código" } })
        )
    )
    const { requisitarWms } = await carregar()

    await expect(
      requisitarWms("/wms/enderecos", { metodo: "POST", corpo: {} })
    ).rejects.toMatchObject({ status: 409, message: "Já existe um endereço com este código" })
  })

  it("usa a mensagem do primeiro erro de validação", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(resposta({ corpo: { token: "jwt-1" } }))
        .mockResolvedValueOnce(
          resposta({ status: 422, corpo: { detail: [{ msg: "campo inválido" }] } })
        )
    )
    const { requisitarWms } = await carregar()

    await expect(requisitarWms("/wms/movimentos")).rejects.toMatchObject({
      status: 422,
      message: "campo inválido",
    })
  })

  it("converte erro 5xx da API em 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(resposta({ corpo: { token: "jwt-1" } }))
        .mockResolvedValueOnce(resposta({ status: 500, corpo: {} }))
    )
    const { requisitarWms } = await carregar()

    await expect(requisitarWms("/wms/dashboard")).rejects.toMatchObject({ status: 502 })
  })

  it("converte falha de rede em 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))
    const { requisitarWms } = await carregar()

    await expect(requisitarWms("/wms/dashboard")).rejects.toMatchObject({
      status: 503,
      message: "api-microdata indisponível para autenticação.",
    })
  })

  it("converte falha na autenticação em 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta({ status: 401 })))
    const { requisitarWms } = await carregar()

    await expect(requisitarWms("/wms/dashboard")).rejects.toMatchObject({
      status: 503,
      message: "Falha ao autenticar na api-microdata.",
    })
  })
})
