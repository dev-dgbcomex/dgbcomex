"use client"

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
      aria-label={`${rotulo}: ${valor}%`}
      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold whitespace-nowrap font-mono ${classes}`}
    >
      {valor}%
    </span>
  )
}
