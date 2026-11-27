// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { createQueryBuilder } from "@/test/route-db-mock"
import { GET as GET_DETALHE } from "./[id]/route"
import { POST as POST_MENSAGEM } from "./[id]/mensagens/route"
import { POST as POST_CONCLUIR } from "./[id]/concluir/route"

const {
  requireAuth,
  db,
  carregarAnaliseAutorizada,
  sendEmail,
  buscarTemperaturas,
  prepararLinhas,
  montarMensagensAnalise,
  chamarAnaliseComConsultas,
  medirMensagensIA,
  buscarChaveIAAnalise,
  perfilContextoDaChave,
} = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  db: { select: vi.fn(), transaction: vi.fn(), update: vi.fn() },
  carregarAnaliseAutorizada: vi.fn(),
  sendEmail: vi.fn(),
  buscarTemperaturas: vi.fn(),
  prepararLinhas: vi.fn(),
  montarMensagensAnalise: vi.fn(),
  chamarAnaliseComConsultas: vi.fn(),
  medirMensagensIA: vi.fn(),
  buscarChaveIAAnalise: vi.fn(),
  perfilContextoDaChave: vi.fn(() => "padrao"),
}))

vi.mock("@/lib/auth", () => ({ requireAuth }))
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/crm/saude-prospeccao-acesso", () => ({ carregarAnaliseAutorizada }))
vi.mock("@/lib/email", () => ({ sendEmail }))
vi.mock("@/lib/crm/saude-prospeccao-ia", () => ({
  buscarTemperaturas,
  prepararLinhas,
  montarMensagensAnalise,
  chamarAnaliseComConsultas,
  medirMensagensIA,
  buscarChaveIAAnalise,
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

const analise = {
  id: 77,
  titulo: "Análise teste",
  analise: "## Diagnóstico\n\nOK",
  situacao: "ABERTA",
  criadoPorEmail: "admin@teste.com",
  contexto: { registros: [{ id: 10, tipo: "cliente", nome: "Alpha" }] },
  filtros: { busca: "Alpha" },
}

const mensagem = {
  id: 1,
  analiseId: 77,
  papel: "assistente",
  conteudo: "Resposta",
  dadosUsados: {},
  createdAt: "2026-11-22T10:01:00.000Z",
}

const params = Promise.resolve({ id: "77" })

function request(body: unknown) {
  return new NextRequest("http://localhost/api/crm/saude-prospeccao/ia/analises/77/mensagens", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAuth.mockResolvedValue(sessao)
  carregarAnaliseAutorizada.mockResolvedValue(analise)
  db.select.mockReturnValue(createQueryBuilder([mensagem]))
  db.update.mockReturnValue(createQueryBuilder([analise]))
  db.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      insert: vi.fn(() => createQueryBuilder([mensagem])),
      update: vi.fn(() => createQueryBuilder([analise])),
    })
  )
  buscarTemperaturas.mockResolvedValue(new Map())
  prepararLinhas.mockReturnValue([])
  montarMensagensAnalise.mockReturnValue([])
  medirMensagensIA.mockReturnValue({ enviadoChars: 100, estTokensAprox: 25 })
  buscarChaveIAAnalise.mockResolvedValue(null)
  perfilContextoDaChave.mockReturnValue("padrao")
  chamarAnaliseComConsultas.mockResolvedValue({
    conteudo: "Resposta",
    resultado: { provedor: "groq", modelo: "teste" },
    consultas: [],
    fatiamento: undefined,
  })
  sendEmail.mockResolvedValue({ sent: 1, error: null })
})

describe("GET /api/crm/saude-prospeccao/ia/analises/[id]", () => {
  it("rejeita ID inválido", async () => {
    const resposta = await GET_DETALHE(new NextRequest("http://localhost/x"), {
      params: Promise.resolve({ id: "abc" }),
    })
    expect(resposta.status).toBe(400)
  })

  it("devolve 404 quando a análise não existe", async () => {
    carregarAnaliseAutorizada.mockResolvedValue(null)
    const resposta = await GET_DETALHE(new NextRequest("http://localhost/x"), { params })
    expect(resposta.status).toBe(404)
  })

  it("devolve análise e mensagens", async () => {
    const resposta = await GET_DETALHE(new NextRequest("http://localhost/x"), { params })
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ analise, mensagens: [mensagem] })
  })
})

