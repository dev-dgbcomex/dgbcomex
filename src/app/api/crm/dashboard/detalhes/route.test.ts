// @vitest-environment node
import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

const session = { session: { user: { id: "1", role: "ADMIN" } }, userId: 1 }

function get(url: string) {
  return GET(new NextRequest(url))
}

beforeEach(() => {
  vi.mocked(requireAuth).mockReset()
  resetDb(db)
  vi.mocked(requireAuth).mockResolvedValue(session as never)
})

describe("GET /api/crm/dashboard/detalhes", () => {
  it("exige autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as never
    )
    expect((await get("http://localhost/api/crm/dashboard/detalhes?bloco=leads")).status).toBe(401)
  })

  it("rejeita bloco fora da allowlist", async () => {
    const res = await get("http://localhost/api/crm/dashboard/detalhes?bloco=segredo")
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Bloco inválido" })
  })

  it("retorna clientes com link para o cadastro", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([
        {
          id: 17,
          titulo: "Conforto Prime",
          subtitulo: "47.646.133/0001-01",
          data: "2026-11-20T12:00:00.000Z",
        },
      ]) as never
    )

    const res = await get("http://localhost/api/crm/dashboard/detalhes?bloco=clientes")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      bloco: "clientes",
      titulo: "Clientes",
      listagem: "/comercial/clientes",
      itens: [
        {
          id: 17,
          titulo: "Conforto Prime",
          subtitulo: "47.646.133/0001-01",
          data: "2026-11-20T12:00:00.000Z",
          href: "/comercial/clientes/17",
        },
      ],
    })
  })

  it("aplica filtro de status nas oportunidades", async () => {
    const builder = createQueryBuilder([
      {
        id: 11,
        titulo: "Oportunidade 11",
        status: "FECHADO_GANHO",
        valor: "1200.00",
        data: "2026-11-20T12:00:00.000Z",
      },
    ])
    vi.mocked(db.select).mockReturnValue(builder as never)

    const res = await get(
      "http://localhost/api/crm/dashboard/detalhes?bloco=status&status=FECHADO_GANHO"
    )
    expect(res.status).toBe(200)
    expect(builder.where).toHaveBeenCalled()
    const json = (await res.json()) as { itens: { valor: number; href: string }[] }
    expect(json.itens[0]).toMatchObject({
      valor: 1200,
      href: "/comercial/crm/oportunidades/11",
    })
  })
})
