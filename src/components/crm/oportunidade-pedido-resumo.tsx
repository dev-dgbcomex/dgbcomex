import { Receipt, ShoppingCart } from "lucide-react"
import {
  STATUS_PEDIDO_VENDA_CORES,
  STATUS_PEDIDO_VENDA_LABELS,
} from "@/lib/crm/documento-venda"

interface OportunidadePedidoResumoProps {
  temPedidoVenda?: boolean
  statusPedidoVenda?: string | null
  valorFaturado?: string | number | null
}

const valorFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function OportunidadePedidoResumo({
  temPedidoVenda,
  statusPedidoVenda,
  valorFaturado,
}: OportunidadePedidoResumoProps) {
  if (!temPedidoVenda && !statusPedidoVenda) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
        <ShoppingCart size={12} aria-hidden="true" />
        Sem pedido vinculado
      </span>
    )
  }

  const status = String(statusPedidoVenda || "ABERTO").toUpperCase()
  const rotulo = STATUS_PEDIDO_VENDA_LABELS[status] || status
  const cores = STATUS_PEDIDO_VENDA_CORES[status] || STATUS_PEDIDO_VENDA_CORES.ABERTO
  const valor = Number(valorFaturado ?? 0)
  const valorValido = Number.isFinite(valor) && valor > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cores}`}
      >
        <ShoppingCart size={12} aria-hidden="true" />
        Pedido {rotulo}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
          valorValido
            ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
        }`}
      >
        <Receipt size={12} aria-hidden="true" />
        {valorValido ? `Faturado ${valorFormatter.format(valor)}` : "Não faturado"}
      </span>
    </div>
  )
}
