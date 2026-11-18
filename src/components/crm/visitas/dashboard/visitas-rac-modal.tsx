"use client"

import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ClienteSaude, VisitaSaudeDetalhe } from "@/lib/crm/visitas-saude"

const STATUS_VISITA_LABELS: Record<string, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
}

const TIPO_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  VIDEO: "Vídeo",
  TELEFONE: "Telefone",
}

function formatarData(valor: string | null): string {
  if (!valor) return "—"
  const data = new Date(`${valor}T12:00:00`)
  return isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR")
}

function corStatus(status: string): string {
  if (status === "REALIZADA") return "text-emerald-600 dark:text-emerald-400"
  if (status === "AGENDADA") return "text-blue-600 dark:text-blue-400"
  if (status === "CANCELADA") return "text-red-600 dark:text-red-400"
  return "text-amber-600 dark:text-amber-400"
}

function VisitaLinha({ visita }: { visita: VisitaSaudeDetalhe }) {
  return (
    <tr className="align-top">
      <td className="px-3 py-2">
        <Link
          href={`/comercial/crm/visitas/${visita.id}`}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          #{visita.id} · {formatarData(visita.dataVisita)}
        </Link>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {visita.hora ?? "—"} · {visita.criadoPorNome ?? "Sem responsável"}
        </p>
      </td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
        {TIPO_LABELS[visita.tipo] ?? visita.tipo}
      </td>
      <td className="px-3 py-2">
        <span className={`text-xs font-medium ${corStatus(visita.status)}`}>
          {STATUS_VISITA_LABELS[visita.status] ?? visita.status}
        </span>
      </td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
        {visita.relato ? "Sim" : "Não"}
      </td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
        {visita.checkInTime || visita.checkOutTime ? "Sim" : "Não"}
      </td>
    </tr>
  )
}

export function VisitasRacModal({
  cliente,
  onClose,
}: {
  cliente: ClienteSaude | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={!!cliente}
      onOpenChange={(aberto) => {
        if (!aberto) onClose()
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col overflow-hidden p-0 gap-0">
        {cliente && (
          <>
            <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {cliente.nome} — visitas R/A/C
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {cliente.visitasRealizadas} realizadas · {cliente.visitasAgendadas} agendadas ·{" "}
                {cliente.visitasCanceladas} canceladas. Clique em uma visita para abrir o cadastro.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4">
              {cliente.visitas.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhuma visita encontrada para este registro.
                </p>
              ) : (
                <table className="w-full min-w-[640px] text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900">
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th scope="col" className="px-3 py-2 font-medium">
                        Visita
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Tipo
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Ata/Relato
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Check-in/out
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cliente.visitas.map((visita) => (
                      <VisitaLinha key={visita.id} visita={visita} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
