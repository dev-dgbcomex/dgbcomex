"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Info, RefreshCw } from "lucide-react"
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
}: {
  integracao: BiIntegracaoResumo
  data?: string
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
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 card-hover">
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
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setInfoAberta(true)}
            aria-label={`Sobre ${titulo}`}
            title={`O que significa cada número de ${titulo}`}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-blue-400 text-blue-500 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
          >
            <Info size={13} />
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            aria-label={`Atualizar ${integracao.nome}`}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1">
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

      <BiIntegracaoKpiModal
        integracao={integracao}
        meta={meta}
        body={body}
        aberto={infoAberta}
        aoFechar={() => setInfoAberta(false)}
      />
    </div>
  )
}
