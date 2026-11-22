export type FaixaConversao = "QUENTE" | "MORNO" | "FRIO"

export const FAIXAS_CONVERSAO: Array<{
  faixa: FaixaConversao
  rotulo: string
  descricao: string
}> = [
  {
    faixa: "QUENTE",
    rotulo: "Quentes",
    descricao: "Negociação ou ganho/pedido no mês",
  },
  {
    faixa: "MORNO",
    rotulo: "Mornos",
    descricao: "Proposta ou ganho/pedido no trimestre",
  },
  {
    faixa: "FRIO",
    rotulo: "Frios",
    descricao: "Sem negociação, proposta ou ganho/pedido no trimestre",
  },
]

export type ItemComFaixa = {
  faixaConversao?: FaixaConversao | string | null
}

export function itensDaFaixa<T extends ItemComFaixa>(itens: T[], faixa: FaixaConversao): T[] {
  if (faixa === "FRIO") {
    return itens.filter(
      (item) => item.faixaConversao !== "QUENTE" && item.faixaConversao !== "MORNO"
    )
  }
  return itens.filter((item) => item.faixaConversao === faixa)
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
