export type FaixaConversao = "QUENTE" | "MORNO" | "FRIO"

export const FAIXAS_CONVERSAO: Array<{
  faixa: FaixaConversao
  rotulo: string
  descricao: string
}> = [
  { faixa: "QUENTE", rotulo: "Quentes", descricao: "Oportunidade em negociação" },
  { faixa: "MORNO", rotulo: "Mornos", descricao: "Oportunidade em proposta" },
  { faixa: "FRIO", rotulo: "Frios", descricao: "Sem oportunidade em negociação ou proposta" },
]

type ItemComFaixa = {
  faixaConversao?: FaixaConversao | string | null
}

export function contarFaixasConversao<T extends ItemComFaixa>(
  itens: T[]
): Record<FaixaConversao, number> {
  const contagem: Record<FaixaConversao, number> = { QUENTE: 0, MORNO: 0, FRIO: 0 }

  for (const item of itens) {
    if (item.faixaConversao === "QUENTE" || item.faixaConversao === "MORNO") {
      contagem[item.faixaConversao] += 1
    } else {
      contagem.FRIO += 1
    }
  }

  return contagem
}
