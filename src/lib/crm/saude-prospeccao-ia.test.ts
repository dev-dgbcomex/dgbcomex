// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { chamarIA } from "@/lib/ai"
import {
  chamarAnaliseComConsultas,
  medirMensagensIA,
  montarMensagensAnalise,
  type LinhaAnaliseContexto,
} from "./saude-prospeccao-ia"

vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/ai", () => ({ chamarIA: vi.fn() }))

describe("chamarAnaliseComConsultas", () => {
  beforeEach(() => {
    vi.mocked(chamarIA).mockReset()
  })

  it("usa chamada curta para decidir consultas e mantém 700 tokens na resposta final", async () => {
    vi.mocked(chamarIA)
      .mockResolvedValueOnce({
        conteudo: "PRONTO",
        provedor: "groq",
        modelo: "qwen/qwen3.8-27b",
        nomeChave: "Groq (env)",
        tentativas: 1,
      })
      .mockResolvedValueOnce({
        conteudo: "## Diagnóstico\n\nEngajados.",
        provedor: "groq",
        modelo: "qwen/qwen3.8-27b",
        nomeChave: "Groq (env)",
        tentativas: 1,
      })

    const resultado = await chamarAnaliseComConsultas({
      mensagens: [
        { role: "system", content: "Regras do sistema" },
        { role: "user", content: "Dados filtrados" },
      ],
    })

    expect(chamarIA).toHaveBeenNthCalledWith(1, expect.any(Array), expect.objectContaining({ temperatura: 0, maxTokens: 80 }), undefined)
    expect(chamarIA).toHaveBeenNthCalledWith(2, expect.any(Array), expect.objectContaining({ temperatura: 0, maxTokens: 700 }), undefined)
    expect(resultado.conteudo).toContain("Diagnóstico")
    expect(resultado.resultado.provedor).toBe("groq")
  })

  it("usa a chave forçada quando informada", async () => {
    vi.mocked(chamarIA)
      .mockResolvedValueOnce({
        conteudo: "PRONTO",
        provedor: "openai_compatible",
        modelo: "nemotron-3.5-super-vl-120b-a12b",
        nomeChave: "NVIDIA Nemotron",
        tentativas: 1,
      })
      .mockResolvedValueOnce({
        conteudo: "## Diagnóstico\n\nEngajados.",
        provedor: "openai_compatible",
        modelo: "nemotron-3.5-super-vl-120b-a12b",
        nomeChave: "NVIDIA Nemotron",
        tentativas: 1,
      })

    const resultado = await chamarAnaliseComConsultas({
      mensagens: [
        { role: "system", content: "Regras do sistema" },
        { role: "user", content: "Dados filtrados" },
      ],
      chaveId: 42,
    })

    expect(chamarIA).toHaveBeenNthCalledWith(1, expect.any(Array), expect.objectContaining({ maxTokens: 80 }), 42)
    expect(chamarIA).toHaveBeenNthCalledWith(2, expect.any(Array), expect.objectContaining({ maxTokens: 700 }), 42)
    expect(resultado.conteudo).toContain("Diagnóstico")
    expect(resultado.resultado.provedor).toBe("openai_compatible")
  })

  it("não gera análise quando a decisão falha", async () => {
    vi.mocked(chamarIA).mockResolvedValueOnce({
      conteudo: "Desculpe, estou com dificuldades tecnicas no momento.",
      provedor: "nenhum",
      modelo: "",
      nomeChave: "",
      tentativas: 1,
    })

    const resultado = await chamarAnaliseComConsultas({
      mensagens: [{ role: "user", content: "Dados filtrados" }],
    })

    expect(chamarIA).toHaveBeenCalledTimes(1)
    expect(resultado.resultado.provedor).toBe("nenhum")
    expect(resultado.conteudo).toBe("")
  })

  it("explica a nova fórmula de conversão nas regras do sistema", () => {
    const mensagens = montarMensagensAnalise({ linhas: [], filtros: {} })
    const regras = mensagens.find((mensagem) => mensagem.role === "system")?.content ?? ""

    expect(regras).toMatch(/pedidos de venda ÷ oportunidades/i)
    expect(regras).toMatch(/faturamentos ÷ pedidos de venda/i)
    expect(regras).toMatch(/limitada a 100%/i)
  })
})

