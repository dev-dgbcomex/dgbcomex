import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import {
  buscarPeca,
  criarPeca,
  enderecoExiste,
  listarMovimentos,
  moverPeca,
  registrarMovimento,
  removerPeca,
} from "@/lib/wms/repo"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({
  buscarPeca: vi.fn(),
  criarPeca: vi.fn(),
  enderecoExiste: vi.fn(),
  listarMovimentos: vi.fn(),
  moverPeca: vi.fn(),
  registrarMovimento: vi.fn(),
  removerPeca: vi.fn(),
}))

type Auth = Awaited<ReturnType<typeof requireAuth>>

function req(body: unknown) {
  return new NextRequest("http://localhost/api/wms/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("/api/wms/movimentos", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue({ userId: 7 } as Auth)
    vi.mocked(buscarPeca).mockReset()
    vi.mocked(criarPeca).mockReset()
    vi.mocked(enderecoExiste).mockReset()
    vi.mocked(listarMovimentos).mockReset()
    vi.mocked(moverPeca).mockReset()
    vi.mocked(registrarMovimento).mockReset()
    vi.mocked(removerPeca).mockReset()
  })

  it("GET retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(new NextRequest("http://localhost/api/wms/movimentos"))).status).toBe(401)
  })

  it("GET lista movimentos", async () => {
    vi.mocked(listarMovimentos).mockResolvedValue([])
    const res = await GET(new NextRequest("http://localhost/api/wms/movimentos?limite=5"))
    expect(res.status).toBe(200)
    expect(listarMovimentos).toHaveBeenCalledWith(5)
  })

  it("POST rejeita tipo inválido", async () => {
    const res = await POST(req({ tipo: "X" }))
    expect(res.status).toBe(400)
  })

  it("POST ENTRADA exige endereço válido", async () => {
    vi.mocked(enderecoExiste).mockResolvedValue(false)
    const res = await POST(req({ tipo: "ENTRADA", enderecoDestinoId: 1, peca: {} }))
    expect(res.status).toBe(400)
  })

  it("POST ENTRADA cria a peça e o movimento", async () => {
    vi.mocked(enderecoExiste).mockResolvedValue(true)
    vi.mocked(criarPeca).mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof criarPeca>>)
    vi.mocked(registrarMovimento).mockResolvedValue({ id: 1 } as Awaited<ReturnType<typeof registrarMovimento>>)

    const res = await POST(
      req({
        tipo: "ENTRADA",
        enderecoDestinoId: 3,
        peca: { nroRolo: "R1", nroPeca: "1", metros: 10 },
      })
    )
    expect(res.status).toBe(201)
    expect(criarPeca).toHaveBeenCalledWith(3, expect.objectContaining({ nroRolo: "R1", metros: 10 }))
    expect(registrarMovimento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "ENTRADA", estoqueId: 9, enderecoDestinoId: 3, usuarioId: 7 })
    )
  })

  it("POST ENTRADA retorna 409 se a peça já está alocada", async () => {
    vi.mocked(enderecoExiste).mockResolvedValue(true)
    vi.mocked(criarPeca).mockResolvedValue(null)

    const res = await POST(
      req({ tipo: "ENTRADA", enderecoDestinoId: 3, peca: { nroRolo: "R1", nroPeca: "1" } })
    )
    expect(res.status).toBe(409)
  })

  it("POST TRANSFERENCIA move a peça e registra origem/destino", async () => {
    vi.mocked(buscarPeca).mockResolvedValue({ id: 9, enderecoId: 2 } as Awaited<ReturnType<typeof buscarPeca>>)
    vi.mocked(enderecoExiste).mockResolvedValue(true)
    vi.mocked(registrarMovimento).mockResolvedValue({ id: 2 } as Awaited<ReturnType<typeof registrarMovimento>>)

    const res = await POST(req({ tipo: "TRANSFERENCIA", estoqueId: 9, enderecoDestinoId: 4 }))
    expect(res.status).toBe(201)
    expect(moverPeca).toHaveBeenCalledWith(9, 4)
    expect(registrarMovimento).toHaveBeenCalledWith(
      expect.objectContaining({ enderecoOrigemId: 2, enderecoDestinoId: 4 })
    )
  })

  it("POST SAIDA remove a alocação", async () => {
    vi.mocked(buscarPeca).mockResolvedValue({ id: 9, enderecoId: 2 } as Awaited<ReturnType<typeof buscarPeca>>)
    vi.mocked(registrarMovimento).mockResolvedValue({ id: 3 } as Awaited<ReturnType<typeof registrarMovimento>>)

    const res = await POST(req({ tipo: "SAIDA", estoqueId: 9 }))
    expect(res.status).toBe(201)
    expect(removerPeca).toHaveBeenCalledWith(9)
  })

  it("POST retorna 404 quando a peça não existe", async () => {
    vi.mocked(buscarPeca).mockResolvedValue(null)
    const res = await POST(req({ tipo: "SAIDA", estoqueId: 99 }))
    expect(res.status).toBe(404)
  })
})
