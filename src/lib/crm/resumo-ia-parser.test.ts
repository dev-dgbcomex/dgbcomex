// @vitest-environment node
import { describe, expect, it } from "vitest"
import { extrairJsonResposta, parseRespostaResumoIa } from "./resumo-ia-parser"

const respostaValida = {
  resumo: "Cliente com contato recente e proposta em aberto.",
  insights: "Houve evolução no relacionamento.",
  sugestoes: ["Agendar visita", "Atualizar proposta"],
  classificacao: "MORNO",
  motivoClassificacao: "Último contato há 35 dias.",
}

describe("parseRespostaResumoIa", () => {
  it("aceita JSON puro", () => {
    expect(parseRespostaResumoIa(JSON.stringify(respostaValida))).toEqual({
      ...respostaValida,
      sugestoes: "Agendar visita\nAtualizar proposta",
    })
  })

  it("extrai JSON de markdown e normaliza listas", () => {
    const conteudo = `Segue:\n\`\`\`json\n${JSON.stringify(respostaValida)}\n\`\`\``
    expect(parseRespostaResumoIa(conteudo).sugestoes).toBe("Agendar visita\nAtualizar proposta")
  })

  it("rejeita JSON fora do formato", () => {
    expect(() => parseRespostaResumoIa("não é json")).toThrow(/formato inválido/i)
    expect(() => parseRespostaResumoIa(JSON.stringify({ ...respostaValida, classificacao: "QUENTÍSSIMO" }))).toThrow(
      /incompleto/i
    )
  })

  it("detecta objeto cercado por texto", () => {
    expect(extrairJsonResposta(`texto ${JSON.stringify(respostaValida)} texto`)).toEqual(respostaValida)
  })
})
