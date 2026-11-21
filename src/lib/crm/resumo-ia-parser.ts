import { z } from "zod"

const textoOuListaSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((valor) => (Array.isArray(valor) ? valor.filter(Boolean).join("\n") : valor))

export const respostaResumoIaSchema = z
  .object({
    resumo: textoOuListaSchema.pipe(z.string().trim().min(20, "Resumo muito curto").max(4000)),
    insights: textoOuListaSchema.pipe(z.string().trim().max(4000)).optional().default(""),
    sugestoes: textoOuListaSchema.pipe(z.string().trim().max(4000)).optional().default(""),
    classificacao: z.enum(["QUENTE", "MORNO", "FRIO"]),
    motivoClassificacao: textoOuListaSchema.pipe(z.string().trim().max(2000)).optional().default(""),
  })
  .strict()

export type RespostaResumoIa = z.infer<typeof respostaResumoIaSchema>

export function extrairJsonResposta(conteudo: string): unknown {
  const semFence = conteudo
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  try {
    return JSON.parse(semFence)
  } catch {
    const inicio = semFence.indexOf("{")
    const fim = semFence.lastIndexOf("}")
    if (inicio >= 0 && fim > inicio) {
      try {
        return JSON.parse(semFence.slice(inicio, fim + 1))
      } catch {}
    }
    throw new Error("A IA retornou um formato inválido")
  }
}

export function parseRespostaResumoIa(conteudo: string): RespostaResumoIa {
  const json = extrairJsonResposta(conteudo)
  const resultado = respostaResumoIaSchema.safeParse(json)
  if (!resultado.success) {
    throw new Error("A IA retornou um resumo incompleto")
  }
  return resultado.data
}
