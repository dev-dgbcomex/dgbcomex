export function chavePedido(pedido: { empresa: string; pedido: string }): string {
  return `${pedido.empresa}|${pedido.pedido}`
}

export function ordenarPorPosicao<T>(
  itens: T[],
  chave: (item: T) => string,
  posicoes: Record<string, number> = {}
): T[] {
  return [...itens].sort((a, b) => {
    const pa = posicoes[chave(a)]
    const pb = posicoes[chave(b)]
    if (pa == null && pb == null) return 0
    if (pa == null) return 1
    if (pb == null) return -1
    return pa - pb
  })
}
