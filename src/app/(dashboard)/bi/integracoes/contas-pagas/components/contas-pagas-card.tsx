"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FORMATAR, rotuloDocumento, type GrupoFornecedor } from "@/lib/bi/contas-pagas-detalhe"
import { gerarPdfFornecedor } from "./contas-pagas-pdf"

interface Props {
  grupo: GrupoFornecedor
  selecionado: boolean
  expandido: boolean
  totalGeral: number
  onSelecionar: (chave: string) => void
  onExpandir: (chave: string) => void
  orientacao: "portrait" | "landscape"
}

/**
 * O mesmo desenho do card de nota do faturamento: caixa com checkbox, título que
 * expande, números à direita e PDF. A diferença é o que abre: lá são os itens da
 * nota, aqui são as baixas do fornecedor.
 */
export function ContasPagasCard({
  grupo,
  selecionado,
  expandido,
  totalGeral,
  onSelecionar,
  onExpandir,
  orientacao,
}: Props) {
  const [gerando, setGerando] = useState(false)
  const idCheckbox = `sel-${grupo.chave.replace(/[^\w-]/g, "-")}`
  const participacao = totalGeral > 0 ? (grupo.valor / totalGeral) * 100 : 0

  async function baixarPdf() {
    setGerando(true)
    try {
      await gerarPdfFornecedor(grupo, orientacao)
    } finally {
      setGerando(false)
    }
  }

  return (
    <div
      className={`rounded-xl border bg-white transition-colors dark:bg-slate-900 ${
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
          onChange={() => onSelecionar(grupo.chave)}
          aria-label={`Selecionar fornecedor ${grupo.razao_social}`}
        />

        <button
          type="button"
          onClick={() => onExpandir(grupo.chave)}
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
              {grupo.razao_social}
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                {grupo.fornecedor} · {grupo.lancamentos}{" "}
                {grupo.lancamentos === 1 ? "baixa" : "baixas"} ·{" "}
                {participacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do recorte
              </span>
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
          <span title="Total pago no recorte">
            <strong className="text-slate-900 dark:text-slate-100">
              {FORMATAR.valor(grupo.valor)}
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
                <th className="px-3 py-2 text-left font-medium tracking-wider text-slate-500 uppercase">
                  Baixa
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wider text-slate-500 uppercase">
                  Documento
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wider text-slate-500 uppercase">
                  Banco
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wider text-slate-500 uppercase">
                  Departamento
                </th>
                <th className="px-3 py-2 text-right font-medium tracking-wider text-slate-500 uppercase">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {grupo.itens.map((item, idx) => (
                <tr key={`${grupo.chave}-${item.documento}-${item.parcela}-${idx}`}>
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {item.data_baixa ? FORMATAR.data(item.data_baixa) : "—"}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {rotuloDocumento(item)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {item.banco || "—"}
                    {item.cheque && (
                      <span className="block text-[10px] text-slate-400">{item.cheque}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {item.departamento || "—"}
                    {item.rateio && (
                      <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                        rateado no centro de custo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {FORMATAR.valor(item.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-900/50">
              <tr className="font-medium text-slate-900 dark:text-slate-100">
                <td className="px-3 py-2" colSpan={4}>
                  Total de {grupo.razao_social}
                </td>
                <td className="px-3 py-2 text-right">{FORMATAR.valor(grupo.valor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
