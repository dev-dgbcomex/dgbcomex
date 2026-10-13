"use client"

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartTooltip } from "@/components/ui/chart-tooltip"
import { FORMATAR, type MesCusto } from "@/lib/bi/custo-detalhe"

interface Props {
  meses: MesCusto[]
  /** Mês em foco vindo do filtro; a coluna correspondente ganha destaque. */
  mesSelecionado: string
}

/** Acima disto o custo do mês come mais de metade do faturamento: merece alerta. */
export const LIMITE_ALERTA = 0.5

/**
 * Custo administrativo mês a mês contra o faturamento do mesmo mês.
 *
 * A % não cabe no eixo do custo (escala diferente), então a linha vai no eixo da
 * direita: a leitura que interessa aqui é "o mês consumiu mais do que a empresa
 * vendeu?", e o card do BI esconde isso atrás de uma média de 12 meses.
 */
export function GraficoCustoMensal({ meses, mesSelecionado }: Props) {
  const dados = meses.map((m) => {
    const p = m.porcentagem
    return {
      ...m,
      porcentagemNumero: p === null ? null : p * 100,
      alerta: p !== null && p > LIMITE_ALERTA,
    }
  })

  const alertados = dados.filter((d) => d.alerta)

  return (
    <section
      aria-label="Custo administrativo por mês"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Custo administrativo mês a mês
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Barra: custo administrativo. Linha: quanto isso representa do faturamento do mesmo mês.
        </p>
      </div>

      {alertados.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Atenção:</strong> {alertados.map((d) => d.rotulo).join(", ")}{" "}
          {alertados.length === 1 ? "passou" : "passaram"} de{" "}
          {FORMATAR.porcentagem(LIMITE_ALERTA)} do faturamento. A média de 12 meses do card carrega
          esse peso — leia a série, não só o número.
        </div>
      )}

      <div className="h-80 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              className="dark:stroke-slate-800"
            />
            <XAxis
              dataKey="rotulo"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={54}
            />
            <YAxis
              yAxisId="valor"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)} mil`}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${Math.round(v)}%`}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v, nome) =>
                    nome === "% do faturamento"
                      ? `${(v as number).toFixed(1)}%`
                      : FORMATAR.valor(v as number)
                  }
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="valor"
              dataKey="administrativo"
              name="Administrativo"
              radius={[4, 4, 0, 0]}
            >
              {dados.map((d) => (
                <Cell
                  key={d.mes}
                  fill={d.alerta ? "#dc2626" : d.mes === mesSelecionado ? "#0f766e" : "#14b8a6"}
                  fillOpacity={mesSelecionado && d.mes !== mesSelecionado ? 0.45 : 1}
                />
              ))}
            </Bar>
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="porcentagemNumero"
              name="% do faturamento"
              stroke="#b45309"
              strokeWidth={2}
              dot={{ r: 2.5 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
