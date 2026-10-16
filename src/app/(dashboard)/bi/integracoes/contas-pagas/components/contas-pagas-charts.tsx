"use client"

import { ChartCard, ChartCardBody } from "@/components/ui/chart-card"
import { FORMATAR, type GrupoPorChave, type MesContasPagas } from "@/lib/bi/contas-pagas-detalhe"

interface Props {
  meses: MesContasPagas[]
  mesSelecionado: string
  onSelecionarMes: (mes: string) => void
  porFornecedor: GrupoPorChave[]
  porBanco: GrupoPorChave[]
  porEmpresa: GrupoPorChave[]
  porDepartamento: GrupoPorChave[]
  total: number
}

const TOP = 8
const ALTURA = "min-h-[240px]"

/**
 * Barras horizontais em CSS, não recharts. Aqui a barra não é clicável (só o mês
 * é), e a lista precisa ser lida por leitor de tela com rótulo e valor: cada linha
 * é texto de verdade, o que o `<Bar>` do recharts não dá.
 */
function BarrasHorizontais({
  grupos,
  chave,
  rotuloVazio,
}: {
  grupos: GrupoPorChave[]
  chave: string
  rotuloVazio: string
}) {
  const visiveis = grupos.slice(0, TOP)
  const maior = Math.max(...visiveis.map((g) => Number(g.valor)), 1)

  if (visiveis.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">{rotuloVazio}</p>
  }

  return (
    <ul className="space-y-2.5">
      {visiveis.map((grupo) => {
        const nome = String(grupo[chave] || "—")
        const valor = Number(grupo.valor)
        const largura = Math.max((valor / maior) * 100, 2)
        return (
          <li key={`${chave}-${nome}`}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-slate-600 dark:text-slate-300" title={nome}>
                {nome}
              </span>
              <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">
                {FORMATAR.valor(valor)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-600"
                style={{ width: `${largura}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {FORMATAR.numero(Number(grupo.lancamentos))}{" "}
              {Number(grupo.lancamentos) === 1 ? "baixa" : "baixas"}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Os mesmos cards de gráfico do faturamento, com a reshape de contas pagas: o mês a
 * mês é clicável (a barra é o botão, para trocar o mês), e banco/empresa/departamento
 * são só leitura. O gráfico de fornecedor também entra aqui — a lista de cards
 * abaixo repete os números em forma de linha, e o gráfico mostra quem pesa.
 */
export function ContasPagasCharts({
  meses,
  mesSelecionado,
  onSelecionarMes,
  porFornecedor,
  porBanco,
  porEmpresa,
  porDepartamento,
  total,
}: Props) {
  const maximo = Math.max(...meses.map((m) => m.total), 1)
  const semClasse = total > 0 && porDepartamento.length <= 1

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Pagamentos mês a mês" className={ALTURA}>
        <ChartCardBody>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Últimos 24 meses.{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Clique em um mês para ver os detalhes.
            </span>
          </p>
          <div className="flex h-48 items-end gap-0.5">
            {meses.map((m) => {
              const selecionado = m.mes === mesSelecionado
              const altura = m.total > 0 ? Math.max((m.total / maximo) * 100, 2) : 1
              return (
                <button
                  key={m.mes}
                  type="button"
                  onClick={() => onSelecionarMes(m.mes)}
                  aria-pressed={selecionado}
                  aria-label={`${m.rotulo}: ${FORMATAR.valor(m.total)} em ${m.lancamentos} pagamentos`}
                  title={`${m.rotulo} — ${FORMATAR.valor(m.total)}`}
                  className="group flex h-full min-w-0 flex-1 cursor-pointer items-end"
                >
                  <span
                    className={`w-full rounded-t transition-all ${
                      selecionado
                        ? "bg-teal-700"
                        : m.total === 0
                          ? "bg-slate-200 dark:bg-slate-800"
                          : "bg-teal-500 group-hover:bg-teal-600"
                    }`}
                    style={{ height: `${altura}%` }}
                  />
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>{meses[0]?.rotulo}</span>
            <span>{meses[meses.length - 1]?.rotulo}</span>
          </div>
        </ChartCardBody>
      </ChartCard>

      <ChartCard title="Por fornecedor (top 8)" className={ALTURA}>
        <ChartCardBody>
          <BarrasHorizontais grupos={porFornecedor} chave="razao_social" rotuloVazio="Sem baixas no recorte." />
        </ChartCardBody>
      </ChartCard>

      <ChartCard title="Por banco — de onde saiu o dinheiro" className={ALTURA}>
        <ChartCardBody>
          <BarrasHorizontais grupos={porBanco} chave="banco" rotuloVazio="Sem baixas no recorte." />
        </ChartCardBody>
      </ChartCard>

      <ChartCard title="Por empresa — qual empresa pagou" className={ALTURA}>
        <ChartCardBody>
          <BarrasHorizontais grupos={porEmpresa} chave="empresa" rotuloVazio="Sem baixas no recorte." />
        </ChartCardBody>
      </ChartCard>

      <ChartCard
        title="Por departamento — para onde foi"
        className={`${ALTURA} lg:col-span-2`}
      >
        <ChartCardBody>
          {semClasse ? (
            <p className="py-6 text-center text-sm text-slate-500">
              As baixas deste recorte não têm departamento classificado no centro de custo.
            </p>
          ) : (
            <BarrasHorizontais
              grupos={porDepartamento}
              chave="departamento"
              rotuloVazio="Sem baixas no recorte."
            />
          )}
        </ChartCardBody>
      </ChartCard>
    </div>
  )
}
