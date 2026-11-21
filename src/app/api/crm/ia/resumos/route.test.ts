// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { chamarIA } from "@/lib/ai"
import { db } from "@/lib/db"
import { buscarContextoResumoIA, montarMensagensResumo } from "@/lib/crm/resumo-ia-contexto"
import { parseRespostaResumoIa } from "@/lib/crm/resumo-ia-parser"
import { notificarErro } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/ai", () => ({ chamarIA: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), transaction: vi.fn() },
}))
vi.mock("@/lib/crm/resumo-ia-contexto", () => ({
  buscarContextoResumoIA: vi.fn(),
  montarMensagensResumo: vi.fn(),
}))
vi.mock("@/lib/crm/resumo-ia-parser", () => ({ parseRespostaResumoIa: vi.fn() }))
vi.mock("@/lib/notificar", () => ({ notificarErro: vi.fn() }))

const sessao = {
  session: { user: { id: "1", role: "CRM", name: "Tiago" } },
  userId: 1,
}

const resposta = {
  resumo: "Cliente com contato recente e proposta em aberto.",
  insights: "Evolução positiva no relacionamento.",
  sugestoes: "Agendar visita e atualizar proposta.",
  classificacao: "MORNO" as const,
  motivoClassificacao: "Último contato há 35 dias.",
}

const resumoSalvo = { id: 55, ...resposta, entidadeTipo: "lead", entidadeId: 9 }

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/crm/ia/resumos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

function get(tipo: string, id: string) {
  return GET(new NextRequest(`http://localhost/api/crm/ia/resumos?tipo=${tipo}&id=${id}`))
}

describe("/api/crm/ia/resumos", () => {
  let tx: any

  beforeEach(() => {
    resetDb(db)
    vi.mocked(requireAuth).mockReset()
    vi.mocked(chamarIA).mockReset()
    vi.mocked(buscarContextoResumoIA).mockReset()
    vi.mocked(montarMensagensResumo).mockReset()
    vi.mocked(parseRespostaResumoIa).mockReset()
    vi.mocked(notificarErro).mockReset()
    vi.mocked(db.transaction).mockReset()

    vi.mocked(requireAuth).mockResolvedValue(sessao as any)
    vi.mocked(chamarIA).mockResolvedValue({
      conteudo: "{}",
      provedor: "groq",
      modelo: "modelo-teste",
      nomeChave: "teste",
      tentativas: 1,
    })
    vi.mocked(buscarContextoResumoIA).mockResolvedValue({} as any)
    vi.mocked(montarMensagensResumo).mockReturnValue({ system: "system", user: "user" })
    vi.mocked(parseRespostaResumoIa).mockReturnValue(resposta as any)
    vi.mocked(db.select).mockImplementation(() => createQueryBuilder([{ id: 9 }]) as any)

    tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(createQueryBuilder([resumoSalvo]))
        .mockReturnValueOnce(createQueryBuilder([{ id: 77 }])),
      update: vi.fn(() => createQueryBuilder([])),
    }
    vi.mocked(db.transaction).mockImplementation(async (callback: any) => callback(tx))
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )

    const res = await post({ tipo: "lead", id: 9 })

    expect(res.status).toBe(401)
    expect(chamarIA).not.toHaveBeenCalled()
  })

  it("valida tipo e id", async () => {
    const res = await post({ tipo: "empresa", id: 9 })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBeTruthy()
    expect(chamarIA).not.toHaveBeenCalled()
  })

  it("retorna 404 quando a entidade não existe", async () => {
    vi.mocked(db.select).mockImplementation(() => createQueryBuilder([]) as any)

    const res = await post({ tipo: "lead", id: 999 })

    expect(res.status).toBe(404)
    expect(chamarIA).not.toHaveBeenCalled()
  })

  it("gera, salva e cria evento de timeline para lead", async () => {
    const res = await post({ tipo: "lead", id: 9 })

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ resumo: resumoSalvo })
    expect(buscarContextoResumoIA).toHaveBeenCalledWith({ tipo: "lead", id: 9 })
    expect(chamarIA).toHaveBeenCalledWith(
      [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
      { temperatura: 0, maxTokens: 700 }
    )
    expect(tx.insert).toHaveBeenCalledTimes(2)
    expect(tx.update).toHaveBeenCalledTimes(1)

    const evento = tx.insert.mock.results[1]!.value.values.mock.calls[0]![0]
    expect(evento).toMatchObject({ tipo: "RESUMO_IA", empresaId: 9, clienteId: null })
    expect(evento.metadados).toEqual({ resumoId: 55, classificacao: "MORNO" })
  })

  it("não espelha campos legados para cliente", async () => {
    vi.mocked(db.select).mockImplementation(() => createQueryBuilder([{ id: 12 }]) as any)

    const res = await post({ tipo: "cliente", id: 12 })

    expect(res.status).toBe(201)
    expect(tx.update).not.toHaveBeenCalled()
    const evento = tx.insert.mock.results[1]!.value.values.mock.calls[0]![0]
    expect(evento).toMatchObject({ tipo: "RESUMO_IA", clienteId: 12, empresaId: null })
  })

  it("retorna 503 quando não há provedor de IA", async () => {
    vi.mocked(chamarIA).mockResolvedValue({
      conteudo: "erro",
      provedor: "nenhum",
      modelo: "",
      nomeChave: "",
      tentativas: 0,
    })

    const res = await post({ tipo: "lead", id: 9 })

    expect(res.status).toBe(503)
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it("retorna 502 quando a resposta da IA é inválida", async () => {
    vi.mocked(parseRespostaResumoIa).mockImplementation(() => {
      throw new Error("inválido")
    })

    const res = await post({ tipo: "lead", id: 9 })

    expect(res.status).toBe(502)
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it("lista os resumos da entidade", async () => {
    vi.mocked(db.select).mockImplementation(() => createQueryBuilder([resumoSalvo]) as any)

    const res = await get("lead", "9")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ resumos: [resumoSalvo] })
    expect(db.select).toHaveBeenCalledTimes(1)
  })
})
