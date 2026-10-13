import { FORMATAR, type DetalheCustosAdministrativosAnual, type MesCusto } from "@/lib/bi/custo-detalhe"
import { LIMITE_ALERTA } from "./grafico-custo-mensal"

interface Props {
  detalhe: DetalheCustosAdministrativosAnual
  mesSelecionado: string
  onSelecionar: (mes: string) => void
}

/**
 * Os 12 meses lado a lado, do maior custo para o menor.
 *
 * É a tabela que responde "por que a média é R$ 825 mil?": mostra que um mês sozinho
 * pode pesar 28% do total. Clicar numa linha filtra a lista de lançamentos por aquele mês.
 */
export function TabelaMeses({ detalhe, mesSelecionado, onSelecionar }: Props) {
  const { meses, administrativo } = detalhe
  const ordenados = [...meses].sort((a, b) => b.administrativo - a.administrativo)

  return (
    <section
      aria-label="Meses do período"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Os 12 meses, do maior para o menor
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Clique num mês para filtrar os lançamentos
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase">
                Mês
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                Custo administrativo
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                % do período
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                Faturamento
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                % do faturamento
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                Lançamentos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {ordenados.map((mes: MesCusto) => {
              const parte = administrativo.total > 0 ? mes.administrativo / administrativo.total : 0
              const alerta = mes.porcentagem !== null && mes.porcentagem > LIMITE_ALERTA
              const selecionado = mes.mes === mesSelecionado
              return (
                <tr
                  key={mes.mes}
                  onClick={() => onSelecionar(mes.mes)}
                  aria-selected={selecionado}
                  className={`cursor-pointer transition-colors ${
                    selecionado
                      ? "bg-teal-50 dark:bg-teal-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  }`}
                >
                  <td className="px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                    {mes.rotulo}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                    {FORMATAR.valor(mes.administrativo)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {FORMATAR.porcentagem(parte)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {FORMATAR.valor(mes.faturamento)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right text-xs font-medium whitespace-nowrap ${
                      alerta ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {mes.porcentagem === null ? "—" : FORMATAR.porcentagem(mes.porcentagem)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {FORMATAR.numero(mes.lancamentos)}
                  </td>
                </tr>
              )
            })}
            <tr className="bg-slate-50 font-semibold dark:bg-slate-900/50">
              <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
                Total / média
              </td>
              <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                {FORMATAR.valor(administrativo.total)}
              </td>
              <td className="px-3 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
                {FORMATAR.porcentagem(1)}
              </td>
              <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                {FORMATAR.valor(detalhe.faturamento.total)}
              </td>
              <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                {detalhe.faturamento.porcentagem === null
                  ? "—"
                  : FORMATAR.porcentagem(detalhe.faturamento.porcentagem)}
              </td>
              <td className="px-3 py-2 text-right text-xs text-slate-600 dark:text-slate-300">
                {FORMATAR.numero(administrativo.lancamentos)}
              </td>
            </tr>
            <tr className="text-[11px] text-slate-500 dark:text-slate-400">
              <td className="px-3 py-1.5 italic">média mensal</td>
              <td className="px-3 py-1.5 text-right italic whitespace-nowrap">
                {FORMATAR.valor(administrativo.media)}
              </td>
              <td className="px-3 py-1.5" />
              <td className="px-3 py-1.5 text-right italic whitespace-nowrap">
                {FORMATAR.valor(detalhe.faturamento.media)}
              </td>
              <td className="px-3 py-1.5" />
              <td className="px-3 py-1.5 text-right italic">
                {FORMATAR.numero(Math.round(administrativo.lancamentos / Math.max(detalhe.janela.meses, 1)))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
