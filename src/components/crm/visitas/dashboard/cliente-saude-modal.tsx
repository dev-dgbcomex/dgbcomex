"use client"

import Link from "next/link"
import { CalendarDays, FileText, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { labelStatusOportunidade, type ClienteSaude } from "@/lib/crm/visitas-saude"
import { DiferencaBadge, ScoreBadge } from "./score-badges"

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

function formatarDataHora(valor: string | null): string {
  if (!valor) return "—"
  const data = new Date(valor)
  return isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR")
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ClienteSaudeModal({
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
      <DialogContent className="sm:max-w-5xl max-h-[88vh] flex flex-col overflow-hidden p-0 gap-0">
        {cliente && (
          <>
            <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {cliente.nome} — detalhamento das visitas
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <ScoreBadge rotulo="Esforço" valor={cliente.scoreEsforco} />
                <ScoreBadge rotulo="Engajamento" valor={cliente.scoreEngajamento} />
                <DiferencaBadge valor={cliente.diferenca} />
              </div>
              <div className="grid gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-3">
                <p>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Visitas:</span>{" "}
                  {cliente.totalVisitas} no ano corrente
                </p>
                <p>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Oportunidade:</span>{" "}
                  {formatarMoeda(cliente.valorEstimadoTotal)} · {cliente.probabilidadeMedia}%
                </p>
                <p>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Faturamento:</span>{" "}
                  {formatarMoeda(cliente.valorFaturamento)}
                </p>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4">
              {cliente.visitas.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhuma visita encontrada para este registro.
                </p>
              ) : (
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {[
                        "Visita",
                        "Tipo / Status",
                        "Oportunidade",
                        "Proposta",
                        "Contato",
                        "Relato / Ata",
                      ].map((coluna) => (
                        <th
                          key={coluna}
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400"
                        >
                          {coluna}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cliente.visitas.map((visita) => (
                      <tr key={visita.id} className="align-top">
                        <td className="px-3 py-3">
                          <Link
                            href={`/comercial/crm/visitas/${visita.id}`}
                            onClick={onClose}
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            #{visita.id} · {formatarData(visita.dataVisita)}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {visita.hora ?? "—"} · {visita.criadoPorNome ?? "Sem responsável"}
                          </p>
                          {visita.enderecoTexto && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-slate-400">
                              <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                              {visita.enderecoTexto}
                            </p>
                          )}
                          {visita.checkInTime && (
                            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                              Check-in: {formatarDataHora(visita.checkInTime)}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {TIPO_LABELS[visita.tipo] ?? visita.tipo}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {STATUS_VISITA_LABELS[visita.status] ?? visita.status}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {visita.oportunidadeId ? (
                            <Link
                              href={`/comercial/crm/oportunidades/${visita.oportunidadeId}`}
                              onClick={onClose}
                              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {visita.oportunidadeTitulo ?? `Oportunidade #${visita.oportunidadeId}`}
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          {visita.oportunidadeStatus && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {labelStatusOportunidade(visita.oportunidadeStatus)} ·{" "}
                              {formatarMoeda(visita.oportunidadeValor)} · {visita.oportunidadeProbabilidade}%
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {visita.propostaId ? (
                            <>
                              <Link
                                href={`/comercial/crm/propostas/${visita.propostaId}`}
                                onClick={onClose}
                                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {visita.propostaTitulo ?? `Proposta #${visita.propostaId}`}
                              </Link>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {visita.propostaStatus ?? "—"}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">
                          {visita.contatoNome ?? "—"}
                        </td>
                        <td className="max-w-xs px-3 py-3">
                          {visita.relato ? (
                            <p className="flex items-start gap-1 text-xs text-slate-600 dark:text-slate-300">
                              <FileText size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                              <span className="line-clamp-4">{visita.relato}</span>
                            </p>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <CalendarDays size={12} aria-hidden="true" />
                              Sem ata/relato
                            </span>
                          )}
                        </td>
                      </tr>
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
