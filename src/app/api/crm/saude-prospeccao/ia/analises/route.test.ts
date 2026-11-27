// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { createQueryBuilder } from "@/test/route-db-mock"
import { GET, POST } from "./route"

const { requireAuth: requireAuthMock, db, contextoInicial, chamarAnaliseComConsultas, podeVerTodasAnalises, buscarChaveIAAnalise, medirMensagensIA, perfilContextoDaChave } =
  vi.hoisted(() => ({
    requireAuth: vi.fn(),
    db: { select: vi.fn(), transaction: vi.fn() },
    contextoInicial: vi.fn(),
    chamarAnaliseComConsultas: vi.fn(),
    podeVerTodasAnalises: vi.fn(),
    buscarChaveIAAnalise: vi.fn(),
    medirMensagensIA: vi.fn(),
    perfilContextoDaChave: vi.fn(() => "padrao"),
  }))

vi.mock("@/lib/auth", () => ({ requireAuth: requireAuthMock }))
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/crm/saude-prospeccao-ia", () => ({
  contextoInicial,
  chamarAnaliseComConsultas,
  buscarChaveIAAnalise,
  medirMensagensIA,
  perfilContextoDaChave,
}))
vi.mock("@/lib/crm/saude-prospeccao-acesso", () => ({ podeVerTodasAnalises }))
vi.mock("@/lib/notificar", () => ({
  notificarErro: vi.fn(),
  notificar: vi.fn(),
  registrarLog: vi.fn(),
}))

const analise = {
  id: 77,
  titulo: "Análise teste",
  analise: "## Diagnóstico\n\nOK",
  resumo: "OK",
  situacao: "ABERTA",
  criadoPor: 7,
  createdAt: "2026-11-22T10:00:00.000Z",
}

const sessao = {
  userId: 7,
  session: {
    user: { id: "7", name: "Admin", email: "admin@teste.com", role: "CRM" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/crm/saude-prospeccao/ia/analises", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const linha = {
  id: 10,
  tipo: "cliente" as const,
  nome: "Cliente Alpha",
  scoreEsforco: 80,
  scoreEngajamento: 45,
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAuthMock.mockResolvedValue(sessao)
  podeVerTodasAnalises.mockReturnValue(true)
  db.select.mockReturnValue(createQueryBuilder([analise]))
  db.transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) =>
    callback({ insert: vi.fn(() => createQueryBuilder([analise])) } as unknown as typeof db)
  )
  buscarChaveIAAnalise.mockResolvedValue(null)
  perfilContextoDaChave.mockReturnValue("padrao")
  contextoInicial.mockResolvedValue({
    linhas: [linha],
    mensagens: [],
    compactacao: { total: 1, incluidos: 1, omitidos: 0 },
  })
  medirMensagensIA.mockReturnValue({ enviadoChars: 200, estTokensAprox: 50 })
  chamarAnaliseComConsultas.mockResolvedValue({
    conteudo: analise.analise,
    resultado: { provedor: "groq", modelo: "teste" },
    consultas: [],
    fatiamento: undefined,
  })
})

describe("/api/crm/saude-prospeccao/ia/analises", () => {
  it("GET devolve 401 sem sessão", async () => {
    requireAuthMock.mockResolvedValue(NextResponse.json({ error: "Não autorizado" }, { status: 401 }))
    const resposta = await GET()
    expect(resposta.status).toBe(401)
  })

  it("GET lista análises visíveis", async () => {
    const resposta = await GET()
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ analises: [analise] })
  })

  it("POST valida o payload", async () => {
    const resposta = await POST(request({ linhas: [] }))
    expect(resposta.status).toBe(400)
  })

  it("POST devolve 503 quando não há provedor de IA", async () => {
    chamarAnaliseComConsultas.mockResolvedValue({
      conteudo: "",
      resultado: { provedor: "nenhum", modelo: null },
      consultas: [],
    })
    const resposta = await POST(request({ linhas: [linha] }))
    expect(resposta.status).toBe(503)
  })

  it("POST devolve 413 com orientação quando o payload é grande demais", async () => {
    chamarAnaliseComConsultas.mockResolvedValue({
      conteudo: "",
      resultado: {
        provedor: "nenhum",
        modelo: null,
        status: 413,
        codigo: "PAYLOAD_TOO_LARGE",
        erro: "Error: HTTP 413: Request too large",
      },
      consultas: [],
    })
    const resposta = await POST(request({ linhas: [linha] }))
    expect(resposta.status).toBe(413)
    const corpo = await resposta.json()
    expect(corpo.error).toMatch(/Dados demais/i)
    expect(corpo.detalhe).toMatch(/Reduza os filtros/i)
    expect(corpo.compactacao).toEqual({ total: 1, incluidos: 1, omitidos: 0 })
    expect(resposta.headers.get("X-Enviado-Chars")).toBe("200")
  })

  it("POST cria análise e mensagem inicial", async () => {
    const resposta = await POST(request({ titulo: "Análise teste", linhas: [linha], filtros: { busca: "Alpha" } }))
    expect(resposta.status).toBe(201)
    expect(await resposta.json()).toEqual({ analise, fatiamento: undefined })
    expect(contextoInicial).toHaveBeenCalledWith([linha], { busca: "Alpha" }, "padrao")
    expect(chamarAnaliseComConsultas).toHaveBeenCalledWith(
      expect.objectContaining({
        mensagens: [],
        chaveId: undefined,
        perfil: "padrao",
        dadosFonte: { linhas: [linha], filtros: { busca: "Alpha" } },
      })
    )
    expect(db.transaction).toHaveBeenCalledTimes(1)
  })

  it("POST devolve os metadados do processamento em fatias", async () => {
    const fatiamento = { total: 200, fatias: 5, incluidos: 200, omitidos: 0 }
    chamarAnaliseComConsultas.mockResolvedValue({
      conteudo: analise.analise,
      resultado: { provedor: "groq", modelo: "teste" },
      consultas: [],
      fatiamento,
    })

    const resposta = await POST(request({ titulo: "Análise teste", linhas: [linha], filtros: {} }))
    expect(resposta.status).toBe(201)
    expect(await resposta.json()).toEqual({ analise, fatiamento })
  })

  it("POST passa o perfil nvidia ao montar o contexto", async () => {
    buscarChaveIAAnalise.mockResolvedValue({
      id: 3,
      provedor: "openai_compatible",
      nome: "NVIDIA Nemotron",
      modelo: "nvidia/nemotron-3-ultra-550b-a55b",
    })
    perfilContextoDaChave.mockReturnValue("nvidia")

    const resposta = await POST(request({ titulo: "Análise teste", linhas: [linha], filtros: {} }))

    expect(resposta.status).toBe(201)
    expect(contextoInicial).toHaveBeenCalledWith([linha], {}, "nvidia")
  })
})
