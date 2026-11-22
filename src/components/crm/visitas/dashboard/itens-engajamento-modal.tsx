"use client"

import Link from "next/link"
import { Check, Circle, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InfoButton } from "@/components/ui/info-button"
import { obterEngajamento as obterEngajamentoPadrao, type ClienteSaude } from "@/lib/crm/visitas-saude"
import { saudeProspeccaoInfo } from "@/lib/info-content/crm"
import { EngajamentoBadge } from "./engajamento-badge"

function formatarPeso(peso: number): string {
  return peso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
}

export function ItensEngajamentoModal({
  cliente,
  onClose,
  obterEngajamento = obterEngajamentoPadrao,
  conteudo = saudeProspeccaoInfo.itensEngajamento,
}: {
  cliente: ClienteSaude | null
  onClose: () => void
  obterEngajamento?: typeof obterEngajamentoPadrao
  conteudo?: typeof saudeProspeccaoInfo.itensEngajamento
}) {
  const engajamento = cliente ? obterEngajamento(cliente) : null

  return (
    <Dialog
      open={!!cliente}
      onOpenChange={(aberto) => {
        if (!aberto) onClose()
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col overflow-hidden p-0 gap-0">
        {cliente && engajamento && (
          <>
            <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
              <div className="flex items-center">
                <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {cliente.nome} — itens de engajamento
                </DialogTitle>
                <InfoButton content={conteudo} />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <EngajamentoBadge resumo={engajamento.resumo} nome={cliente.nome} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proposta e oportunidade valem 36% cada; os outros três itens dividem os 28% restantes
                (9,33% cada). Última visita: {cliente.ultimaVisita ?? "—"}
                {cliente.proximaVisita ? ` · Próxima visita: ${cliente.proximaVisita}` : ""}
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4">
              <ul className="space-y-2">
                {engajamento.itens.map((item) => (
                  <li
                    key={item.chave}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 ${item.presente ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                          aria-hidden="true"
                        >
                          {item.presente ? <Check size={16} /> : <Circle size={16} />}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {item.rotulo}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.detalhe}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`text-sm font-semibold ${
                            item.presente
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {item.presente ? `${formatarPeso(item.peso)}%` : "0%"}
                        </p>
                        <p className="text-[10px] uppercase text-slate-400">
                          {item.presente ? "Presente" : "Ausente"}
                        </p>
                      </div>
                    </div>
                    {item.registros.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                        {item.registros.map((registro) => (
                          <Link
                            key={`${registro.href}-${registro.id}`}
                            href={registro.href}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-blue-700 hover:underline dark:bg-slate-800 dark:text-blue-300"
                          >
                            {registro.rotulo}
                            <ExternalLink size={11} aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
