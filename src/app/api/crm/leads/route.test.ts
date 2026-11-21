// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { registrarLog, notificar } from "@/lib/notificar"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { PgDialect } from "drizzle-orm/pg-core/dialect"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))
vi.mock("@/lib/notificar", () => ({
  registrarLog: vi.fn(),
  notificar: vi.fn(),
  notificarErro: vi.fn(),
  notificarDelecao: vi.fn(),
}))
vi.mock("@/lib/crm/notificar-atividade", () => ({ notificarAtividadeComercial: vi.fn() }))

const session = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }
const dialect = new PgDialect()

function get() {
  return GET(new NextRequest("http://localhost/api/crm/leads"))
}

function post(body: Record<string, unknown>) {
  return POST(new NextRequest("http://localhost/api/crm/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }))
}

beforeEach(() => {
  vi.mocked(requireAuth).mockReset()
  vi.mocked(registrarLog).mockReset()
  vi.mocked(notificar).mockReset()
  vi.mocked(notificarAtividadeComercial).mockReset()
  resetDb(db)
  vi.mocked(requireAuth).mockResolvedValue(session as never)
})

describe("GET /api/crm/leads", () => {
  it("retorna as contagens de relacionamento de cada lead", async () => {
    vi.mocked(db.select).mockReturnValue(
      createQueryBuilder([
        {
          id: 1,
          razaoSocial: "Tecelagem Alpha",
          totalOportunidades: 4,
          totalPedidos: 6,
          totalVisitas: 3,
          totalAcoes: 9,
          faixaConversao: "QUENTE",
        },
      ]) as never
    )

    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([
      {
        id: 1,
        razaoSocial: "Tecelagem Alpha",
        totalOportunidades: 4,
        totalPedidos: 6,
        totalVisitas: 3,
        totalAcoes: 9,
        faixaConversao: "QUENTE",
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
  })
})

describe("POST /api/crm/leads", () => {
  it("rejeita CNPJ com quantidade inválida de dígitos", async () => {
    const res = await post({ tipoPessoa: "PJ", razaoSocial: "Empresa", cnpj: "123" })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "CNPJ deve ter 14 dígitos" })
  })

  it("pontua CNPJ digitado sem pontuação antes de salvar", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([]) as never)
    const insertBuilder = createQueryBuilder(undefined)
    insertBuilder.returning = vi.fn(() =>
      Promise.resolve([
        { id: 9, tipoPessoa: "PJ", razaoSocial: "Conforto Prime", cnpj: "47.646.133/0001-01" },
      ])
    )
    vi.mocked(db.insert).mockReturnValue(insertBuilder as never)

    const res = await post({
      tipoPessoa: "PJ",
      razaoSocial: "Conforto Prime",
      cnpj: "47646133000101",
    })
    expect(res.status).toBe(201)
    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.objectContaining({ cnpj: "47.646.133/0001-01" })
    )
  })

  it("bloqueia CNPJ duplicado mesmo com pontuação diferente", async () => {
    vi.mocked(db.select).mockReturnValue(createQueryBuilder([{ id: 17 }]) as never)

    const res = await post({
      tipoPessoa: "PJ",
      razaoSocial: "Duplicata",
      cnpj: "47.646.133/0001-01",
    })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "CNPJ já cadastrado" })
  })
})
