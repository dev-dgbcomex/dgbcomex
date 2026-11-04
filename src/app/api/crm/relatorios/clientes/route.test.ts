// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { consultarClientes, listarUsuariosAtividade } from "@/lib/crm/relatorios"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/relatorios", () => ({
  consultarClientes: vi.fn(),
  listarUsuariosAtividade: vi.fn(),
}))

function req(url: string) {
  return new NextRequest(`http://localhost${url}`)
}

describe("/api/crm/relatorios/clientes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(consultarClientes).mockReset()
    vi.mocked(listarUsuariosAtividade).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(consultarClientes).mockResolvedValue({
      periodo: { de: "2026-11-01", ate: "2026-11-04", rotulo: "Últimos 7 dias" },
      cards: { total: 1, comNegocio: 1, semNegocio: 0 },
      linhas: [{ id: 7, nome: "TecMais Ltda", oportunidades: 2 }],
    } as any)
    vi.mocked(listarUsuariosAtividade).mockResolvedValue([{ id: 1, nome: "Tiago" }])
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET(req("/api/crm/relatorios/clientes"))
    expect(res.status).toBe(401)
  })

  it("devolve o relatório com a lista de usuários", async () => {
    const res = await GET(req("/api/crm/relatorios/clientes?periodo=mes"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.linhas[0].nome).toBe("TecMais Ltda")
    expect(data.usuarios).toHaveLength(1)
  })

  it("repassa os filtros da query string", async () => {
    await GET(req("/api/crm/relatorios/clientes?periodo=mes&de=2026-10-01&segmento=Tecelagem"))
    expect(consultarClientes).toHaveBeenCalledWith({
      periodo: "mes",
      de: "2026-10-01",
      ate: null,
      segmento: "Tecelagem",
    })
  })
})
