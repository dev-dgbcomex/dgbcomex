"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatarData, formatarMetragem, formatarPeso, formatarValor } from "./utils"
import { gerarPdfGrupo } from "./faturamento-pdf"
import type { GrupoFaturamento, OrientacaoPdf } from "./types"

interface Props {
  grupo: GrupoFaturamento
  selecionado: boolean
  expandido: boolean
  onSelecionar: (chaveNf: string) => void
  onExpandir: (chaveNf: string) => void
  orientacao: OrientacaoPdf
}

export function FaturamentoCard({
  grupo,
  selecionado,
  expandido,
  onSelecionar,
  onExpandir,
  orientacao,
}: Props) {
  const [gerando, setGerando] = useState(false)
  const idCheckbox = `sel-${grupo.chave_nf.replace(/[^\w-]/g, "-")}`

  async function baixarPdf() {
    setGerando(true)
    try {
      await gerarPdfGrupo(grupo, orientacao)
    } finally {
      setGerando(false)
    }
  }

  return (
    <div
      className={`rounded-xl border bg-white dark:bg-slate-900 transition-colors ${
        selecionado
          ? "border-teal-500 ring-1 ring-teal-500/40"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 p-3">
        <input
          id={idCheckbox}
          type="checkbox"
          className="h-4 w-4 accent-teal-600"
          checked={selecionado}
          onChange={() => onSelecionar(grupo.chave_nf)}
          aria-label={`Selecionar nota ${grupo.empresa}-${grupo.nr_nota}`}
        />

        <button
          type="button"
          onClick={() => onExpandir(grupo.chave_nf)}
          aria-expanded={expandido}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {expandido ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {grupo.empresa}-{grupo.nr_nota}
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                {formatarData(grupo.data_nota)} · {grupo.totalItens} itens
              </span>
            </span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
              {grupo.cliente} {grupo.nome_cliente ? `— ${grupo.nome_cliente}` : ""}
              {grupo.representante ? ` · Rep. ${grupo.representante}` : ""}
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
          <span title="Metragem">
            <strong>{formatarMetragem(grupo.totalMetros)}</strong> m
          </span>
          <span title="Peso">
            <strong>{formatarPeso(grupo.totalPeso)}</strong> kg
          </span>
          <span title="Valor total da nota">
            <strong className="text-slate-900 dark:text-slate-100">
              {formatarValor(grupo.faturamento)}
            </strong>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={gerando}
            onClick={baixarPdf}
          >
            <FileText className="h-4 w-4" />
            {gerando ? "Gerando..." : "PDF"}
          </Button>
        </div>
      </div>

      {expandido && (
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wider">Pedido/Item</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wider">Romaneio</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase tracking-wider">Metros</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase tracking-wider">Vlr. unit.</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase tracking-wider">Vlr. total</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase tracking-wider">Acres/Desc</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase tracking-wider">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {grupo.itens.map((item, idx) => (
                <tr key={`${grupo.chave_nf}-${item.pedido}-${item.item}-${idx}`}>
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {item.pedido}/{item.item}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {item.cod_produto}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {item.romaneio}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-right text-slate-600 dark:text-slate-300">
                    {formatarMetragem(item.metros)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-right text-slate-600 dark:text-slate-300">
                    {formatarValor(item.vr_unitario)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-right text-slate-600 dark:text-slate-300">
                    {formatarValor(item.vr_total)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-right text-slate-600 dark:text-slate-300">
                    {formatarValor(item.acres_desc)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-right text-slate-600 dark:text-slate-300">
                    {formatarPeso(item.peso)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-900/50">
              <tr className="font-medium text-slate-900 dark:text-slate-100">
                <td className="px-3 py-2" colSpan={3}>
                  Total da nota
                </td>
                <td className="px-3 py-2 text-right">{formatarMetragem(grupo.totalMetros)}</td>
                <td />
                <td className="px-3 py-2 text-right">{formatarValor(grupo.totalVrTotal)}</td>
                <td className="px-3 py-2 text-right">{formatarValor(grupo.totalAcresDesc)}</td>
                <td className="px-3 py-2 text-right">{formatarPeso(grupo.totalPeso)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}