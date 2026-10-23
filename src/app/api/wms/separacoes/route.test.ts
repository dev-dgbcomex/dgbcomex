import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { criarSeparacao, listarSeparacoes } from "@/lib/wms/repo"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/wms/repo", () => ({
  listarSeparacoes: vi.fn(),
  criarSeparacao: vi.fn(),
}))

const logado = () =>
  ({ userId: 1 }) as Awaited<ReturnType<typeof requireAuth>>

function getReq(query = "") {
  return new NextRequest(`http://localhost/api/wms/separacoes${query}`)
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/wms/separacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("/api/wms/separacoes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(listarSeparacoes).mockReset()
    vi.mocked(criarSeparacao).mockReset()
  })

  it("GET retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await GET(getReq())).status).toBe(401)
  })

  it("GET repassa status, busca e paginação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(listarSeparacoes).mockResolvedValue({ itens: [], total: 3 })

    const res = await GET(getReq("?busca=5902&status=LIBERADO&limite=10&offset=20"))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ itens: [], total: 3 })
    expect(listarSeparacoes).toHaveBeenCalledWith({
      status: "LIBERADO",
      busca: "5902",
      limite: 10,
      offset: 20,
    })
  })

  it("POST retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    )
    expect((await POST(postReq({ empresa: "13", pedido: "00005902" }))).status).toBe(401)
  })

  it("POST exige empresa e pedido", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())

    const res = await POST(postReq({ empresa: "", pedido: " " }))

    expect(res.status).toBe(400)
    expect(criarSeparacao).not.toHaveBeenCalled()
  })

  it("POST cria a separação para o usuário da sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(logado())
    vi.mocked(criarSeparacao).mockResolvedValue({
      id: 9,
      empresa: "13",
      pedido: "00005902",
      status: "LIBERADO",
    } as Awaited<ReturnType<typeof criarSeparacao>>)

    const res = await POST(
      postReq({ empresa: " 13 ", pedido: " 00005902 ", observacao: "Urgente" })
    )

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ id: 9 })
    expect(criarSeparacao).toHaveBeenCalledWith({
      empresa: "13",
      pedido: "00005902",
      observacao: "Urgente",
      usuarioId: 1,
    })
  })
})
