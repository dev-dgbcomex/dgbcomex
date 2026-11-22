"use client"

import { AlertTriangle, Loader2, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

export type OpcaoDecisao = {
  valor: string
  rotulo: string
  descricao?: string
}

interface DecisaoAutomacaoModalProps {
  open: boolean
  titulo: string
  mensagem: string
  opcoes: OpcaoDecisao[]
  loading?: boolean
  onEscolher: (valor: string) => void
  onCancel: () => void
}

export function DecisaoAutomacaoModal({
  open,
  titulo,
  mensagem,
  opcoes,
  loading,
  onEscolher,
  onCancel,
}: DecisaoAutomacaoModalProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onCancel()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={18} />
            </DialogPrimitive.Close>

            <div className="p-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} aria-hidden="true" />
              </div>
              <DialogPrimitive.Title className="mb-2 text-center text-lg font-semibold text-slate-900 dark:text-slate-50">
                {titulo}
              </DialogPrimitive.Title>
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">{mensagem}</p>

              <div className="mt-5 grid gap-3">
                {opcoes.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    disabled={loading}
                    onClick={() => onEscolher(opcao.valor)}
                    className="rounded-lg border border-slate-200 px-4 py-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-blue-950/30"
                  >
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      {opcao.rotulo}
                    </span>
                    {opcao.descricao && (
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {opcao.descricao}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {loading && (
                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Aplicando automação...
                </p>
              )}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
