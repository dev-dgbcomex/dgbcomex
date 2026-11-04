// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { consultarAtividades, listarUsuariosAtividade } from "@/lib/crm/relatorios"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/relatorios", () => ({
  consultarAtividades: vi.fn(),
  listarUsuariosAtividade: vi.fn(),
}))

function req(url: string) {
  return new NextRequest(`http://localhost${url}`)
}

describe("/api/crm/relatorios/atividades", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(consultarAtividades).mockReset()
    vi.mocked(listarUsuariosAtividade).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(consultarAtividades).mockResolvedValue({
      periodo: { de: "2026-11-01", ate: "2026-11-04", rotulo: "Últimos 7 dias" },
      resumo: { totalAtividades: 1 },
      porUsuario: [{ usuario: "Tiago" }],
      atividades: [{ id: 1, descricao: "Pessoa criada: Maria Souza" }],
    } as any)
    vi.mocked(listarUsuariosAtividade).mockResolvedValue([{ id: 1, nome: "Tiago" }])
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET(req("/api/crm/relatorios/atividades"))
    expect(res.status).toBe(401)
  })

  it("devolve o relatório com a lista de usuários", async () => {
    const res = await GET(req("/api/crm/relatorios/atividades?periodo=semana"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.atividades[0].descricao).toBe("Pessoa criada: Maria Souza")
    expect(data.usuarios).toHaveLength(1)
  })

  it("repassa os filtros da query string", async () => {
    await GET(req("/api/crm/relatorios/atividades?periodo=periodo&de=2026-11-01&ate=2026-11-03&usuario=9"))
    expect(consultarAtividades).toHaveBeenCalledWith({
      periodo: "periodo",
      de: "2026-11-01",
      ate: "2026-11-03",
      usuario: "9",
    })
  })
})
