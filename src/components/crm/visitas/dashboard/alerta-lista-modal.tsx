"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ClienteSaude } from "@/lib/crm/visitas-saude"
import { ScoreBadge } from "./score-badges"

export function AlertaListaModal({
  aberto,
  titulo,
  descricao,
  linhas,
  onClose,
}: {
  aberto: boolean
  titulo: string
  descricao: string
  linhas: ClienteSaude[]
  onClose: () => void
}) {
  return (
    <Dialog
      open={aberto}
      onOpenChange={(proximo) => {
        if (!proximo) onClose()
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {titulo}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {descricao} · {linhas.length} {linhas.length === 1 ? "registro" : "registros"}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          {linhas.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum cliente/pessoa neste grupo com os filtros atuais.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th scope="col" className="px-2 py-2 font-medium">
                    Nome
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Esforço
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Engajamento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {linhas.map((linha) => (
                  <tr key={`${linha.tipo}-${linha.id}`}>
                    <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-100">
                      {linha.nome}
                    </td>
                    <td className="px-2 py-2 text-slate-500 capitalize dark:text-slate-400">
                      {linha.tipo}
                    </td>
                    <td className="px-2 py-2">
                      <ScoreBadge rotulo="Esforço" valor={linha.scoreEsforco} />
                    </td>
                    <td className="px-2 py-2">
                      <ScoreBadge rotulo="Engajamento" valor={linha.scoreEngajamento} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
