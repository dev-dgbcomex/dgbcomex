"use client"

import type { CSSProperties, ReactNode } from "react"
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"

export type CardRelatorio = {
  label: string
  value: string | number
  icon?: ReactNode
  dica?: string
}

/**
 * Cards de indicador dos relatórios do CRM.
 *
 * A cor de fundo/borda e o ícone ao lado do título saem do próprio rótulo do
 * card (tema Dracula): o mesmo indicador tem sempre a mesma cara.
 */
export function CardsRelatorio({ cards }: { cards: CardRelatorio[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => {
        const estilo = corPorTitulo(card.label)
        const Icone = iconePorTitulo(card.label)
        return (
          <div
            key={card.label}
            style={
              {
                "--card-fundo": estilo.fundoClaro,
                "--card-fundo-escuro": estilo.fundoEscuro,
                "--card-borda": estilo.borda,
                "--card-realce": estilo.cor,
              } as CSSProperties
            }
            className="rounded-xl border border-[color:var(--card-borda)] bg-white dark:bg-slate-900 bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)] p-4"
          >
            <div className="flex items-center gap-3">
              {card.icon && (
                <div
                  className="rounded-lg p-2.5 shrink-0"
                  style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
                >
                  {card.icon}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50 truncate">
                  {card.value}
                </p>
                <p
                  className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1"
                  title={card.dica}
                >
                  <span
                    className="inline-flex items-center justify-center shrink-0"
                    style={{ color: estilo.cor }}
                    aria-hidden="true"
                  >
                    <Icone size={12} />
                  </span>
                  {card.label}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
