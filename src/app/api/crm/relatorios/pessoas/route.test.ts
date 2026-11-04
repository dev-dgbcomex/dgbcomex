// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { consultarPessoas, listarUsuariosAtividade } from "@/lib/crm/relatorios"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/relatorios", () => ({
  consultarPessoas: vi.fn(),
  listarUsuariosAtividade: vi.fn(),
}))

function req(url: string) {
  return new NextRequest(`http://localhost${url}`)
}

describe("/api/crm/relatorios/pessoas", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(consultarPessoas).mockReset()
    vi.mocked(listarUsuariosAtividade).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(consultarPessoas).mockResolvedValue({
      periodo: { de: "2026-11-01", ate: "2026-11-04", rotulo: "Últimos 7 dias" },
      cards: { total: 1, pessoasFisicas: 1, pessoasJuridicas: 0, convertidasEmCliente: 0, comSegmento: 0 },
      linhas: [{ id: 1, nome: "Maria Souza" }],
    } as any)
    vi.mocked(listarUsuariosAtividade).mockResolvedValue([{ id: 1, nome: "Tiago" }])
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET(req("/api/crm/relatorios/pessoas"))
    expect(res.status).toBe(401)
  })

  it("devolve o relatório com a lista de usuários", async () => {
    const res = await GET(req("/api/crm/relatorios/pessoas?periodo=semana"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.cards.total).toBe(1)
    expect(data.linhas[0].nome).toBe("Maria Souza")
    expect(data.usuarios).toEqual([{ id: 1, nome: "Tiago" }])
  })

  it("repassa os filtros da query string", async () => {
    await GET(req("/api/crm/relatorios/pessoas?periodo=periodo&de=2026-11-01&ate=2026-11-03&segmento=T%C3%AAxtil&usuario=7"))
    expect(consultarPessoas).toHaveBeenCalledWith({
      periodo: "periodo",
      de: "2026-11-01",
      ate: "2026-11-03",
      segmento: "Têxtil",
      usuario: "7",
    })
  })
})
