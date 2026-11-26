export type PedidoBackfill = {
  id: number
  status: string | null
  totalPedido: number | string | null
  oportunidadeId?: number | null
  numero?: string | null
}

export type FaturamentoBackfill = {
  id: number
  pedidoVendaId: number
  status: string | null
  valorTotal: number | string | null
}

export type PlanoBackfillStatusPedido = {
  pedidoVendaId: number
  statusAtual: string | null
  statusNovo: "FATURADO" | "PARCIAL"
  totalPedido: number
  totalFaturado: number
  faturamentoIds: number[]
}

const STATUS_IGNORADOS = new Set(["CANCELADO", "CANCELADA"])

function numero(valor: number | string | null | undefined): number {
  const convertido = typeof valor === "number" ? valor : Number(valor ?? 0)
  return Number.isFinite(convertido) ? convertido : 0
}

export function planejarBackfillStatusPedidos(
  pedidos: PedidoBackfill[],
  faturamentos: FaturamentoBackfill[]
): PlanoBackfillStatusPedido[] {
  const porPedido = new Map<number, FaturamentoBackfill[]>()

  for (const faturamento of faturamentos) {
    const status = String(faturamento.status ?? "").toUpperCase()
    if (!faturamento.pedidoVendaId || STATUS_IGNORADOS.has(status)) continue
    const lista = porPedido.get(faturamento.pedidoVendaId) ?? []
    lista.push(faturamento)
    porPedido.set(faturamento.pedidoVendaId, lista)
  }

  const planos: PlanoBackfillStatusPedido[] = []

  for (const pedido of pedidos) {
    const statusAtual = String(pedido.status ?? "").toUpperCase()
    if (STATUS_IGNORADOS.has(statusAtual)) continue
    if (statusAtual && statusAtual !== "ABERTO") continue

    const faturamentosPedido = porPedido.get(pedido.id) ?? []
    if (faturamentosPedido.length === 0) continue

    const totalFaturado = faturamentosPedido.reduce(
      (total, faturamento) => total + numero(faturamento.valorTotal),
      0
    )
    if (totalFaturado <= 0) continue

    const totalPedido = numero(pedido.totalPedido)
    const statusNovo = totalFaturado + 0.01 >= totalPedido ? "FATURADO" : "PARCIAL"

    planos.push({
      pedidoVendaId: pedido.id,
      statusAtual: pedido.status,
      statusNovo,
      totalPedido,
      totalFaturado,
      faturamentoIds: faturamentosPedido.map((faturamento) => faturamento.id),
    })
  }

  return planos
}
