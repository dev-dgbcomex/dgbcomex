"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface ChartCardProps {
  children: ReactNode
  title?: string
  className?: string
  delay?: number
  /** Controles do cabeçalho (handle de arraste, botões). Fica à direita do título. */
  actions?: ReactNode
}

export function ChartCard({
  children,
  title,
  className = "",
  delay = 0,
  actions,
}: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          obs.disconnect()
        }
      },
      { threshold: 0.01, rootMargin: "50px" }
    )
    obs.observe(el)

    return () => obs.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
className={`flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white p-4 dark:bg-slate-900 ${
        visible ? "animate-chart-in chart-hover-effect" : "opacity-0"
      } ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-2">
          {title && (
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
          )}
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * Slot padrão para gráficos que devem ocupar a altura restante do cartão. Sem ele o
 * `ResponsiveContainer` fica com a altura fixa e o card não acompanha o vizinho.
 */
export function ChartCardBody({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`min-h-0 flex-1 ${className}`}>{children}</div>
}