describe("POST /api/crm/saude-prospeccao/ia/analises/[id]/mensagens", () => {
  it("devolve 404 quando a análise não existe", async () => {
    carregarAnaliseAutorizada.mockResolvedValue(null)
    const resposta = await POST_MENSAGEM(request({ mensagens: [], pergunta: "E agora?" }), { params })
    expect(resposta.status).toBe(404)
  })

  it("devolve 503 quando não há provedor de IA", async () => {
    chamarAnaliseComConsultas.mockResolvedValue({
      conteudo: "",
      resultado: { provedor: "nenhum", modelo: null },
      consultas: [],
    })
    const resposta = await POST_MENSAGEM(request({ mensagens: [], pergunta: "E agora?" }), { params })
    expect(resposta.status).toBe(503)
  })

  it("devolve 413 quando a pergunta e o histórico excedem o limite do provedor", async () => {
    chamarAnaliseComConsultas.mockResolvedValue({
      conteudo: "",
      resultado: { provedor: "nenhum", modelo: null, status: 413, codigo: "PAYLOAD_TOO_LARGE" },
      consultas: [],
    })
    const resposta = await POST_MENSAGEM(request({ mensagens: [], pergunta: "E agora?" }), { params })
    expect(resposta.status).toBe(413)
    const corpo = await resposta.json()
    expect(corpo.error).toMatch(/Dados demais/i)
    expect(corpo.detalhe).toMatch(/tamanho da pergunta/i)
    expect(resposta.headers.get("X-Enviado-Chars")).toBe("100")
  })

  it("salva pergunta e resposta", async () => {
    const resposta = await POST_MENSAGEM(
      request({
        mensagens: [{ papel: "assistente", conteudo: "Resposta anterior" }],
        pergunta: "E agora?",
      }),
      { params }
    )
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ mensagens: [mensagem], fatiamento: undefined })
    expect(perfilContextoDaChave).toHaveBeenCalledWith(null)
    expect(montarMensagensAnalise).toHaveBeenCalledWith(
      expect.objectContaining({ perfil: "padrao", pergunta: "E agora?" })
    )
    expect(chamarAnaliseComConsultas).toHaveBeenCalledWith(
      expect.objectContaining({
        chaveId: undefined,
        dadosFonte: {
          linhas: [],
          filtros: { busca: "Alpha" },
          pergunta: "E agora?",
          historico: [{ papel: "assistente", conteudo: "Resposta anterior" }],
        },
      })
    )
    expect(db.transaction).toHaveBeenCalledTimes(1)
  })

  it("devolve metadados do fatiamento ao responder uma mensagem", async () => {
    const fatiamento = { total: 200, fatias: 4, incluidos: 200, omitidos: 0 }
    chamarAnaliseComConsultas.mockResolvedValue({
      conteudo: "Resposta",
      resultado: { provedor: "groq", modelo: "teste" },
      consultas: [],
      fatiamento,
    })

    const resposta = await POST_MENSAGEM(request({ mensagens: [], pergunta: "E agora?" }), { params })
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ mensagens: [mensagem], fatiamento })
  })
})

describe("POST /api/crm/saude-prospeccao/ia/analises/[id]/concluir", () => {
  it("devolve 502 quando o e-mail falha", async () => {
    sendEmail.mockResolvedValue({ sent: 0, error: "SMTP indisponível" })
    const resposta = await POST_CONCLUIR(new NextRequest("http://localhost/x"), { params })
    expect(resposta.status).toBe(502)
  })

  it("marca a análise como enviada", async () => {
    const resposta = await POST_CONCLUIR(new NextRequest("http://localhost/x"), { params })
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ enviado: true, destinatario: "admin@teste.com" })
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})
