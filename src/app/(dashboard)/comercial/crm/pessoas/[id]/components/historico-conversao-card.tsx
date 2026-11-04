import { Archive, Building2, CalendarClock, History, User } from "lucide-react"
import Link from "next/link"
import type { Pessoa } from "../../types"

type Props = {
  pessoa: Pessoa
}

function numero(valor: number | undefined | null) {
  return (valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function HistoricoConversaoCard({ pessoa }: Props) {
  const resumo = pessoa.resumo
  const promovido = Boolean(pessoa.promovidaCliente)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
        <History size={16} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Histórico de conversão em cliente
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {promovido ? (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <Archive size={14} /> Transformada em cliente
            </p>
            <div className="mt-2 space-y-1 text-xs text-emerald-700 dark:text-emerald-400">
              {pessoa.promovidoEm && (
                <p className="flex items-center gap-1.5">
                  <CalendarClock size={13} />
                  {new Date(pessoa.promovidoEm).toLocaleString("pt-BR")}
                </p>
              )}
              {pessoa.promovidoPorNome && (
                <p className="flex items-center gap-1.5">
                  <User size={13} />
                  Por {pessoa.promovidoPorNome}
                </p>
              )}
              {pessoa.cliente && (
                <p className="flex items-center gap-1.5">
                  <Building2 size={13} />
                  Cliente{" "}
                  <Link
                    href={`/comercial/clientes/${pessoa.cliente.id}`}
                    className="underline hover:no-underline"
                  >
                    #{pessoa.cliente.id} — {pessoa.cliente.nome}
                  </Link>
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Esta pessoa ainda não foi transformada em cliente. Ao virar cliente, o histórico
            acumulado abaixo será preservado e continua acessível nos relatórios.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Oportunidades</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {resumo?.oportunidades ?? 0}
            </p>
            <p className="text-[11px] text-slate-500">{numero(resumo?.valorOportunidades)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Propostas</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {resumo?.propostas ?? 0}
            </p>
            <p className="text-[11px] text-slate-500">{numero(resumo?.valorPropostas)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Visitas</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {resumo?.visitas ?? 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
