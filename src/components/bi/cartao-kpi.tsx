"use client"

import type { CSSProperties, ReactNode } from "react"
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"

/**
 * Card de indicador das telas de custos administrativos (mensal e anual).
 *
 * A cor e o ícone saem do título do card (tema Dracula): o mesmo indicador tem
 * sempre a mesma cara, e o card fica identificável de longe.
 */
export function CartaoKpi({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao?: string
  children: ReactNode
}) {
  const estilo = corPorTitulo(titulo)
  const Icone = iconePorTitulo(titulo)

  return (
    <div
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
      <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded shrink-0"
          style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
          aria-hidden="true"
        >
          <Icone size={10} />
        </span>
        {titulo}
      </p>
      {descricao && <p className="mt-0.5 text-[10px] text-slate-400">{descricao}</p>}
      <div className="mt-1">{children}</div>
    </div>
  )
}
