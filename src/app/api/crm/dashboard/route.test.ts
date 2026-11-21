// @vitest-environment node
import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

const session = { session: { user: { id: "1", role: "ADMIN" } }, userId: 1 }

const linhaTopCliente = {
  clienteId: 17,
  clienteNome: "Conforto Prime",
  totalValor: "150000.00",
  totalOportunidades: "5",
  oportunidadesConvertidas: "2",
  valorAberto: "70000.00",
}

function isTopClientesQuery(campos: unknown) {
  const chaves = Object.keys((campos ?? {}) as Record<string, unknown>)
  return chaves.includes("oportunidadesConvertidas") && chaves.includes("valorAberto")
}

beforeEach(() => {
  vi.mocked(requireAuth).mockReset()
  resetDb(db)
  vi.mocked(requireAuth).mockResolvedValue(session as never)
})

describe("GET /api/crm/dashboard", () => {
  it("exige autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as never
    )
    expect((await GET()).status).toBe(401)
  })

  it("inclui topClientes com soma, contagem e conversão", async () => {
    vi.mocked(db.select).mockImplementation(
      ((campos: unknown) =>
        createQueryBuilder(isTopClientesQuery(campos) ? [linhaTopCliente] : []) as never) as never
    )

    const res = await GET()
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      topClientes: {
        clienteId: number
        clienteNome: string
        totalValor: number
        totalOportunidades: number
        oportunidadesConvertidas: number
        valorAberto: number
      }[]
    }

    expect(json.topClientes).toEqual([
      {
        clienteId: 17,
        clienteNome: "Conforto Prime",
        totalValor: 150000,
        totalOportunidades: 5,
        oportunidadesConvertidas: 2,
        valorAberto: 70000,
      },
    ])
  })

  it("devolve topClientes vazio se a consulta falhar", async () => {
    vi.mocked(db.select).mockImplementation(
      ((campos: unknown) => {
        if (isTopClientesQuery(campos)) throw new Error("consulta indisponível")
        return createQueryBuilder([]) as never
      }) as never
    )

    const res = await GET()
    expect(res.status).toBe(200)
    expect(((await res.json()) as { topClientes: unknown[] }).topClientes).toEqual([])
  })
})
