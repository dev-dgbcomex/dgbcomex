// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { consultarHistoricoPromocao } from "@/lib/crm/historico-promocao"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/historico-promocao", () => ({ consultarHistoricoPromocao: vi.fn() }))

const historico = {
  pessoaId: 7,
  nomePessoa: "TecMais Ltda",
  dataPessoa: "2026-01-10T10:00:00Z",
  clienteId: 3,
  clienteNome: "TecMais Ltda",
  virouClienteEm: "2026-11-02T14:00:00Z",
  porUsuario: "Tiago",
  origem: "promocao",
  oportunidades: 2,
  propostas: 1,
  visitas: 3,
  valorPropostas: 5000,
  valorOportunidades: 8000,
}

function get(id: string) {
  return GET(new Request(`http://localhost/api/clientes/${id}/historico`), {
    params: Promise.resolve({ id }),
  })
}

describe("GET /api/clientes/[id]/historico", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(consultarHistoricoPromocao).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(consultarHistoricoPromocao).mockResolvedValue(historico as any)
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await get("3")
    expect(res.status).toBe(401)
  })

  it("retorna 400 com id inválido", async () => {
    const res = await get("abc")
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Cliente é obrigatório" })
  })

  it("devolve o histórico da conversão", async () => {
    const res = await get("3")
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.historico.nomePessoa).toBe("TecMais Ltda")
    expect(data.historico.virouClienteEm).toBe("2026-11-02T14:00:00Z")
    expect(consultarHistoricoPromocao).toHaveBeenCalledWith(3)
  })

  it("devolve histórico nulo para cliente sem origem no CRM", async () => {
    vi.mocked(consultarHistoricoPromocao).mockResolvedValue(null)
    const res = await get("9")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ historico: null })
  })
})
