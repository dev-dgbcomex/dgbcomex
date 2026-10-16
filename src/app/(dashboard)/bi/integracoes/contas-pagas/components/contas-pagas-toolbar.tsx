"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FORMATAR, type FiltrosContasPagas } from "@/lib/bi/contas-pagas-detalhe"

interface Props {
  filtros: FiltrosContasPagas
  onChange: (patch: Partial<FiltrosContasPagas>) => void
  busca: string
  onBuscaChange: (valor: string) => void
  onLimpar: () => void
  onAplicar: () => void
  totalBaixas: number
  /** Período efetivamente aplicado (pode diferir do que está nos campos). */
  periodo: { periodo: string; recorte: boolean } | null
  totalFiltro: number
}

/**
 * Mesmo formato do toolbar do faturamento: os filtros que vão para a API ficam nos
 * campos e só entram com "Aplicar filtros"; a busca é local e imediata, porque
 *filtrar 130 linhas na tela não precisa de ida e volta ao ERP.
 */
export function ContasPagasToolbar({
  filtros,
  onChange,
  busca,
  onBuscaChange,
  onLimpar,
  onAplicar,
  totalBaixas,
  periodo,
  totalFiltro,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-data-inicio">Data inicial</Label>
          <Input
            id="cp-data-inicio"
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => onChange({ dataInicio: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-data-fim">Data final</Label>
          <Input
            id="cp-data-fim"
            type="date"
            value={filtros.dataFim}
            onChange={(e) => onChange({ dataFim: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-fornecedor">Fornecedor</Label>
          <Input
            id="cp-fornecedor"
            placeholder="nome ou código"
            value={filtros.fornecedor}
            onChange={(e) => onChange({ fornecedor: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-banco">Banco</Label>
          <Input
            id="cp-banco"
            placeholder="banco ou código"
            value={filtros.banco}
            onChange={(e) => onChange({ banco: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-empresa">Empresa</Label>
          <Input
            id="cp-empresa"
            placeholder="ex.: 13"
            value={filtros.empresa}
            onChange={(e) => onChange({ empresa: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cp-departamento">Departamento</Label>
          <Input
            id="cp-departamento"
            placeholder="ex.: IMPORTACAO"
            value={filtros.departamento}
            onChange={(e) => onChange({ departamento: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="cp-busca"
            aria-label="Buscar nas baixas carregadas"
            placeholder="Buscar nesta página: fornecedor, documento, banco, departamento..."
            className="pl-9"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
          />
        </div>
        <Button type="button" onClick={onAplicar} className="gap-2">
          <Search className="h-4 w-4" />
          Aplicar filtros
        </Button>
        <Button type="button" variant="ghost" onClick={onLimpar} className="gap-2">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>

      <p
        role="status"
        aria-label={`${totalFiltro} de ${totalBaixas} baixas no filtro`}
        className="mt-3 text-xs text-slate-500 dark:text-slate-400"
      >
        <strong className="text-slate-700 dark:text-slate-200">
          {FORMATAR.numero(totalFiltro)}
        </strong>{" "}
        {totalFiltro === 1 ? "baixa no filtro" : "baixas no filtro"}
        {totalFiltro !== totalBaixas && (
          <span className="text-slate-400"> de {FORMATAR.numero(totalBaixas)} carregadas</span>
        )}
        {periodo && (
          <span className="text-slate-400">
            {" "}
            · {periodo.periodo}
            {periodo.recorte ? " (recorte aplicado)" : ""}
          </span>
        )}
      </p>
    </div>
  )
}
