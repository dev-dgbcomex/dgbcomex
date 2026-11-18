"use client"

export function ScoreBadge({
  rotulo,
  valor,
  onClick,
}: {
  rotulo: "Esforço" | "Engajamento"
  valor: number
  onClick?: () => void
}) {
  const tom = valor >= 70 ? "verde" : valor >= 40 ? "amarelo" : "vermelho"
  const classes = {
    verde: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    amarelo: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    vermelho: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  }[tom]
  const ariaLabel = `${rotulo}: ${valor}%${onClick ? ". Ver detalhes" : ""}`
  const classesComuns = `inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold whitespace-nowrap font-mono ${classes}`

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        title={`Ver detalhes do ${rotulo.toLowerCase()}`}
        className={`${classesComuns} outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400`}
      >
        {valor}%
      </button>
    )
  }

  return (
    <span aria-label={ariaLabel} className={classesComuns}>
      {valor}%
    </span>
  )
}
