"use client"

import type { ResumoConversao } from "@/lib/crm/visitas-saude"

const TOM_CLASSES: Record<ResumoConversao["tom"], string> = {
  vermelho:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800",
  amarelo:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800",
  azul: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800",
  verde:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800",
}

export function ConversaoBadge({
  resumo,
  nome,
  onClick,
  titulo = "Ver pedidos e faturamentos",
}: {
  resumo: ResumoConversao
  nome: string
  onClick?: () => void
  titulo?: string
}) {
  const classes = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${TOM_CLASSES[resumo.tom]}`
  const ariaLabel = `Conversão de ${nome}: ${resumo.percentual}%, ${resumo.rotulo}${
    onClick ? ". Ver detalhes" : ""
  }`

  const conteudo = (
    <>
      <span className="font-mono">{resumo.percentual}%</span>
      <span>{resumo.rotulo}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        title={titulo}
        className={`${classes} outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400`}
      >
        {conteudo}
      </button>
    )
  }

  return (
    <span aria-label={ariaLabel} className={classes}>
      {conteudo}
    </span>
  )
}
