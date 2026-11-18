"use client"

import { classificarAlerta } from "@/lib/crm/visitas-saude"

export function ScoreBadge({
  rotulo,
  valor,
}: {
  rotulo: "Esforço" | "Engajamento"
  valor: number
}) {
  const tom = valor >= 70 ? "verde" : valor >= 40 ? "amarelo" : "vermelho"
  const classes = {
    verde: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    amarelo: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    vermelho: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  }[tom]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${classes}`}
    >
      <span>{rotulo}</span>
      <span className="font-mono">{valor}/100</span>
    </span>
  )
}

export function DiferencaBadge({ valor }: { valor: number }) {
  const alerta = classificarAlerta(valor)
  const classes = {
    vermelho: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    amarelo: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    verde: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  }[alerta.tom]

  const sinal = valor > 0 ? "+" : ""

  return (
    <span
      className={`inline-flex flex-col items-start rounded-lg px-2 py-1 text-[11px] font-medium leading-tight ${classes}`}
    >
      <span className="font-mono font-semibold">
        {sinal}
        {valor}
      </span>
      <span className="whitespace-nowrap">{alerta.rotulo}</span>
    </span>
  )
}
