// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { createQueryBuilder } from "@/test/route-db-mock"
import { POST } from "./route"


const { requireAuth, db, contextoInicial, buscarChaveIAAnalise, medirMensagensIA, perfilContextoDaChave } =
  vi.hoisted(() => ({
    requireAuth: vi.fn(),
    db: { select: vi.fn() },
    contextoInicial: vi.fn(),
    buscarChaveIAAnalise: vi.fn(),
    medirMensagensIA: vi.fn(),
    perfilContextoDaChave: vi.fn(() => "padrao"),
  }))

vi.mock("@/lib/auth", () => ({ requireAuth }))
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/crm/saude-prospeccao-ia", () => ({
  contextoInicial,
  buscarChaveIAAnalise,
  medirMensagensIA,
  perfilContextoDaChave,
}))
vi.mock("@/lib/notificar", () => ({
  notificarErro: vi.fn(),
  notificar: vi.fn(),
  registrarLog: vi.fn(),
}))

const sessao = {
  userId: 7,
  session: { user: { id: "7", name: "Admin", email: "admin@teste.com", role: "CRM" } },
}

const chave = {
  id: 3,
  provedor: "openai_compatible",
  nome: "NVIDIA Nemotron",
  modelo: "Nemotron 3.5 Super VL 120B A12B",
}

const linha = {
  id: 10,
  tipo: "cliente" as const,
  nome: "Cliente Alpha",
  scoreEsforco: 80,
  scoreEngajamento: 45,
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/crm/saude-prospeccao/ia/analises/preview", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAuth.mockResolvedValue(sessao)
  db.select.mockReturnValue(createQueryBuilder([chave]))
  buscarChaveIAAnalise.mockResolvedValue(chave)
  contextoInicial.mockResolvedValue({
    linhas: [linha],
    mensagens: [
      { role: "system", content: "REGRAS_SISTEMA" },
      { role: "user", content: "Dados dos registros filtrados na tela: ...\n\nFaça uma análise..." },
    ],
    compactacao: { total: 1, incluidos: 1, omitidos: 0 },
  })
  medirMensagensIA.mockReturnValue({ enviadoChars: 123, estTokensAprox: 31 })
  perfilContextoDaChave.mockReturnValue("padrao")
})

describe("/api/crm/saude-prospeccao/ia/analises/preview", () => {
  it("devolve 401 sem sessão", async () => {
    requireAuth.mockResolvedValue(NextResponse.json({ error: "Não autorizado" }, { status: 401 }))
    const resposta = await POST(request({ linhas: [linha] }))
    expect(resposta.status).toBe(401)
  })

  it("valida o payload", async () => {
    const resposta = await POST(request({ linhas: [] }))
    expect(resposta.status).toBe(400)
  })

  it("devolve payload e mensagens sem expor a chave da API", async () => {
    const resposta = await POST(request({ linhas: [linha], filtros: { busca: "Alpha" } }))
    expect(resposta.status).toBe(200)
    const corpo = await resposta.json()
    expect(corpo.payload.linhas).toHaveLength(1)
    expect(corpo.payload.linhas[0].nome).toBe("Cliente Alpha")
    expect(corpo.payload.filtros).toEqual({ busca: "Alpha" })
    expect(corpo.mensagens).toHaveLength(2)
    expect(corpo.chave).toEqual({ id: 3, provedor: "openai_compatible", nome: "NVIDIA Nemotron", modelo: "Nemotron 3.5 Super VL 120B A12B" })
    expect(corpo.enviadoChars).toBeGreaterThan(0)
    expect(corpo.estTokensAprox).toBeGreaterThan(0)
    expect(corpo.compactacao).toEqual({ total: 1, incluidos: 1, omitidos: 0 })
    expect(JSON.stringify(corpo)).not.toContain("chaveApi")
    expect(resposta.headers.get("X-Enviado-Chars")).toBe(String(corpo.enviadoChars))
    expect(resposta.headers.get("X-Est-Tokens-Aprox")).toBe(String(corpo.estTokensAprox))
    expect(contextoInicial).toHaveBeenCalledWith([linha], { busca: "Alpha" }, "padrao")
  })

  it("usa o perfil nvidia quando a chave selecionada é NVIDIA", async () => {
    perfilContextoDaChave.mockReturnValue("nvidia")

    const resposta = await POST(request({ linhas: [linha] }))

    expect(resposta.status).toBe(200)
    expect(perfilContextoDaChave).toHaveBeenCalledWith(chave)
    expect(contextoInicial).toHaveBeenCalledWith([linha], {}, "nvidia")
  })

  it("funciona sem chave NVIDIA correspondente", async () => {
    buscarChaveIAAnalise.mockResolvedValue(null)
    const resposta = await POST(request({ linhas: [linha] }))
    expect(resposta.status).toBe(200)
    const corpo = await resposta.json()
    expect(corpo.chave).toBeNull()
    expect(JSON.stringify(corpo)).not.toContain("chaveApi")
  })

  it("devolve 500 quando falha ao montar o contexto", async () => {
    contextoInicial.mockRejectedValue(new Error("banco indisponível"))
    const resposta = await POST(request({ linhas: [linha] }))
    expect(resposta.status).toBe(500)
  })
})
