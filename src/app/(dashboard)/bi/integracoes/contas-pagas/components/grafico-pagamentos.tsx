"use client"

import { FORMATAR, type MesContasPagas } from "@/lib/bi/contas-pagas-detalhe"

interface Props {
  meses: MesContasPagas[]
  mesSelecionado: string
  onSelecionar: (mes: string) => void
}

/**
 * Os 24 meses de pagamentos em barras de CSS puro.
 *
 * Sem recharts de propósito: aqui a barra **é** o botão (cada mês troca a tela),
 * e recharts não dá clique por barra. Em CSS cada mês é um `<button>` de verdade,
 * o que funciona no teclado e é testável no jsdom.
 */
export function GraficoPagamentosMensais({ meses, mesSelecionado, onSelecionar }: Props) {
  const maximo = Math.max(...meses.map((m) => m.total), 1)

  return (
    <section
      aria-label="Pagamentos por mês"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Pagamentos mês a mês
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Últimos 24 meses. Clique numa barra para trocar o mês da tela.
        </p>
      </div>

      <div className="flex h-56 items-end gap-0.5 p-3">
        {meses.map((m) => {
          const selecionado = m.mes === mesSelecionado
          const altura = m.total > 0 ? Math.max((m.total / maximo) * 100, 2) : 1
          return (
            <button
              key={m.mes}
              type="button"
              onClick={() => onSelecionar(m.mes)}
              aria-pressed={selecionado}
              aria-label={`${m.rotulo}: ${FORMATAR.valor(m.total)} em ${m.lancamentos} pagamentos`}
              title={`${m.rotulo} — ${FORMATAR.valor(m.total)}`}
              className="group flex h-full min-w-0 flex-1 cursor-pointer items-end"
            >
              <span
                className={`w-full rounded-t transition-all ${
                  selecionado
                    ? "bg-teal-700"
                    : m.total === 0
                      ? "bg-slate-200 dark:bg-slate-800"
                      : "bg-teal-500 group-hover:bg-teal-600"
                }`}
                style={{ height: `${altura}%` }}
              />
            </button>
          )
        })}
      </div>

      <div className="flex justify-between border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
        <span>{meses[0]?.rotulo}</span>
        <span>{meses[meses.length - 1]?.rotulo}</span>
      </div>
    </section>
  )
}
