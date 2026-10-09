"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface FiltrosToolbar {
  dataInicio: string
  dataFim: string
  representante: string
  cliente: string
  produto: string
  nota: string
}

interface Props {
  filtros: FiltrosToolbar
  onChange: (patch: Partial<FiltrosToolbar>) => void
  busca: string
  onBuscaChange: (valor: string) => void
  onLimpar: () => void
  onAplicar: () => void
  totalNotas: number
}

export function FaturamentoToolbar({
  filtros,
  onChange,
  busca,
  onBuscaChange,
  onLimpar,
  onAplicar,
  totalNotas,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="flex flex-col gap-1">
          <Label htmlFor="fat-data-inicio">Data inicial</Label>
          <Input
            id="fat-data-inicio"
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => onChange({ dataInicio: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="fat-data-fim">Data final</Label>
          <Input
            id="fat-data-fim"
            type="date"
            value={filtros.dataFim}
            onChange={(e) => onChange({ dataFim: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="fat-representante">Representante</Label>
          <Input
            id="fat-representante"
            value={filtros.representante}
            onChange={(e) => onChange({ representante: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="fat-cliente">Cliente</Label>
          <Input
            id="fat-cliente"
            value={filtros.cliente}
            onChange={(e) => onChange({ cliente: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="fat-produto">Produto</Label>
          <Input
            id="fat-produto"
            value={filtros.produto}
            onChange={(e) => onChange({ produto: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="fat-nota">Nº nota</Label>
          <Input
            id="fat-nota"
            value={filtros.nota}
            onChange={(e) => onChange({ nota: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="fat-busca"
            aria-label="Buscar nas notas carregadas"
            placeholder="Buscar nesta página: nota, cliente, produto, representante..."
            className="pl-9"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
          />
        </div>
        <Button type="button" onClick={onAplicar} className="gap-2">
          <Search className="w-4 h-4" />
          Aplicar filtros
        </Button>
        <Button type="button" variant="ghost" onClick={onLimpar} className="gap-2">
          <X className="w-4 h-4" />
          Limpar
        </Button>
      </div>

      <p
        role="status"
        aria-label={`${totalNotas} ${totalNotas === 1 ? "nota no período" : "notas no período"}`}
        className="mt-3 text-xs text-slate-500 dark:text-slate-400"
      >
        <strong className="text-slate-700 dark:text-slate-200">{totalNotas}</strong>{" "}
        {totalNotas === 1 ? "nota nesta página" : "notas nesta página"}
      </p>
    </div>
  )
}