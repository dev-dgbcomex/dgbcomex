// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { PromocaoErro, promoverPessoaParaCliente } from "@/lib/crm/promover-cliente"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/promover-cliente", () => ({
  PromocaoErro: class PromocaoErro extends Error {
    status: number
    constructor(mensagem: string, status = 400) {
      super(mensagem)
      this.status = status
    }
  },
  promoverPessoaParaCliente: vi.fn(),
}))

const sessao = {
  session: { user: { id: "1", role: "CRM", name: "Tiago" } },
  userId: 1,
}

function post(id: string) {
  return POST(new NextRequest(`http://localhost/api/crm/pessoas/${id}/promover-cliente`), {
    params: Promise.resolve({ id }),
  })
}

describe("POST /api/crm/pessoas/[id]/promover-cliente", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(promoverPessoaParaCliente).mockReset()
    vi.mocked(requireAuth).mockResolvedValue(sessao as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post("7")
    expect(res.status).toBe(401)
  })

  it("promove a pessoa e devolve o resumo", async () => {
    vi.mocked(promoverPessoaParaCliente).mockResolvedValue({
      pessoa: { id: 7, promovidaCliente: true },
      clienteId: 3,
      clienteCriado: true,
      resumo: {
        oportunidades: 2,
        propostas: 1,
        visitas: 3,
        valorPropostas: 10,
        valorOportunidades: 20,
      },
    } as any)

    const res = await post("7")
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo.clienteId).toBe(3)
    expect(corpo.clienteCriado).toBe(true)
    expect(corpo.resumo.oportunidades).toBe(2)
    expect(promoverPessoaParaCliente).toHaveBeenCalledWith({
      pessoaId: 7,
      usuarioId: 1,
      usuarioNome: "Tiago",
    })
  })

  it("devolve 404 quando a pessoa não existe", async () => {
    vi.mocked(promoverPessoaParaCliente).mockRejectedValue(
      new PromocaoErro("Pessoa não encontrada", 404)
    )
    const res = await post("9")
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Pessoa não encontrada" })
  })

  it("devolve 409 quando a pessoa já foi promovida", async () => {
    vi.mocked(promoverPessoaParaCliente).mockRejectedValue(
      new PromocaoErro("Esta pessoa já foi transformada em cliente", 409)
    )
    const res = await post("9")
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "Esta pessoa já foi transformada em cliente" })
  })

  it("devolve 400 quando falta CNPJ", async () => {
    vi.mocked(promoverPessoaParaCliente).mockRejectedValue(
      new PromocaoErro("A pessoa precisa ter CNPJ cadastrado para virar cliente", 400)
    )
    const res = await post("9")
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "A pessoa precisa ter CNPJ cadastrado para virar cliente",
    })
  })
})
