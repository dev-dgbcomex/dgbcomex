// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { chamarIA } from "@/lib/ai"
import {
  chamarAnaliseComConsultas,
  dividirLinhasEmFatias,
  medirMensagensIA,
  montarMensagensAnalise,
  perfilContextoDaChave,
  type LinhaAnaliseContexto,
} from "./saude-prospeccao-ia"

vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/ai", () => ({ chamarIA: vi.fn() }))

describe("chamarAnaliseComConsultas", () => {
  beforeEach(() => {
    vi.mocked(chamarIA).mockReset()
  })

  it("usa chamada curta sem raciocínio e 8192 tokens na resposta final", async () => {
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

    expect(chamarIA).toHaveBeenNthCalledWith(
      1,
      expect.any(Array),
      expect.objectContaining({
        temperatura: 0,
        maxTokens: 1024,
        aceitarRaciocinio: true,
        reasoningEffort: "none",
        enableThinking: false,
      }),
      undefined
    )
    expect(chamarIA).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      expect.objectContaining({
        temperatura: 0.6,
        topP: 0.95,
        maxTokens: 8192,
        reasoningEffort: "medium",
        enableThinking: true,
        forceNonemptyContent: true,
        retryVazioComMaisTokens: true,
      }),
      undefined
    )
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

    expect(chamarIA).toHaveBeenNthCalledWith(1, expect.any(Array), expect.objectContaining({ maxTokens: 1024 }), 42)
    expect(chamarIA).toHaveBeenNthCalledWith(2, expect.any(Array), expect.objectContaining({ maxTokens: 8192 }), 42)
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

  function linhaLonga(index: number): LinhaAnaliseContexto {
    return {
      id: index,
      tipo: "cliente",
      nome: `Cliente ${index} ${"Nome extenso ".repeat(20)}`,
      scoreEsforco: 60,
      scoreEngajamento: 20,
      percentualConversao: 50,
      chave: `cliente:${index}`,
      classificacao: "BEC",
      temperatura: "FRIO",
    }
  }

  it("processa registros em fatias e mantém todos os resumos no contexto final", async () => {
    const linhas = Array.from({ length: 200 }, (_, index) => linhaLonga(index))
    const fatias = dividirLinhasEmFatias(linhas, { busca: "alpha" })
    expect(fatias.length).toBeGreaterThan(1)

    fatias.forEach((_, indice) => {
      vi.mocked(chamarIA).mockResolvedValueOnce({
        conteudo: `RESUMO FATIA ${indice + 1}`,
        provedor: "openai_compatible",
        modelo: "nemotron-3-ultra-550b-a55b",
        nomeChave: "NVIDIA Nemotron",
        tentativas: 1,
      })
    })
    vi.mocked(chamarIA).mockResolvedValueOnce({
      conteudo: "## Diagnóstico final\n\nContexto preservado.",
      provedor: "openai_compatible",
      modelo: "nemotron-3-ultra-550b-a55b",
      nomeChave: "NVIDIA Nemotron",
      tentativas: 1,
    })

    const resultado = await chamarAnaliseComConsultas({
      mensagens: [{ role: "user", content: "Pergunta curta" }],
      maxConsultas: 0,
      chaveId: 7,
      perfil: "nvidia",
      dadosFonte: { linhas, filtros: { busca: "alpha" }, pergunta: "Pergunta curta" },
    })

    expect(chamarIA).toHaveBeenCalledTimes(fatias.length + 1)
    fatias.forEach((_, indice) => {
      expect(chamarIA).toHaveBeenNthCalledWith(
        indice + 1,
        expect.any(Array),
        expect.objectContaining({
          temperatura: 0,
          maxTokens: 1024,
          reasoningEffort: "none",
          enableThinking: false,
        }),
        7
      )
    })

    const mensagensFinais = vi.mocked(chamarIA).mock.calls[fatias.length][0] as Parameters<typeof chamarIA>[0]
    const contextoFinal = mensagensFinais.find((mensagem) => mensagem.role === "user")?.content ?? ""
    expect(contextoFinal).toMatch(/processados em \d+ fatias/i)
    expect(contextoFinal).toMatch(/cobertura: 200 de 200 registros/i)
    fatias.forEach((_, indice) => expect(contextoFinal).toContain(`RESUMO FATIA ${indice + 1}`))
    expect(resultado.conteudo).toContain("Diagnóstico final")
    expect(resultado.fatiamento).toEqual({ total: 200, fatias: fatias.length, incluidos: 200, omitidos: 0 })
  })

  it("não gera a análise final se uma fatia falhar", async () => {
    const linhas = Array.from({ length: 200 }, (_, index) => linhaLonga(index))
    const fatias = dividirLinhasEmFatias(linhas, {})

    vi.mocked(chamarIA).mockResolvedValueOnce({
      conteudo: "RESUMO FATIA 1",
      provedor: "openai_compatible",
      modelo: "nemotron-3-ultra-550b-a55b",
      nomeChave: "NVIDIA Nemotron",
      tentativas: 1,
    })
    vi.mocked(chamarIA).mockResolvedValueOnce({
      conteudo: "",
      provedor: "nenhum",
      modelo: "",
      nomeChave: "",
      tentativas: 2,
      codigo: "PAYLOAD_TOO_LARGE",
    })

    const resultado = await chamarAnaliseComConsultas({
      mensagens: [{ role: "user", content: "Pergunta curta" }],
      maxConsultas: 0,
      chaveId: 7,
      perfil: "nvidia",
      dadosFonte: { linhas, filtros: {} },
    })

    expect(chamarIA).toHaveBeenCalledTimes(2)
    expect(fatias.length).toBeGreaterThan(2)
    expect(resultado.conteudo).toBe("")
    expect(resultado.resultado.codigo).toBe("PAYLOAD_TOO_LARGE")
    expect(resultado.fatiamento?.incluidos).toBe(0)
    expect(resultado.fatiamento?.omitidos).toBe(200)
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

describe("perfil de contexto NVIDIA", () => {
  function linha(index: number): LinhaAnaliseContexto {
    return {
      id: index,
      tipo: "cliente",
      nome: `Cliente ${index} ${"Longo ".repeat(30)}`,
      scoreEsforco: 60,
      scoreEngajamento: 20,
      percentualConversao: 50,
      chave: `cliente:${index}`,
      classificacao: "BEC",
      temperatura: "FRIO",
    }
  }

  it("identifica a chave NVIDIA pelo nome ou modelo", () => {
    expect(perfilContextoDaChave(null)).toBe("padrao")
    expect(
      perfilContextoDaChave({
        id: 1,
        provedor: "openai_compatible",
        nome: "NVIDIA Nemotron",
        modelo: "nvidia/nemotron-3-ultra-550b-a55b",
      })
    ).toBe("nvidia")
    expect(
      perfilContextoDaChave({ id: 2, provedor: "groq", nome: "Groq", modelo: "qwen/qwen3.8-27b" })
    ).toBe("padrao")
  })

  it("usa limite ampliado e inclui todos os registros com perfil nvidia", () => {
    const registros = Array.from({ length: 200 }, (_, index) => linha(index))
    const mensagens = montarMensagensAnalise({ linhas: registros, filtros: {}, perfil: "nvidia" })
    const conteudo = mensagens.find((mensagem) => mensagem.role === "user")?.content ?? ""
    const dados = JSON.parse(conteudo.slice(conteudo.indexOf("{"), conteudo.lastIndexOf("}") + 1)) as {
      registros: unknown[]
      amostragem: { total: number; incluidos: number; omitidos: number }
    }

    expect(dados.amostragem.total).toBe(200)
    expect(dados.amostragem.incluidos).toBe(200)
    expect(dados.amostragem.omitidos).toBe(0)
    expect(dados.registros).toHaveLength(200)
    expect(medirMensagensIA(mensagens).estTokensAprox).toBeGreaterThan(6_000)
  })
})
