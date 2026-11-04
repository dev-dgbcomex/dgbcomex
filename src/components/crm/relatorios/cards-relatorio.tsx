"use client"

import type { ReactNode } from "react"

export type CardRelatorio = {
  label: string
  value: string | number
  icon?: ReactNode
  cor?: string
  fundo?: string
  dica?: string
}

export function CardsRelatorio({ cards }: { cards: CardRelatorio[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
        >
          <div className="flex items-center gap-3">
            {card.icon && (
              <div className={`rounded-lg p-2.5 shrink-0 ${card.fundo || "bg-slate-100"}`}>
                <span className={card.cor || "text-slate-600"}>{card.icon}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50 truncate">
                {card.value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={card.dica}>
                {card.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
