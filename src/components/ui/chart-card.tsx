"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"

interface ChartCardProps {
  children: ReactNode
  title?: string
  className?: string
  delay?: number
  /** Controles do cabeçalho (handle de arraste, botões). Fica à direita do título. */
  actions?: ReactNode
  /** Pinta o card com a cor do tema Dracula derivada do título. */
  dracula?: boolean
}

export function ChartCard({
  children,
  title,
  className = "",
  delay = 0,
  actions,
  dracula = false,
}: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const estilo = dracula && title ? corPorTitulo(title) : null
  const Icone = dracula && title ? iconePorTitulo(title) : null

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
      style={
        estilo
          ? ({
              "--card-fundo": estilo.fundoClaro,
              "--card-fundo-escuro": estilo.fundoEscuro,
              "--card-borda": estilo.borda,
              "--card-realce": estilo.cor,
            } as CSSProperties)
          : undefined
      }
      className={`flex flex-col rounded-xl border dark:bg-slate-900 p-4 ${
        estilo
          ? "border-[color:var(--card-borda)] bg-white bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)]"
          : "border-slate-200 dark:border-slate-800 bg-white"
      } ${visible ? "animate-chart-in chart-hover-effect" : "opacity-0"} ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-2">
          {title && (
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {Icone && estilo && (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0"
                  style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
                  aria-hidden="true"
                >
                  <Icone size={12} />
                </span>
              )}
              {title}
            </h3>
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
