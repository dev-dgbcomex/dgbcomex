import { FORMATAR, type GrupoPorChave } from "@/lib/bi/custo-detalhe"

interface Props {
  grupos: GrupoPorChave[]
  chave: "departamento_nome" | "despesa" | "razao_social"
  titulo: string
  descricao: string
  rotuloColuna: string
  /** Total do mês, para a coluna de participação. */
  total: number
}

/**
 * Tabela agrupada com barra proporcional — o mesmo desenho da tabela de produtos do
 * faturamento: o maior valor ocupa 100% da barra, então dá para comparar de relance.
 */
export function TabelaGruposCusto({
  grupos,
  chave,
  titulo,
  descricao,
  rotuloColuna,
  total,
}: Props) {
  const maior = Math.max(...grupos.map((g) => g.valor), 1)
  const nomeDe = (grupo: GrupoPorChave) => grupo[chave] || "—"

  if (grupos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Nenhum lançamento neste mês.
      </div>
    )
  }

  return (
    <section
      aria-label={titulo}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{descricao}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                {rotuloColuna}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                Lançamentos
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                % do total
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {grupos.map((grupo) => {
              const nome = nomeDe(grupo)
              const parte = (grupo.valor / maior) * 100
              const participacao = total > 0 ? grupo.valor / total : 0
              return (
                <tr key={nome} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-3 py-2">
                    <span
                      className="block max-w-[320px] truncate font-medium text-slate-900 dark:text-slate-100"
                      title={nome}
                    >
                      {nome}
                    </span>
                    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-[width] duration-500"
                        style={{ width: `${Math.max(parte, 1)}%` }}
                      />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {FORMATAR.numero(grupo.lancamentos)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {FORMATAR.porcentagem(participacao)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                    {FORMATAR.valor(grupo.valor)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}