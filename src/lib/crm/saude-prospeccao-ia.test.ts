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

  it("usa as mesmas opções do resumo de IA do cliente", async () => {
    vi.mocked(chamarIA).mockResolvedValue({
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

    expect(chamarIA).toHaveBeenCalledWith(expect.any(Array), { temperatura: 0, maxTokens: 700 })
    expect(resultado.conteudo).toContain("Diagnóstico")
    expect(resultado.resultado.provedor).toBe("groq")
  })
})
