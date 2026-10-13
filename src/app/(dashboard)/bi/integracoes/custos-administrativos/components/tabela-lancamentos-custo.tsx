import {
  FORMATAR,
  filtrarLancamentos,
  type LancamentoCusto,
} from "@/lib/bi/custo-detalhe"

interface Props {
  itens: LancamentoCusto[]
  busca: string
  /** Filtro de mês (`YYYY-MM`); usado pela tela anual. Vazio = todos. */
  mes?: string
  rotuloTotal?: string
}

/**
 * Lista linha a linha o que compõe o custo. É a tabela "burra" do faturamento: sem
 * agrupamento, sem drill-down, só os lançamentos com o valor que a API devolveu.
 */
export function TabelaLancamentosCusto({ itens, busca, mes, rotuloTotal }: Props) {
  const visiveis = filtrarLancamentos(itens, busca, mes)

  return (
    <section
      aria-label="Lançamentos"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lançamentos</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {FORMATAR.numero(visiveis.length)} de {FORMATAR.numero(itens.length)} lançamentos
          {rotuloTotal && ` — ${rotuloTotal}`}
        </p>
      </div>
      <div className="max-h-[32rem] overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
            <tr>
              {["Baixa", "Emissão", "Documento", "Fornecedor", "Despesa", "Departamento"].map(
                (titulo) => (
                  <th
                    key={titulo}
                    className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase"
                  >
                    {titulo}
                  </th>
                )
              )}
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visiveis.map((item, indice) => (
              <tr key={`${item.documento}-${indice}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {FORMATAR.data(item.data_baixa)}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {FORMATAR.data(item.data_emissao)}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                  {item.documento || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="block max-w-[220px] truncate text-slate-900 dark:text-slate-100">
                    {item.razao_social || "—"}
                  </span>
                  {item.fornecedor && (
                    <span className="text-[10px] text-slate-400">{item.fornecedor}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="block max-w-[200px] truncate text-slate-700 dark:text-slate-300">
                    {item.despesa || "—"}
                  </span>
                  {item.despesa_2 && (
                    <span className="block max-w-[200px] truncate text-[10px] text-slate-400">
                      {item.despesa_2}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                  <span className="block max-w-[180px] truncate" title={item.departamento_nome}>
                    {item.departamento_nome || "—"}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.departamento}</span>
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                  {FORMATAR.valor(item.valor)}
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-500">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}