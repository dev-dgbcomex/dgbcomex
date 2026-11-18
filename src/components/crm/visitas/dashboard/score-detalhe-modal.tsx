"use client"

import { Check, Circle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InfoButton } from "@/components/ui/info-button"
import {
  formatarPontos,
  obterDetalheScore,
  type ClienteSaude,
  type TipoScore,
} from "@/lib/crm/visitas-saude"
import { saudeProspeccaoInfo } from "@/lib/info-content/crm"

export type SelecaoScore = {
  linha: ClienteSaude
  tipo: TipoScore
}

export function ScoreDetalheModal({
  selecao,
  onClose,
}: {
  selecao: SelecaoScore | null
  onClose: () => void
}) {
  const detalhe = selecao ? obterDetalheScore(selecao.linha, selecao.tipo) : null

  return (
    <Dialog
      open={!!selecao}
      onOpenChange={(aberto) => {
        if (!aberto) onClose()
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col overflow-hidden p-0 gap-0">
        {selecao && detalhe && (
          <>
            <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
              <div className="flex items-center">
                <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {selecao.linha.nome} — {selecao.tipo.toLowerCase()}
                </DialogTitle>
                <InfoButton
                  content={
                    selecao.tipo === "Esforço"
                      ? saudeProspeccaoInfo.esforco
                      : saudeProspeccaoInfo.engajamento
                  }
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total: {detalhe.total}% ·{" "}
                {detalhe.componentes.filter((componente) => componente.presente).length} de{" "}
                {detalhe.componentes.length} critérios presentes
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th scope="col" className="px-2 py-2 font-medium">
                      Critério
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Situação
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Pontos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detalhe.componentes.map((componente) => (
                    <tr key={componente.rotulo}>
                      <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-100">
                        {componente.rotulo}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          {componente.presente ? (
                            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle size={12} className="text-slate-400" />
                          )}
                          {componente.descricao}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-200">
                        +{formatarPontos(componente.pontos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="border-t border-slate-100 p-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
              Fórmula: soma dos pontos dos critérios presentes = {formatarPontos(detalhe.total)}%
              (limitado a 100%).
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
