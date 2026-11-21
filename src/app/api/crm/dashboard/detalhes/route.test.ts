// @vitest-environment node
import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb, sqlParaTexto } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

const session = { session: { user: { id: "1", role: "ADMIN" } }, userId: 1 }

function get(url: string) {
  return GET(new NextRequest(url))
}

function isTotaisPrevisaoQuery(campos: unknown) {
  const chaves = Object.keys((campos ?? {}) as Record<string, unknown>)
  return chaves.includes("totalRegistros") && chaves.includes("totalValor")
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

  it("retorna o bloco top-leads somente com leads não promovidas", async () => {
    const builder = createQueryBuilder([
      {
        empresaId: 7,
        leadFantasia: "Tecelagem Y",
        leadRazao: null,
        leadNome: null,
        totalValor: "120000.00",
      },
    ])
    vi.mocked(db.select).mockReturnValue(builder as never)

    const res = await get("http://localhost/api/crm/dashboard/detalhes?bloco=top-leads")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      bloco: "top-leads",
      titulo: "Top Leads (Negócios)",
      listagem: "/comercial/crm/leads",
      itens: [
        {
          id: 7,
          titulo: "Tecelagem Y",
          subtitulo: "Lead (Negócio)",
          valor: 120000,
          href: "/comercial/crm/leads/7",
        },
      ],
    })
    const where = builder.where.mock.calls.map((args: unknown[]) => sqlParaTexto(args[0])).join(" ")
    expect(where).toContain("cliente_id")
    expect(where).toContain("promovida_cliente")
  })

  it("retorna o bloco top-clientes com conversão e valor", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([
        {
          clienteId: 17,
          clienteNome: "Conforto Prime",
          totalValor: "150000.00",
          totalOportunidades: "5",
          oportunidadesConvertidas: "2",
          valorAberto: "70000.00",
        },
      ]) as never
    )

    const res = await get("http://localhost/api/crm/dashboard/detalhes?bloco=top-clientes")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      bloco: "top-clientes",
      titulo: "Top Clientes (por oportunidades)",
      listagem: "/comercial/clientes",
      itens: [
        {
          id: 17,
          titulo: "Conforto Prime",
          subtitulo: "2 convertidas de 5 oportunidades",
          detalhe: "2 convertidas de 5 oportunidades",
          valor: 150000,
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

  it("retorna as ações realizadas com link para a ação", async () => {
    const builder = createQueryBuilder([
      {
        id: 9,
        titulo: "Visita à Tecelagem Y",
        subtitulo: "PRESENCIAL",
        status: "REALIZADA",
        data: "2026-11-21T12:00:00.000Z",
      },
    ])
    vi.mocked(db.select).mockReturnValue(builder as never)

    const res = await get("http://localhost/api/crm/dashboard/detalhes?bloco=acoes-realizadas")
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      titulo: string
      listagem: string
      itens: { titulo: string; status: string; href: string }[]
    }
    expect(json).toMatchObject({
      titulo: "Ações de prospecção realizadas",
      listagem: "/comercial/crm/acoes-prospeccao",
    })
    expect(json.itens[0]).toMatchObject({
      titulo: "Visita à Tecelagem Y",
      status: "REALIZADA",
      href: "/comercial/crm/acoes-prospeccao/9",
    })
    expect(
      builder.where.mock.calls.map((args: unknown[]) => sqlParaTexto(args[0])).join(" ")
    ).toContain("REALIZADA")
  })

  it("retorna oportunidades em aberto com total e limite ampliado na previsão", async () => {
    const itensBuilder = createQueryBuilder([
      {
        id: 12,
        titulo: "Oportunidade 12",
        status: "NEGOCIACAO",
        valor: "12500.00",
        data: "2026-11-20T12:00:00.000Z",
      },
    ])
    const totaisBuilder = createQueryBuilder([{ totalRegistros: "40", totalValor: "480000.00" }])
    vi.mocked(db.select).mockImplementation(
      ((campos: unknown) =>
        (isTotaisPrevisaoQuery(campos) ? totaisBuilder : itensBuilder) as never) as never
    )

    const res = await get("http://localhost/api/crm/dashboard/detalhes?bloco=previsao-abertas")
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      titulo: string
      totalRegistros: number
      totalValor: number
      itens: { valor: number; href: string }[]
    }
    expect(json.titulo).toBe("Oportunidades da previsão de receita")
    expect(json.totalRegistros).toBe(40)
    expect(json.totalValor).toBe(480000)
    expect(json.itens[0]).toMatchObject({
      valor: 12500,
      href: "/comercial/crm/oportunidades/12",
    })
    expect(
      itensBuilder.where.mock.calls.map((args: unknown[]) => sqlParaTexto(args[0])).join(" ")
    ).toContain("NOT IN")
    expect(itensBuilder.limit).toHaveBeenCalledWith(500)
  })

  it("retorna oportunidades convertidas com o total ganho", async () => {
    const itensBuilder = createQueryBuilder([])
    const totaisBuilder = createQueryBuilder([{ totalRegistros: "18", totalValor: "720000.00" }])
    vi.mocked(db.select).mockImplementation(
      ((campos: unknown) =>
        (isTotaisPrevisaoQuery(campos) ? totaisBuilder : itensBuilder) as never) as never
    )

    const res = await get("http://localhost/api/crm/dashboard/detalhes?bloco=previsao-convertidas")
    expect(res.status).toBe(200)
    const json = (await res.json()) as { totalRegistros: number; totalValor: number }
    expect(json).toMatchObject({ totalRegistros: 18, totalValor: 720000 })
    expect(
      itensBuilder.where.mock.calls.map((args: unknown[]) => sqlParaTexto(args[0])).join(" ")
    ).toContain("FECHADO_GANHO")
  })
})
