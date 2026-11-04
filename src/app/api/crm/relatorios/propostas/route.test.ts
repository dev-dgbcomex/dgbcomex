// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { consultarPropostas, listarUsuariosAtividade } from "@/lib/crm/relatorios"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/relatorios", () => ({
  consultarPropostas: vi.fn(),
  listarUsuariosAtividade: vi.fn(),
}))

function req(url: string) {
  return new NextRequest(`http://localhost${url}`)
}

describe("/api/crm/relatorios/propostas", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(consultarPropostas).mockReset()
    vi.mocked(listarUsuariosAtividade).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(consultarPropostas).mockResolvedValue({
      periodo: { de: "2026-11-01", ate: "2026-11-04", rotulo: "Últimos 7 dias" },
      cards: { total: 1, aceitas: 1, recusadas: 0, pendentes: 0 },
      linhas: [{ id: 1, titulo: "Proposta Uniformes 2026" }],
    } as any)
    vi.mocked(listarUsuariosAtividade).mockResolvedValue([{ id: 1, nome: "Tiago" }])
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET(req("/api/crm/relatorios/propostas"))
    expect(res.status).toBe(401)
  })

  it("devolve o relatório com a lista de usuários", async () => {
    const res = await GET(req("/api/crm/relatorios/propostas?periodo=semana"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.linhas[0].titulo).toBe("Proposta Uniformes 2026")
    expect(data.usuarios).toHaveLength(1)
  })

  it("repassa os filtros da query string", async () => {
    await GET(req("/api/crm/relatorios/propostas?periodo=mes&status=ACEITA&usuario=2"))
    expect(consultarPropostas).toHaveBeenCalledWith({
      periodo: "mes",
      de: null,
      ate: null,
      status: "ACEITA",
      usuario: "2",
    })
  })
})
