"use client"

import { useState } from "react"
import { Info, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

export interface ColunaDados {
  titulo: string
  /** Alinha à direita: valores em dinheiro e contagens. */
  numero?: boolean
}

export interface LinhaDados {
  rotulo: string
  detalhe?: string
  valor: number
  ocorrencias: number
  /** Participação no total do recorte, em %. */
  percentual: number
}

interface Props {
  titulo: string
  subtitulo: string
  colunas: ColunaDados[]
  linhas: LinhaDados[]
  total: number
  totalOcorrencias: number
  formatarValor: (valor: number) => string
  vazio: string
}

/**
 * O "i" do card de gráfico: o mesmo conteúdo que o gráfico mostra, sem o corte do
 * top 8. Serve para os dois casos em que o gráfico não dá conta — o grupo que ficou
 * de fora do top 8, e quem quer a lista para conferir linha a linha em vez de ler a
 * barra.
 */
export function DadosDoGrafico({
  titulo,
  subtitulo,
  colunas,
  linhas,
  total,
  totalOcorrencias,
  formatarValor,
  vazio,
}: Props) {
  const [aberto, setAberto] = useState(false)

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={setAberto}>
      <DialogPrimitive.Trigger
        aria-label={`Dados de ${titulo}`}
        title={`Dados de ${titulo}`}
        className="cursor-pointer rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <Info className="h-4 w-4" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-teal-600" />
                <div>
                  <DialogPrimitive.Title className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {titulo}
                  </DialogPrimitive.Title>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label="Fechar dados"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>

            <div className="overflow-auto p-5">
              {linhas.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">{vazio}</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead>
                    <tr>
                      {colunas.map((coluna) => (
                        <th
                          key={coluna.titulo}
                          scope="col"
                          className={`px-3 py-2 text-xs font-medium tracking-wider text-slate-500 uppercase ${
                            coluna.numero ? "text-right" : "text-left"
                          }`}
                        >
                          {coluna.titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {linhas.map((linha) => (
                      <tr key={linha.rotulo}>
                        <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">
                          {linha.rotulo}
                          {linha.detalhe && (
                            <span className="block text-[10px] text-slate-400">
                              {linha.detalhe}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-600 dark:text-slate-300">
                          {linha.ocorrencias.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-slate-900 dark:text-slate-100">
                          {formatarValor(linha.valor)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-600 dark:text-slate-300">
                          {linha.percentual.toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                          })}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/50">
                    <tr className="font-medium text-slate-900 dark:text-slate-100">
                      <td className="px-3 py-2">Total do recorte</td>
                      <td className="px-3 py-2 text-right">
                        {totalOcorrencias.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-right">{formatarValor(total)}</td>
                      <td className="px-3 py-2 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