describe("montarMensagensAnalise — limite de payload", () => {
  function linha(index: number): LinhaAnaliseContexto {
    return {
      id: index,
      tipo: "cliente",
      nome: `Cliente ${index} ${"Longo ".repeat(30)}`,
      scoreEsforco: 60,
      scoreEngajamento: index === 199 ? 100 : 20,
      percentualConversao: 50,
      visitasRealizadas: 1,
      visitasAgendadas: 1,
      acoesRealizadas: 2,
      acoesAgendadas: 1,
      pedidosVenda: 1,
      faturamentos: 1,
      chave: `cliente:${index}`,
      classificacao: "BEC",
      temperatura: index === 199 ? "QUENTE" : "FRIO",
    }
  }

  function blocoDeDados(mensagens: ReturnType<typeof montarMensagensAnalise>) {
    const conteudo = mensagens.find((mensagem) => mensagem.role === "user")?.content ?? ""
    const inicio = conteudo.indexOf("{")
    const fim = conteudo.lastIndexOf("}")
    return JSON.parse(conteudo.slice(inicio, fim + 1)) as {
      registros: { nome: string; engajamento: number }[]
      amostragem: {
        total: number
        incluidos: number
        omitidos: number
        resumoDosOmitidos: { quantidade: number }
      }
    }
  }

  it("compacta 200 registros em JSON válido dentro do limite", () => {
    const mensagens = montarMensagensAnalise({
      linhas: Array.from({ length: 200 }, (_, index) => linha(index)),
      filtros: { busca: "x".repeat(300) },
    })
    const dados = blocoDeDados(mensagens)

    expect(dados.amostragem.total).toBe(200)
    expect(dados.amostragem.incluidos).toBeGreaterThan(0)
    expect(dados.amostragem.incluidos).toBeLessThan(200)
    expect(dados.amostragem.omitidos).toBe(200 - dados.amostragem.incluidos)
    expect(dados.amostragem.resumoDosOmitidos.quantidade).toBe(dados.amostragem.omitidos)
    expect(dados.registros).toHaveLength(dados.amostragem.incluidos)
    expect(dados.registros[0].engajamento).toBe(100)
    expect(medirMensagensIA(mensagens).estTokensAprox).toBeLessThan(6_000)
  })

  it("limita o histórico mesmo com muitas mensagens longas", () => {
    const mensagens = montarMensagensAnalise({
      linhas: [],
      filtros: {},
      historico: Array.from({ length: 20 }, (_, index) => ({
        papel: index % 2 === 0 ? ("assistente" as const) : ("usuario" as const),
        conteudo: "h".repeat(8_000),
      })),
    })

    expect(mensagens).toHaveLength(8)
    expect(medirMensagensIA(mensagens).enviadoChars).toBeLessThan(12_000)
  })

  it("limita dados de consulta curada sem cortar JSON no meio", () => {
    const mensagens = montarMensagensAnalise({
      linhas: [],
      filtros: {},
      dadosConsulta: {
        nome: "oportunidades",
        chave: { tipo: "cliente", id: 10 },
        limite: 20,
        dados: Array.from({ length: 100 }, () => ({ relato: "r".repeat(500) })),
      },
    })
    const conteudo = mensagens[mensagens.length - 1].content
    const inicio = conteudo.indexOf("[")
    const fim = conteudo.lastIndexOf("]")

    expect(conteudo).toMatch(/Dados da consulta curada/i)
    expect(() => JSON.parse(conteudo.slice(inicio, fim + 1))).not.toThrow()
    expect(medirMensagensIA(mensagens).enviadoChars).toBeLessThan(10_000)
  })
})
