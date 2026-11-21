// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { registrarLog } from "@/lib/notificar"
import { PgDialect } from "drizzle-orm/pg-core/dialect"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn() }))

const session = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }
const dialect = new PgDialect()

function get() {
  return GET(new NextRequest("http://localhost/api/clientes"))
}

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  vi.mocked(requireAuth).mockReset()
  vi.mocked(registrarLog).mockReset()
  resetDb(db)
  vi.mocked(requireAuth).mockResolvedValue(session as never)
})

describe("GET /api/clientes", () => {
  it("retorna as contagens de relacionamento de cada cliente", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([
        {
          id: 1,
          nome: "Tecidos Silva",
          totalOportunidades: 3,
          totalPedidos: 5,
          totalVisitas: 2,
          totalAcoes: 7,
          faixaConversao: "FRIO",
        },
      ]) as never
    )

    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([
      {
        id: 1,
        nome: "Tecidos Silva",
        totalOportunidades: 3,
        totalPedidos: 5,
        totalVisitas: 2,
        totalAcoes: 7,
        faixaConversao: "FRIO",
      },
    ])

    const selecao = vi.mocked(db.select).mock.calls[0][0] as Record<string, unknown>
    expect(Object.keys(selecao)).toEqual(
      expect.arrayContaining([
        "totalOportunidades",
        "totalPedidos",
        "totalVisitas",
        "totalAcoes",
        "faixaConversao",
      ])
    )
    const sql = Object.entries(selecao)
      .filter(([chave]) => chave.startsWith("total"))
      .map(([, valor]) => dialect.sqlToQuery(valor as never).sql)
      .join(" ")
    expect(sql).toMatch(/crm_oportunidades/)
    expect(sql).toMatch(/crm_pedidos_venda/)
    expect(sql).toMatch(/crm_visitas/)
    expect(sql).toMatch(/crm_acoes_prospeccao/)
    const faixaSql = dialect.sqlToQuery(selecao.faixaConversao as never).sql
    expect(faixaSql).toContain("'NEGOCIACAO'")
    expect(faixaSql).toContain("'PROPOSTA'")
    expect(faixaSql).toContain('"crm_leads"."cliente_id"')
  })
})

describe("POST /api/clientes", () => {
  it("rejeita CNPJ com menos de 14 dígitos", async () => {
    const res = await post({ nome: "Empresa", cnpj: "123" })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "CNPJ deve ter 14 dígitos" })
  })

  it("salva CNPJ pontuado quando recebe apenas dígitos", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([]) as never)
    const insertBuilder = createQueryBuilder(undefined)
    insertBuilder.returning = vi.fn(() =>
      Promise.resolve([{ id: 17, nome: "Conforto Prime", cnpj: "47.646.133/0001-01" }])
    )
    vi.mocked(db.insert).mockReturnValue(insertBuilder as never)

    const res = await post({ nome: "Conforto Prime", cnpj: "47646133000101" })
    expect(res.status).toBe(201)
    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({ cnpj: "47.646.133/0001-01" })
    )
  })

  it("bloqueia CNPJ duplicado com pontuação diferente", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([{ id: 19 }]) as never)

    const res = await post({ nome: "Duplicata", cnpj: "47646133000101" })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "CNPJ já cadastrado" })
  })
})
