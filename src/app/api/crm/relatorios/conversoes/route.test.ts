// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { consultarConversoes, listarUsuariosAtividade } from "@/lib/crm/relatorios"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/relatorios", () => ({
  consultarConversoes: vi.fn(),
  listarUsuariosAtividade: vi.fn(),
}))

function req(url: string) {
  return new NextRequest(`http://localhost${url}`)
}

describe("/api/crm/relatorios/conversoes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(consultarConversoes).mockReset()
    vi.mocked(listarUsuariosAtividade).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({
      session: { user: { id: "1", role: "CRM", name: "Tiago" } },
      userId: 1,
    } as any)
    vi.mocked(consultarConversoes).mockResolvedValue({
      periodo: { de: "2026-11-01", ate: "2026-11-04", rotulo: "Últimos 7 dias" },
      cards: { total: 1, oportunidades: 2, propostas: 1, visitas: 3 },
      linhas: [{ id: 1, pessoa: "TecMais Ltda", cliente: "TecMais Ltda" }],
    } as any)
    vi.mocked(listarUsuariosAtividade).mockResolvedValue([{ id: 1, nome: "Tiago" }])
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await GET(req("/api/crm/relatorios/conversoes"))
    expect(res.status).toBe(401)
  })

  it("devolve o relatório com a lista de usuários", async () => {
    const res = await GET(req("/api/crm/relatorios/conversoes?periodo=mes"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.linhas[0].pessoa).toBe("TecMais Ltda")
    expect(data.usuarios).toHaveLength(1)
  })

  it("repassa os filtros da query string", async () => {
    await GET(req("/api/crm/relatorios/conversoes?periodo=mes&de=2026-10-01&usuario=3"))
    expect(consultarConversoes).toHaveBeenCalledWith({
      periodo: "mes",
      de: "2026-10-01",
      ate: null,
      usuario: "3",
    })
  })
})
