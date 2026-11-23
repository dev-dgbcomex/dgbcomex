export type ClassificacaoSaude = "AEC" | "BEC" | "Engajados"

export type TomClassificacaoSaude = "vermelho" | "azul" | "amarelo"

export const REGRAS_CLASSIFICACAO_SAUDE = {
  engajamentoMinimoEngajado: 30,
  esforçoMinimoAec: 45,
} as const

export function classificarSaudeProspeccao(linha: {
  scoreEsforco: number
  scoreEngajamento: number
}): { rotulo: ClassificacaoSaude; tom: TomClassificacaoSaude } {
  if (linha.scoreEngajamento > REGRAS_CLASSIFICACAO_SAUDE.engajamentoMinimoEngajado) {
    return { rotulo: "Engajados", tom: "amarelo" }
  }
  if (linha.scoreEsforco > REGRAS_CLASSIFICACAO_SAUDE.esforçoMinimoAec) {
    return { rotulo: "AEC", tom: "vermelho" }
  }
  return { rotulo: "BEC", tom: "azul" }
}
