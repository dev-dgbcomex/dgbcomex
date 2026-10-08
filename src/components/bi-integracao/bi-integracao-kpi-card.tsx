"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, GripVertical, Info, RefreshCw } from "lucide-react"
import { BiIntegracaoResumo } from "./bi-integracao-dashboard"
import { BiIntegracaoKpiModal } from "./bi-integracao-kpi-modal"
import { BI_KPI_METADADOS, formatarKpi } from "@/lib/bi-kpi-metadados"

function valorNoCaminho(obj: Record<string, unknown> | null | undefined, caminho: string[]) {
  let atual: unknown = obj
  for (const parte of caminho) {
    if (atual == null || typeof atual !== "object") return undefined
    atual = (atual as Record<string, unknown>)[parte]
  }
  return atual
}

function LinhaResumo({
  rotulo,
  valor,
  formato,
  destaque,
}: {
  rotulo: string
  valor: unknown
  formato: "brl" | "pct" | "qtde" | "texto"
  destaque?: boolean
}) {
  if (valor === undefined || valor === null) return null
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400">{rotulo}</span>
      <span
        className={
          destaque
            ? "text-xl font-bold text-slate-900 dark:text-slate-100 text-right"
            : "text-sm font-semibold text-slate-900 dark:text-slate-100 text-right"
        }
      >
        {formatarKpi(rotulo, valor, formato)}
      </span>
    </div>
  )
}

export function BiIntegracaoKpiCard({
  integracao,
  data,
  dragHandleProps,
  aoMover,
}: {
  integracao: BiIntegracaoResumo
  data?: string
  dragHandleProps?: Record<string, unknown>
  aoMover?: (delta: 1 | -1) => void
}) {
  const {
    data: resultado,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<any>({
    queryKey: ["bi-integracao-kpi", integracao.id, data],
    queryFn: async ({ queryKey }) => {
      const [, id] = queryKey as [string, number, string | undefined]
      const qs = new URLSearchParams()
      if (data) qs.set("data", data)
      const query = qs.toString() ? `?${qs}` : ""
      const res = await fetch(`/api/integracao/${id}/executar${query}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erro ao executar ${integracao.nome}`)
      }
      return res.json()
    },
    retry: false,
  })

  const [infoAberta, setInfoAberta] = useState(false)
  const body: Record<string, unknown> | null = resultado?.responseBody
  const meta = BI_KPI_METADADOS[integracao.nome]
  const titulo = meta?.titulo ?? integracao.nome

  return (
    <>
      <div
        onClick={() => setInfoAberta(true)}
        role="button"
        tabIndex={0}
        aria-label={`Abrir detalhes de ${titulo}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setInfoAberta(true)
          }
        }}
        className="h-full flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 card-hover cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
            title={titulo}
          >
            {titulo}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
            {integracao.baseUrl.replace(/^https?:\/\/[^/]+/, "")}
          </p>
        </div>
        <div className="flex items-start gap-1 shrink-0">
          {dragHandleProps && (
            <button
              type="button"
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Arrastar ${titulo} para reordenar`}
              title="Arrastar para reordenar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          {aoMover && (
            <div className="flex flex-col -space-y-1 mt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  aoMover(-1)
                }}
                aria-label={`Mover ${titulo} para cima`}
                title="Mover para cima"
                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  aoMover(1)
                }}
                aria-label={`Mover ${titulo} para baixo`}
                title="Mover para baixo"
                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setInfoAberta(true)
            }}
            aria-label={`Sobre ${titulo}`}
            title={`O que significa cada número de ${titulo}`}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-blue-400 text-blue-500 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
          >
            <Info size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              refetch()
            }}
            disabled={isFetching}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            aria-label={`Atualizar ${integracao.nome}`}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-1">
        {isError && (
          <p className="text-xs text-red-600 dark:text-red-400">{(error as Error).message}</p>
        )}

        {body == null && !isError && (
          <p className="text-xs text-slate-400">{isFetching ? "Consultando..." : "Sem resposta"}</p>
        )}

        {body != null && meta?.resumo && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {meta.resumo.map((item) => (
              <LinhaResumo
                key={item.rotulo}
                rotulo={item.rotulo}
                valor={valorNoCaminho(body, item.caminho)}
                formato={item.formato}
                destaque={item.destaque}
              />
            ))}
          </div>
        )}

        {body != null && !meta && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Object.entries(body).map(([chave, valor]) => (
              <LinhaResumo key={chave} rotulo={chave} valor={valor} formato="brl" />
            ))}
          </div>
        )}

        {body != null && meta && !meta.resumo && (
          <p className="text-xs break-words text-slate-500 dark:text-slate-400">
            {JSON.stringify(body)}
          </p>
        )}
      </div>

      {typeof resultado?.time === "number" && !isError && (
        <p className="mt-3 text-[10px] text-slate-400">{resultado.time} ms</p>
      )}
      </div>

      <BiIntegracaoKpiModal
        integracao={integracao}
        meta={meta}
        body={body}
        data={data}
        aberto={infoAberta}
        aoFechar={() => setInfoAberta(false)}
      />
    </>
  )
}
