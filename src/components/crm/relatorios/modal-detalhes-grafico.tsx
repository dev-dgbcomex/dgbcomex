"use client"

import { X } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { corPorTitulo } from "@/lib/dracula"
import type { CSSProperties } from "react"

export type ColunaGrafico = {
  chave: string
  label: string
}

export type ModalDetalhesGraficoProps = {
  aberto: boolean
  setAberto: (aberto: boolean) => void
  titulo: string
  colunas: ColunaGrafico[]
  dados: Record<string, string | number>[]
  totalLabel?: string
  formatarValor?: (valor: string | number, chave: string) => string
}

export function ModalDetalhesGrafico({
  aberto,
  setAberto,
  titulo,
  colunas,
  dados,
  totalLabel = "Total",
  formatarValor,
}: ModalDetalhesGraficoProps) {
  const estilo = corPorTitulo(titulo)

  const totalPorColuna = (chave: string) =>
    dados.reduce((s, row) => s + Number(row[chave] || 0), 0)

  const renderValor = (valor: string | number, chave: string) =>
    formatarValor ? formatarValor(valor, chave) : valor

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={setAberto}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        />
        <DialogPrimitive.Popup
          className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div
            className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-3"
            style={
              {
                "--card-borda": estilo.borda,
              } as CSSProperties
            }
          >
            <DialogPrimitive.Title
              className="text-base font-semibold text-slate-900 dark:text-slate-50"
            >
              {titulo}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setAberto(false)}
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>

          <div className="p-4 overflow-x-auto max-h-[60vh] overflow-y-auto">
            {dados.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Nenhum dado disponível
              </p>
            ) : (
              <table className="w-full min-w-[560px] text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950/90 backdrop-blur">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    {colunas.map((c) => (
                      <th
                        key={c.chave}
                        className="text-left px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      {colunas.map((c) => (
                        <td key={c.chave} className="px-3 py-2 text-slate-700 dark:text-slate-200">
                          {renderValor(row[c.chave], c.chave)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-800/50">
                    {colunas.map((c, idx) => (
                      <td
                        key={"total-" + idx}
                        className="px-3 py-2 text-slate-700 dark:text-slate-200"
                      >
                        {idx === 0 ? totalLabel : renderValor(totalPorColuna(c.chave), c.chave)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => setAberto(false)}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            >
              Fechar
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
