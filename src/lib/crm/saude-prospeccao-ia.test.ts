// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { chamarIA } from "@/lib/ai"
import { chamarAnaliseComConsultas, montarMensagensAnalise } from "./saude-prospeccao-ia"

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
