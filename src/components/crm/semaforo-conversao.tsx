import type { CSSProperties } from "react"
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"
import { FAIXAS_CONVERSAO, type FaixaConversao } from "@/lib/crm/faixa-conversao"

type SemaforoConversaoProps = {
  contagem: Record<FaixaConversao, number>
  entidade: "leads" | "clientes"
}

export function SemaforoConversao({ contagem, entidade }: SemaforoConversaoProps) {
  const rotuloEntidade = entidade === "leads" ? "Leads" : "Clientes"

  return (
    <section aria-label="Semáforo de conversão" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {FAIXAS_CONVERSAO.map(({ faixa, rotulo, descricao }) => {
        const estilo = corPorTitulo(rotulo)
        const Icone = iconePorTitulo(rotulo)
        const total = contagem[faixa]

        return (
          <div
            key={faixa}
            aria-label={`${rotulo}: ${total} ${entidade} — ${descricao}`}
            style={
              {
                "--card-fundo": estilo.fundoClaro,
                "--card-fundo-escuro": estilo.fundoEscuro,
                "--card-borda": estilo.borda,
                "--card-realce": estilo.cor,
              } as CSSProperties
            }
            className="h-full flex flex-col rounded-xl border border-[color:var(--card-borda)] bg-white dark:bg-slate-900 bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)] p-4 card-hover"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5"
                  title={rotulo}
                >
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0"
                    style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
                    aria-hidden="true"
                  >
                    <Icone size={13} />
                  </span>
                  <span className="truncate">{rotulo}</span>
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={descricao}>
                  {descricao}
                </p>
              </div>
            </div>

            <div className="mt-3 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-baseline justify-between gap-3 py-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">{rotuloEntidade}</span>
                <span className="text-xl font-bold tabular-nums text-right text-slate-900 dark:text-slate-100">
                  {total}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
