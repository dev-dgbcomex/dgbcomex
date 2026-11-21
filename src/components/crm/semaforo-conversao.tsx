import { FAIXAS_CONVERSAO, type FaixaConversao } from "@/lib/crm/faixa-conversao"

const CORES: Record<FaixaConversao, { borda: string; texto: string; ponto: string }> = {
  QUENTE: {
    borda: "border-r-red-500 dark:border-r-red-400",
    texto: "text-red-700 dark:text-red-300",
    ponto: "bg-red-500 dark:bg-red-400",
  },
  MORNO: {
    borda: "border-r-amber-500 dark:border-r-amber-400",
    texto: "text-amber-700 dark:text-amber-300",
    ponto: "bg-amber-500 dark:bg-amber-400",
  },
  FRIO: {
    borda: "border-r-blue-500 dark:border-r-blue-400",
    texto: "text-blue-700 dark:text-blue-300",
    ponto: "bg-blue-500 dark:bg-blue-400",
  },
}

type SemaforoConversaoProps = {
  contagem: Record<FaixaConversao, number>
  entidade: "leads" | "clientes"
}

export function SemaforoConversao({ contagem, entidade }: SemaforoConversaoProps) {
  const sufixo = entidade === "leads" ? "leads" : "clientes"

  return (
    <section
      aria-label="Semáforo de conversão"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {FAIXAS_CONVERSAO.map(({ faixa, rotulo, descricao }) => {
        const cor = CORES[faixa]
        const total = contagem[faixa]

        return (
          <div
            key={faixa}
            aria-label={`${rotulo}: ${total} ${sufixo} — ${descricao}`}
            className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 border-r-4 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 ${cor.borda}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rotulo}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{descricao}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${cor.ponto}`} aria-hidden="true" />
              <span className={`text-2xl font-bold tabular-nums ${cor.texto}`}>{total}</span>
            </div>
          </div>
        )
      })}
    </section>
  )
}
