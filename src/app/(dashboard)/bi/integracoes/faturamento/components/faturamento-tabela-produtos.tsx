"use client"

import { formatarMetragem, formatarPeso, formatarValor, tabelaPorProduto } from "./utils"
import type { GrupoFaturamento } from "./types"

interface Props {
  grupos: GrupoFaturamento[]
  limite?: number
}

/**
 * Tabela de produtos com barra proporcional ao faturamento. Fica logo abaixo dos
 * gráficos e responde "quanto rendeu cada produto, a que preço e em que volume".
 */
export function FaturamentoTabelaProdutos({ grupos, limite = 50 }: Props) {
  const linhas = tabelaPorProduto(grupos, limite)
  if (linhas.length === 0) return null

  const maiorFaturamento = Math.max(...linhas.map((linha) => linha.faturamento), 1)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Produtos faturados
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {linhas.length === 1 ? "1 produto" : `${linhas.length} produtos`} no período · barra
          proporcional ao faturamento
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Produto
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Itens
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Metragem
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Peso
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Vlr. unitário médio
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Vlr. médio (R$/m)
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Faturamento
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {linhas.map((linha) => {
              const largura = (linha.faturamento / maiorFaturamento) * 100
              return (
                <tr key={linha.produto} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {linha.produto}
                    </span>
                    {linha.descricao && (
                      <span
                        className="block text-xs text-slate-500 dark:text-slate-400"
                        title={linha.descricao}
                      >
                        {linha.descricao}
                      </span>
                    )}
                    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-[width] duration-500"
                        style={{ width: `${Math.max(largura, 1)}%` }}
                      />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {linha.itens.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatarMetragem(linha.metros)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatarPeso(linha.peso)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatarValor(linha.unitarioMedio)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {linha.medioPorMetro > 0 ? formatarValor(linha.medioPorMetro) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                    {formatarValor(linha.faturamento)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}