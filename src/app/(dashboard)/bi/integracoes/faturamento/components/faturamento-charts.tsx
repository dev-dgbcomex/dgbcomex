"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartCard } from "@/components/ui/chart-card"
import { ChartTooltip } from "@/components/ui/chart-tooltip"
import { formatarMetragem, formatarPeso, formatarValor } from "./utils"
import type { GrupoFaturamento } from "./types"

const CORES = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#4d7c0f"]

interface Props {
  grupos: GrupoFaturamento[]
  faturamentoTotal: number
  totalItens: number
  totalNotas: number
  totalMetros: number
  totalPeso: number
}

interface KpiProps {
  rotulo: string
  valor: string
  detalhe?: string
}

function Kpi({ rotulo, valor, detalhe }: KpiProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {rotulo}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detalhe}</p>}
    </div>
  )
}

export function FaturamentoCharts({
  grupos,
  faturamentoTotal,
  totalItens,
  totalNotas,
  totalMetros,
  totalPeso,
}: Props) {
  const porMes = useMemo(() => {
    const mapa = new Map<string, { mes: string; faturamento: number; metros: number }>()
    for (const grupo of grupos) {
      const partes = (grupo.data_nota || "").split("-")
      if (partes.length !== 3) continue
      const rotulo = `${partes[1]}/${partes[0].slice(2)}`
      const atual = mapa.get(rotulo) ?? { mes: rotulo, faturamento: 0, metros: 0 }
      atual.faturamento += grupo.faturamento
      atual.metros += grupo.totalMetros
      mapa.set(rotulo, atual)
    }
    return [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes))
  }, [grupos])

  const topClientes = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const grupo of grupos) {
      const chave = grupo.nome_cliente || grupo.cliente || "Sem cliente"
      mapa.set(chave, (mapa.get(chave) ?? 0) + grupo.faturamento)
    }
    return [...mapa.entries()]
      .map(([nome, faturamento]) => ({ nome, faturamento }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 8)
  }, [grupos])

  const topProdutos = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const grupo of grupos) {
      for (const item of grupo.itens) {
        const valor = (item.vr_total || 0) + (item.acres_desc || 0)
        mapa.set(item.cod_produto, (mapa.get(item.cod_produto) ?? 0) + valor)
      }
    }
    return [...mapa.entries()]
      .map(([produto, faturamento]) => ({ produto: produto || "—", faturamento }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 8)
  }, [grupos])

  const representacao = useMemo(
    () => topProdutos.map((item, i) => ({ ...item, fill: CORES[i % CORES.length] })),
    [topProdutos]
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          rotulo="Faturamento"
          valor={formatarValor(faturamentoTotal)}
          detalhe={`${totalNotas} notas`}
        />
        <Kpi
          rotulo="Itens"
          valor={totalItens.toLocaleString("pt-BR")}
          detalhe={`${(totalItens / Math.max(totalNotas, 1)).toFixed(1)} itens/nota`}
        />
        <Kpi
          rotulo="Metragem"
          valor={formatarMetragem(totalMetros)}
          detalhe="m² faturados"
        />
        <Kpi rotulo="Peso" valor={formatarPeso(totalPeso)} detalhe="kg faturados" />
        <Kpi
          rotulo="Ticket médio"
          valor={formatarValor(faturamentoTotal / Math.max(totalNotas, 1))}
          detalhe="por nota"
        />
      </div>

      {grupos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Faturamento e metragem por mês (página atual)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatarValor(Number(v))} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
                <Line
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Faturamento por cliente (top 8)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatarValor(Number(v))} />
                <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
                <Bar dataKey="faturamento" name="Faturamento" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Faturamento por produto (top 8)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProdutos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="produto" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatarValor(Number(v))} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
                <Bar dataKey="faturamento" name="Faturamento" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Participação por produto">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={representacao} dataKey="faturamento" nameKey="produto" outerRadius={90}>
                  {representacao.map((entrada) => (
                    <Cell key={entrada.produto} fill={entrada.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  )
}