"use client"

import { CalendarRange, Filter, RotateCcw } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export type OpcaoRelatorio = { value: string; label: string }

export type FiltrosRelatorioProps = {
  periodo: string
  onPeriodoChange: (periodo: string) => void
  de: string
  onDeChange: (valor: string) => void
  ate: string
  onAteChange: (valor: string) => void
  usuarios?: { id: number; nome: string }[]
  usuario?: string
  onUsuarioChange?: (valor: string) => void
  status?: string
  onStatusChange?: (valor: string) => void
  statusOpcoes?: OpcaoRelatorio[]
  tipo?: string
  onTipoChange?: (valor: string) => void
  tipoOpcoes?: OpcaoRelatorio[]
  segmentos?: OpcaoRelatorio[]
  segmento?: string
  onSegmentoChange?: (valor: string) => void
  onLimpar?: () => void
}

const PERIODOS = [
  { value: "dia", label: "Hoje" },
  { value: "semana", label: "7 dias" },
  { value: "mes", label: "Mês" },
  { value: "periodo", label: "Período" },
]

export function FiltrosRelatorio(props: FiltrosRelatorioProps) {
  const {
    periodo,
    onPeriodoChange,
    de,
    onDeChange,
    ate,
    onAteChange,
    usuarios = [],
    usuario = "",
    onUsuarioChange,
    status = "",
    onStatusChange,
    statusOpcoes = [],
    tipo = "",
    onTipoChange,
    tipoOpcoes = [],
    segmentos = [],
    segmento = "",
    onSegmentoChange,
    onLimpar,
  } = props

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Filter size={15} className="text-slate-400" />
          Filtros
        </div>
        {onLimpar && (
          <Button variant="ghost" size="sm" onClick={onLimpar} className="gap-1 text-xs h-8">
            <RotateCcw size={13} />
            Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((item) => (
          <button
            key={item.value}
            onClick={() => onPeriodoChange(item.value)}
            aria-pressed={periodo === item.value}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              periodo === item.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {periodo === "periodo" && (
          <>
            <div className="space-y-1">
              <Label htmlFor="filtro-de" className="text-xs">
                De
              </Label>
              <input
                id="filtro-de"
                type="date"
                value={de}
                max={ate || undefined}
                onChange={(e) => onDeChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-ate" className="text-xs">
                Até
              </Label>
              <input
                id="filtro-ate"
                type="date"
                value={ate}
                min={de || undefined}
                onChange={(e) => onAteChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        {onUsuarioChange && (
          <div className="space-y-1">
            <Label htmlFor="filtro-usuario" className="text-xs">
              Usuário
            </Label>
            <select
              id="filtro-usuario"
              value={usuario}
              onChange={(e) => onUsuarioChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {onStatusChange && statusOpcoes.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="filtro-status" className="text-xs">
              Status
            </Label>
            <select
              id="filtro-status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {statusOpcoes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {onTipoChange && tipoOpcoes.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="filtro-tipo" className="text-xs">
              Tipo
            </Label>
            <select
              id="filtro-tipo"
              value={tipo}
              onChange={(e) => onTipoChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {tipoOpcoes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {onSegmentoChange && segmentos.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="filtro-segmento" className="text-xs">
              Segmento
            </Label>
            <select
              id="filtro-segmento"
              value={segmento}
              onChange={(e) => onSegmentoChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {segmentos.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <CalendarRange size={13} />
        Os filtros valem para os cards, a tabela e as exportações (PDF, CSV e MD).
      </p>
    </div>
  )
}
