// @vitest-environment node
import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { createQueryBuilder, resetDb, sqlParaTexto } from "@/test/route-db-mock"
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

function isTopLeadsQuery(campos: unknown) {
  const chaves = Object.keys((campos ?? {}) as Record<string, unknown>)
  return (
    chaves.includes("empresaNome") &&
    chaves.includes("totalValor") &&
    !chaves.includes("clienteNome")
  )
}

function isRecentesTimelineQuery(campos: unknown) {
  const chaves = Object.keys((campos ?? {}) as Record<string, unknown>)
  return (
    chaves.includes("descricao") && chaves.includes("dataEvento") && chaves.includes("metadados")
  )
}

function builderComResultado(campos: unknown, resolver: (contexto: any) => unknown[]) {
  const builder = createQueryBuilder<unknown[]>([])
  let tabela: unknown

  builder.from = vi.fn((valor: unknown) => {
    tabela = valor
    return builder
  })

  const resultado = () => resolver({ builder, campos, tabela })
  builder.then = (resolve?: (value: unknown[]) => unknown) =>
    Promise.resolve(resultado()).then(resolve)
  builder.catch = (reject?: (reason: unknown) => unknown) =>
    Promise.resolve(resultado()).catch(reject)

  return builder
}

function resolverMetricas({ builder, campos, tabela }: any) {
  const where = builder.where.mock.calls.map((args: unknown[]) => sqlParaTexto(args[0])).join(" ")
  const chaves = Object.keys((campos ?? {}) as Record<string, unknown>)

  if (tabela === crmAcoesProspeccao) {
    if (!where.includes("data_acao")) return [{ total: 30 }]
    if (where.includes(">=")) return [{ total: 22 }]
    return [{ total: 4 }]
  }

  if (tabela === crmOportunidades) {
    if (
      builder.groupBy.mock.calls.length > 0 ||
      chaves.includes("empresaId") ||
      chaves.includes("clienteId")
    ) {
      return []
    }
    if (chaves.length === 1 && chaves[0] === "total") {
      const agregado = sqlParaTexto((campos as Record<string, unknown>).total)
      if (agregado.toUpperCase().includes("SUM")) {
        return [{ total: where.includes("NOT IN") ? "480000.00" : "720000.00" }]
      }
      if (where.includes("NOT IN")) return [{ total: 40 }]
      if (where.includes("FECHADO_GANHO")) return [{ total: 18 }]
      if (where.includes("created_at")) return [{ total: 9 }]
      return [{ total: 85 }]
    }
  }

  return []
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

  it("inclui topEmpresas somente com leads não promovidas", async () => {
    const leadBuilder = createQueryBuilder([
      { empresaId: 7, empresaNome: "Tecelagem Y", totalValor: "120000.00" },
    ])
    vi.mocked(db.select).mockImplementation(
      ((campos: unknown) =>
        (isTopLeadsQuery(campos) ? leadBuilder : createQueryBuilder([])) as never) as never
    )

    const res = await GET()
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      topEmpresas: {
        empresaId: number
        empresaNome: string
        totalValor: number
        clienteId?: number
        clienteNome?: string
      }[]
    }

    expect(json.topEmpresas).toEqual([
      { empresaId: 7, empresaNome: "Tecelagem Y", totalValor: 120000 },
    ])
    const where = leadBuilder.where.mock.calls
      .map((args: unknown[]) => sqlParaTexto(args[0]))
      .join(" ")
    expect(where).toContain("cliente_id")
    expect(where).toContain("promovida_cliente")
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
    vi.mocked(db.select).mockImplementation(((campos: unknown) => {
      if (isTopClientesQuery(campos)) throw new Error("consulta indisponível")
      return createQueryBuilder([]) as never
    }) as never)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(((await res.json()) as { topClientes: unknown[] }).topClientes).toEqual([])
  })

  it("devolve ações realizadas e o total de previsão com conversão", async () => {
    vi.mocked(db.select).mockImplementation(
      ((campos: unknown) => builderComResultado(campos, resolverMetricas) as never) as never
    )

    const res = await GET()
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      acoesProspeccao: { realizadas: number; hoje: number; esteMes: number }
      forecast: number
      forecastQuantidade: number
      conversao: {
        oportunidadesConvertidas: number
        totalOportunidades: number
        valorConvertido: number
      }
      totalPrevisaoConversao: { quantidade: number; valor: number }
    }

    expect(json.acoesProspeccao).toEqual({ realizadas: 30, hoje: 4, esteMes: 22 })
    expect(json.forecast).toBe(480000)
    expect(json.forecastQuantidade).toBe(40)
    expect(json.conversao).toEqual({
      oportunidadesConvertidas: 18,
      totalOportunidades: 85,
      valorConvertido: 720000,
    })
    expect(json.totalPrevisaoConversao).toEqual({ quantidade: 58, valor: 1200000 })
  })

  it("abre ações e visitas recentes pelo ID salvo nos metadados do evento", async () => {
    vi.mocked(db.select).mockImplementation(((campos: unknown) =>
      isRecentesTimelineQuery(campos)
        ? createQueryBuilder([
            {
              id: 214,
              tipo: "ACAO_PROSPECCAO",
              descricao: "Ação de prospecção TELEFONE agendada para 19/11/2026",
              dataEvento: "2026-11-19T11:45:00.000Z",
              metadados: { acaoProspeccaoId: 87 },
            },
            {
              id: 215,
              tipo: "VISITA",
              descricao: "Visita técnica",
              dataEvento: "2026-11-18T10:00:00.000Z",
              metadados: { visitaId: 42 },
            },
          ])
        : createQueryBuilder([])) as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      recentes: { id: number; tipo: string; href: string | null }[]
    }
    expect(json.recentes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 214,
          tipo: "ACAO_PROSPECCAO",
          href: "/comercial/crm/acoes-prospeccao/87",
        }),
        expect.objectContaining({
          id: 215,
          tipo: "VISITA",
          href: "/comercial/crm/visitas/42",
        }),
      ])
    )
    expect(json.recentes.some((r) => r.href?.includes("/214"))).toBe(false)
  })
})
