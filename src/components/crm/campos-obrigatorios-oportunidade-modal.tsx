"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

export type CamposObrigatoriosOportunidadeModalProps = {
  open: boolean
  titulo?: string
  mensagem?: string
  statusDestino?: string | null
  oportunidadeId?: number | null
  oportunidadeTitulo?: string | null
  valorAtual?: string | number | null
  probabilidadeAtual?: string | number | null
  loading?: boolean
  onConfirm: (valorEstimado: number, probabilidade: number) => void
  onCancel: () => void
}

export function CamposObrigatoriosOportunidadeModal({
  open,
  titulo = "Preencha os campos obrigatórios",
  mensagem,
  statusDestino,
  oportunidadeId,
  oportunidadeTitulo,
  valorAtual,
  probabilidadeAtual,
  loading,
  onConfirm,
  onCancel,
}: CamposObrigatoriosOportunidadeModalProps) {
  const [valorEstimado, setValorEstimado] = useState(valorAtual != null ? String(valorAtual) : "")
  const [probabilidade, setProbabilidade] = useState(
    probabilidadeAtual != null ? String(probabilidadeAtual) : ""
  )
  const [erroValor, setErroValor] = useState(false)
  const [erroProbabilidade, setErroProbabilidade] = useState(false)

  function validarCampos(): boolean {
    let valido = true
    const v = Number(valorEstimado)
    const p = Number(probabilidade)

    if (!Number.isFinite(v) || v <= 1) {
      setErroValor(true)
      valido = false
    } else {
      setErroValor(false)
    }

    if (!Number.isFinite(p) || p <= 1) {
      setErroProbabilidade(true)
      valido = false
    } else {
      setErroProbabilidade(false)
    }

    return valido
  }

  function handleConfirm() {
    if (loading || !validarCampos()) return
    onConfirm(Number(valorEstimado), Number(probabilidade))
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onCancel()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50" onClick={onCancel} />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={18} />
            </DialogPrimitive.Close>

            <div className="p-6">
              <DialogPrimitive.Title className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {titulo}
              </DialogPrimitive.Title>
              {mensagem && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{mensagem}</p>
              )}
              {statusDestino && oportunidadeTitulo && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Oportunidade #{oportunidadeId} — {oportunidadeTitulo} será movida para {statusDestino}.
                </p>
              )}
              <form onSubmit={(e) => {
                e.preventDefault()
                handleConfirm()
              }} className="space-y-3">
                <div>
                  <label
                    htmlFor="campos-obrigatorios-valor"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Valor Estimado (R$) *
                  </label>
                  <input
                    id="campos-obrigatorios-valor"
                    type="number"
                    step="0.01"
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    aria-invalid={erroValor}
                    aria-describedby={erroValor ? "erro-valor" : undefined}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      erroValor ? "border-red-600 focus:ring-red-600" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                    placeholder="0,00"
                    autoFocus
                  />
                  {erroValor && (
                    <p id="erro-valor" className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Informe um valor maior que 1
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="campos-obrigatorios-probabilidade"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Probabilidade (%) *
                  </label>
                  <input
                    id="campos-obrigatorios-probabilidade"
                    type="number"
                    min="0"
                    max="100"
                    value={probabilidade}
                    onChange={(e) => setProbabilidade(e.target.value)}
                    aria-invalid={erroProbabilidade}
                    aria-describedby={erroProbabilidade ? "erro-probabilidade" : undefined}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      erroProbabilidade ? "border-red-600 focus:ring-red-600" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                    placeholder="0"
                  />
                  {erroProbabilidade && (
                    <p id="erro-probabilidade" className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Informe uma probabilidade maior que 1
                    </p>
                  )}
                </div>
                {loading && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Salvando...</p>
                )}
                <div className="flex gap-2 justify-end mt-4">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || erroValor || erroProbabilidade}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
