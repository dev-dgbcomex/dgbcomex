import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { criarEndereco, listarEnderecos } from "@/lib/wms/repo"
import { ErroWms } from "@/lib/wms/cliente"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({
  listarEnderecos: vi.fn(),
  criarEndereco: vi.fn(),
}))

function req(body: unknown) {
  return new NextRequest("http://localhost/api/wms/enderecos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("/api/wms/enderecos", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(listarEnderecos).mockReset()
    vi.mocked(criarEndereco).mockReset()
  })

  it("GET retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET()).status).toBe(401)
  })

  it("GET lista os endereços", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(listarEnderecos).mockResolvedValue([
      { id: 1, codigo: "A-01", tipo: "PULMAO" } as Awaited<ReturnType<typeof listarEnderecos>>[number],
    ])

    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(1)
  })

  it("POST exige código", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    const res = await POST(req({ codigo: "   " }))
    expect(res.status).toBe(400)
    expect(criarEndereco).not.toHaveBeenCalled()
  })

  it("POST cria o endereço com capacidade numérica", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(criarEndereco).mockResolvedValue({
      id: 2,
      codigo: "B-01",
      tipo: "PICKING",
    } as Awaited<ReturnType<typeof criarEndereco>>)

    const res = await POST(
      req({ codigo: " B-01 ", tipo: "PICKING", zona: "Picking", capacidade: "1500" })
    )
    expect(res.status).toBe(201)
    expect(criarEndereco).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: "B-01", tipo: "PICKING", capacidade: 1500 })
    )
  })

  it("POST cai no tipo padrão quando inválido", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(criarEndereco).mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof criarEndereco>>)

    await POST(req({ codigo: "C-01", tipo: "INVALIDO" }))
    expect(criarEndereco).toHaveBeenCalledWith(expect.objectContaining({ tipo: "PULMAO" }))
  })

  it("POST repassa 409 de código duplicado da api-microdata", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as Awaited<ReturnType<typeof requireAuth>>)
    vi.mocked(criarEndereco).mockRejectedValue(
      new ErroWms("Já existe um endereço com este código", 409)
    )

    const res = await POST(req({ codigo: "A-01" }))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "Já existe um endereço com este código" })
  })
})
