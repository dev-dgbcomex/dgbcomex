// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { chamarIA } from "@/lib/ai"
import { chamarAnaliseComConsultas } from "./saude-prospeccao-ia"

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

    expect(chamarIA).toHaveBeenNthCalledWith(1, expect.any(Array), {
      temperatura: 0,
      maxTokens: 80,
    })
    expect(chamarIA).toHaveBeenNthCalledWith(2, expect.any(Array), {
      temperatura: 0,
      maxTokens: 700,
    })
    expect(resultado.conteudo).toContain("Diagnóstico")
    expect(resultado.resultado.provedor).toBe("groq")
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
})
