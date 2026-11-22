"use client"

import { useDroppable } from "@dnd-kit/core"
import type { CSSProperties, ReactNode } from "react"

import type { EstiloCardDracula } from "@/lib/dracula"

function variaveisColuna(estilo: EstiloCardDracula): CSSProperties {
  return {
    "--coluna-cor": estilo.cor,
    "--coluna-borda": estilo.borda,
    "--coluna-fundo-claro": estilo.fundoClaro,
    "--coluna-fundo-escuro": estilo.fundoEscuro,
    "--coluna-fundo-icone": estilo.fundoIcone,
  } as CSSProperties
}

function classesColuna(estilo: EstiloCardDracula | undefined, larguraCompleta: boolean): string {
  const base = estilo
    ? [
        "border-[color:var(--coluna-borda)]",
        "bg-white bg-[image:var(--coluna-fundo-claro)]",
        "dark:bg-slate-900 dark:bg-[image:var(--coluna-fundo-escuro)]",
      ]
    : [
        "border-slate-200 bg-slate-100",
        larguraCompleta ? "dark:border-slate-700 dark:bg-slate-900/70" : "dark:border-slate-800 dark:bg-slate-900",
      ]

  return base.join(" ")
}

export function DroppableColumn({
  id,
  children,
  rotulo,
  cor,
  count,
  larguraCompleta = false,
  estilo,
  info,
}: {
  id: string
  children: ReactNode
  rotulo: string
  cor: string | null
  count: number
  larguraCompleta?: boolean
  estilo?: EstiloCardDracula
  info?: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const corDestaque = estilo?.cor ?? cor ?? "#94a3b8"

  return (
    <div
      ref={setNodeRef}
      style={estilo ? variaveisColuna(estilo) : undefined}
      className={`flex h-full min-w-0 flex-col rounded-xl border transition-colors ${classesColuna(
        estilo,
        larguraCompleta
      )} ${larguraCompleta ? "w-full" : "w-72 shrink-0"} ${
        isOver ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : ""
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
        <div
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: corDestaque }}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
            {rotulo}
          </span>
          {info}
        </div>
        <span
          className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-400 dark:bg-slate-800"
          style={
            estilo
              ? { backgroundColor: "var(--coluna-fundo-icone)", color: "var(--coluna-cor)" }
              : undefined
          }
        >
          {count}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">{children}</div>
    </div>
  )
}

export function KanbanSkeleton({
  larguraCompleta = false,
  estilos,
}: {
  larguraCompleta?: boolean
  estilos?: EstiloCardDracula[]
}) {
  return (
    <div
      className={
        larguraCompleta
          ? "grid w-full grid-cols-1 gap-4 lg:grid-cols-3"
          : "flex h-[calc(100vh-280px)] gap-4"
      }
    >
      {[0, 1, 2].map((i) => {
        const estilo = estilos?.[i]
        return (
          <div
            key={i}
            style={estilo ? variaveisColuna(estilo) : undefined}
            className={`min-w-0 animate-pulse rounded-xl border ${classesColuna(
              estilo,
              larguraCompleta
            )} ${larguraCompleta ? "w-full" : "w-72 shrink-0"}`}
          >
            <div className="flex h-10 items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: estilo?.cor ?? "#94a3b8" }}
                aria-hidden="true"
              />
            </div>
            <div className="space-y-3 p-3">
              <div className="h-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
