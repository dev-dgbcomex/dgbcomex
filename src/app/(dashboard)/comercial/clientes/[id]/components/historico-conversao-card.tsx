"use client"

import { Archive, CalendarClock, History, Link2, User } from "lucide-react"
import Link from "next/link"
import type { HistoricoPromocao } from "@/lib/crm/historico-promocao"

type Props = {
  historico: HistoricoPromocao | null
  carregando?: boolean
}

function numero(valor: number | undefined | null) {
  return (valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function HistoricoConversaoCard({ historico, carregando }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
        <History size={16} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Histórico de conversão em cliente
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {carregando ? (
          <p className="text-sm text-slate-500">Carregando o histórico...</p>
        ) : !historico ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este cliente não veio de uma pessoa do CRM (cadastro manual ou importação).
          </p>
        ) : (
          <>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <Archive size={14} /> Transformada em cliente
              </p>
              <div className="mt-2 space-y-1 text-xs text-emerald-700 dark:text-emerald-400">
                <p className="flex items-center gap-1.5">
                  <Link2 size={13} />
                  Veio da pessoa{" "}
                  <Link
                    href={`/comercial/crm/pessoas/${historico.pessoaId}`}
                    className="underline hover:no-underline"
                  >
                    {historico.nomePessoa}
                  </Link>
                </p>
                {historico.virouClienteEm && (
                  <p className="flex items-center gap-1.5">
                    <CalendarClock size={13} />
                    {new Date(historico.virouClienteEm).toLocaleString("pt-BR")}
                  </p>
                )}
                {historico.porUsuario && (
                  <p className="flex items-center gap-1.5">
                    <User size={13} />
                    Por {historico.porUsuario}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Oportunidades</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {historico.oportunidades}
                </p>
                <p className="text-[11px] text-slate-500">{numero(historico.valorOportunidades)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Propostas</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {historico.propostas}
                </p>
                <p className="text-[11px] text-slate-500">{numero(historico.valorPropostas)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Visitas</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {historico.visitas}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
