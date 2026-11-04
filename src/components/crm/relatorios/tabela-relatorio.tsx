"use client"

import type { ReactNode } from "react"

/**
 * Tabela de relatório com rolagem horizontal (nunca estoura a tela) e
 * altura máxima com cabeçalho fixo (nunca estoura a tela na vertical).
 */
export function TabelaRelatorio({
  colunas,
  children,
  alturaMaxima = "max-h-[60vh]",
  vazio = "Nenhum registro encontrado no período",
  total,
}: {
  colunas: string[]
  children: ReactNode
  alturaMaxima?: string
  vazio?: string
  total?: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className={`overflow-auto ${alturaMaxima}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950/90 backdrop-blur">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {colunas.map((coluna) => (
                <th
                  key={coluna}
                  className="text-left px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                >
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {total !== undefined && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          {total} registro(s) listado(s)
        </div>
      )}
      {total === 0 && (
        <div className="px-3 py-10 text-center text-sm text-slate-400">{vazio}</div>
      )}
    </div>
  )
}

export function LinhaRelatorio({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {children}
    </tr>
  )
}

export function CelulaRelatorio({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>
  )
}
