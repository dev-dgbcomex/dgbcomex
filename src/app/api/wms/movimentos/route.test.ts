import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { listarMovimentos, registrarMovimento } from "@/lib/wms/repo"
import { ErroWms } from "@/lib/wms/cliente"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({
  listarMovimentos: vi.fn(),
  registrarMovimento: vi.fn(),
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
    vi.mocked(listarMovimentos).mockReset()
    vi.mocked(registrarMovimento).mockReset()
  })

  it("GET retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(new NextRequest("http://localhost/api/wms/movimentos"))).status).toBe(401)
  })

  it("GET lista movimentos com o limite", async () => {
    vi.mocked(listarMovimentos).mockResolvedValue([])
    const res = await GET(new NextRequest("http://localhost/api/wms/movimentos?limite=5"))
    expect(res.status).toBe(200)
    expect(listarMovimentos).toHaveBeenCalledWith(5)
  })

  it("POST rejeita tipo inválido", async () => {
    const res = await POST(req({ tipo: "X" }))
    expect(res.status).toBe(400)
    expect(registrarMovimento).not.toHaveBeenCalled()
  })

  it("POST ENTRADA exige endereço de destino", async () => {
    const res = await POST(req({ tipo: "ENTRADA", peca: { nroRolo: "R1", nroPeca: "1" } }))
    expect(res.status).toBe(400)
    expect(registrarMovimento).not.toHaveBeenCalled()
  })

  it("POST ENTRADA exige rolo e peça", async () => {
    const res = await POST(req({ tipo: "ENTRADA", enderecoDestinoId: 3, peca: {} }))
    expect(res.status).toBe(400)
    expect(registrarMovimento).not.toHaveBeenCalled()
  })

  it("POST ENTRADA envia a peça e o usuário da sessão", async () => {
    vi.mocked(registrarMovimento).mockResolvedValue({
      movimento: { id: 1, tipo: "ENTRADA" },
      peca: { id: 9 },
    } as Awaited<ReturnType<typeof registrarMovimento>>)

    const res = await POST(
      req({
        tipo: "ENTRADA",
        enderecoDestinoId: 3,
        observacao: " conferido ",
        peca: { nroRolo: " R1 ", nroPeca: "1", metros: 10, peso: 3.2 },
      })
    )
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ movimento: { id: 1, tipo: "ENTRADA" }, peca: { id: 9 } })
    expect(registrarMovimento).toHaveBeenCalledWith({
      tipo: "ENTRADA",
      enderecoDestinoId: 3,
      usuarioId: 7,
      observacao: "conferido",
      peca: expect.objectContaining({ nroRolo: "R1", nroPeca: "1", metros: 10, peso: 3.2 }),
    })
  })

  it("POST TRANSFERENCIA exige a peça alocada", async () => {
    const res = await POST(req({ tipo: "TRANSFERENCIA", enderecoDestinoId: 4 }))
    expect(res.status).toBe(400)
    expect(registrarMovimento).not.toHaveBeenCalled()
  })

  it("POST TRANSFERENCIA envia origem e destino", async () => {
    vi.mocked(registrarMovimento).mockResolvedValue({
      movimento: { id: 2 },
    } as Awaited<ReturnType<typeof registrarMovimento>>)

    const res = await POST(req({ tipo: "TRANSFERENCIA", estoqueId: 9, enderecoDestinoId: 4 }))
    expect(res.status).toBe(201)
    expect(registrarMovimento).toHaveBeenCalledWith({
      tipo: "TRANSFERENCIA",
      estoqueId: 9,
      enderecoDestinoId: 4,
      usuarioId: 7,
      observacao: null,
    })
  })

  it("POST SAIDA não envia endereço de destino", async () => {
    vi.mocked(registrarMovimento).mockResolvedValue({
      movimento: { id: 3 },
    } as Awaited<ReturnType<typeof registrarMovimento>>)

    const res = await POST(req({ tipo: "SAIDA", estoqueId: 9 }))
    expect(res.status).toBe(201)
    expect(registrarMovimento).toHaveBeenCalledWith({
      tipo: "SAIDA",
      estoqueId: 9,
      enderecoDestinoId: null,
      usuarioId: 7,
      observacao: null,
    })
  })

  it("POST repassa 404 da api-microdata", async () => {
    vi.mocked(registrarMovimento).mockRejectedValue(
      new ErroWms("Peça alocada não encontrada", 404)
    )

    const res = await POST(req({ tipo: "SAIDA", estoqueId: 99 }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Peça alocada não encontrada" })
  })
})
