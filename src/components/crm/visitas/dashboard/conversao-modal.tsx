"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { calcularConversao, type ClienteSaude, type ResumoConversao } from "@/lib/crm/visitas-saude"
import { ConversaoBadge } from "./conversao-badge"

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ConversaoModal({
  cliente,
  onClose,
  calcularConversao: calcular = calcularConversao,
}: {
  cliente: ClienteSaude | null
  onClose: () => void
  calcularConversao?: (cliente: ClienteSaude) => ResumoConversao
}) {
  const conversao = cliente ? calcular(cliente) : null
  const total = conversao?.total ?? cliente?.totalVisitas ?? 0
  const rotuloTotal = conversao?.rotuloTotal ?? (total === 1 ? "visita" : "visitas")

  return (
    <Dialog
      open={!!cliente}
      onOpenChange={(aberto) => {
        if (!aberto) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {cliente && conversao && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {cliente.nome} — conversão
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {total} {rotuloTotal} no ano corrente
              </p>
              <div className="pt-1">
                <ConversaoBadge resumo={conversao} nome={cliente.nome} />
              </div>
            </DialogHeader>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Pedidos de venda
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {cliente.pedidosVenda}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatarMoeda(cliente.valorPedidosVenda)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Faturamentos
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {cliente.faturamentos}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatarMoeda(cliente.valorFaturamento)}
                </p>
              </div>
            </div>

            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              Cálculo: ({cliente.pedidosVenda} pedidos + {cliente.faturamentos} faturamentos) ÷{" "}
              {total} {rotuloTotal} = {conversao.percentual}%. Percentual limitado a 100%.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
