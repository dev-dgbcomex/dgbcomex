"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FiltroCombo, type OpcaoFiltro } from "@/components/ui/filtro-combo"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FORMATAR,
  type FiltrosContasPagas,
  type MesContasPagas,
} from "@/lib/bi/contas-pagas-detalhe"

export interface OpcoesDoRecorte {
  fornecedor: OpcaoFiltro[]
  banco: OpcaoFiltro[]
  empresa: OpcaoFiltro[]
  departamento: OpcaoFiltro[]
}

interface Props {
  filtros: FiltrosContasPagas
  onChange: (patch: Partial<FiltrosContasPagas>) => void
  busca: string
  onBuscaChange: (valor: string) => void
  onLimpar: () => void
  onAplicar: () => void
  totalBaixas: number
  totalFiltro: number
  periodo: { periodo: string; recorte: boolean } | null
  /** Opções vindas das baixas já carregadas — não de outra consulta. */
  opcoes: OpcoesDoRecorte
  /**
   * Os meses que caem entre a data inicial e a final. É o seletor "Mês", que fica
   * fora dos filtros: ele não recorta o período, escolhe qual mês do período olhar.
   * `""` é "Todos".
   */
  meses: MesContasPagas[]
  mesSelecionado: string
  onSelecionarMes: (mes: string) => void
}

/**
 * Mesmo formato do toolbar do faturamento: os filtros que mudam o volume ficam nos
 * campos e só entram com "Aplicar filtros"; a busca é local e imediata, porque
 * filtrar ~130 linhas na tela não precisa de ida e volta ao ERP.
 */
export function ContasPagasToolbar({
  filtros,
  onChange,
  busca,
  onBuscaChange,
  onLimpar,
  onAplicar,
  totalBaixas,
  totalFiltro,
  periodo,
  opcoes,
  meses,
  mesSelecionado,
  onSelecionarMes,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {/*
        O seletor de mês fica antes dos filtros, separado por uma borda: ele não é um
        filtro de data como os outros — escolhe qual mês *dentro* do período olhar, e
        "Todos" mostra o período inteiro. Misturado com data inicial/final, confundia.
      */}
      <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex w-full flex-col gap-1 sm:w-72">
          <Label htmlFor="cp-mes">Mês</Label>
          <select
            id="cp-mes"
            className="h-9 w-full rounded-lg border border-input bg-white px-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
            value={mesSelecionado}
            onChange={(e) => onSelecionarMes(e.target.value)}
          >
            <option value="">Todos os meses do período</option>
            {meses.map((mes) => (
              <option key={mes.mes} value={mes.mes}>
                {mes.rotulo} — {FORMATAR.valor(mes.total)}
                {mes.lancamentos === 0 ? " (sem baixa)" : ""}
              </option>
            ))}
          </select>
        </div>
        <p className="pb-2 text-xs text-slate-500 dark:text-slate-400">
          {mesSelecionado
            ? "Os cards de grupo e os gráficos mostram o mês escolhido."
            : "Mostrando o período inteiro das datas abaixo."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
        <FiltroCombo
          id="cp-fornecedor"
          rotulo="Fornecedor"
          opcoes={opcoes.fornecedor}
          valor={filtros.fornecedor}
          onChange={(valor) => onChange({ fornecedor: valor })}
          vazio="Todos"
          formatarValor={FORMATAR.valor}
        />
        <FiltroCombo
          id="cp-banco"
          rotulo="Banco"
          opcoes={opcoes.banco}
          valor={filtros.banco}
          onChange={(valor) => onChange({ banco: valor })}
          vazio="Todos"
          formatarValor={FORMATAR.valor}
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FiltroCombo
          id="cp-empresa"
          rotulo="Empresa"
          opcoes={opcoes.empresa}
          valor={filtros.empresa}
          onChange={(valor) => onChange({ empresa: valor })}
          vazio="Todas"
          formatarValor={FORMATAR.valor}
        />
        <FiltroCombo
          id="cp-departamento"
          rotulo="Departamento"
          opcoes={opcoes.departamento}
          valor={filtros.departamento}
          onChange={(valor) => onChange({ departamento: valor })}
          vazio="Todos"
          formatarValor={FORMATAR.valor}
        />
        <div className="flex flex-col gap-1 md:col-span-2">
          <Label htmlFor="cp-busca">Buscar nas baixas</Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="cp-busca"
              className="pl-9"
              placeholder="documento, banco, D000002234..."
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onAplicar} className="gap-2">
          <Search className="h-4 w-4" />
          Aplicar filtros
        </Button>
        <Button type="button" variant="ghost" onClick={onLimpar} className="gap-2">
          <X className="h-4 w-4" />
          Limpar
        </Button>
        <p
          role="status"
          aria-label={`${totalFiltro} de ${totalBaixas} baixas no filtro`}
          className="ml-auto text-xs text-slate-500 dark:text-slate-400"
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
    </div>
  )
}
