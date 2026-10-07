"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BiIntegracaoKpiCard } from "./bi-integracao-kpi-card"

function hojeLocal(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mes}-${dia}`
}

export interface BiIntegracaoResumo {
  id: number
  nome: string
  baseUrl: string
  tipoAuth: string
  telas?: string[]
}

export function BiIntegracaoDashboard() {
  const queryClient = useQueryClient()
  const [data, setData] = useState(hojeLocal())

  const {
    data: integracoes,
    isLoading,
    error,
  } = useQuery<BiIntegracaoResumo[]>({
    queryKey: ["bi-integracao-listar"],
    queryFn: async () => {
      const res = await fetch("/api/integracao/listar?tela=bi")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao listar integrações")
      }
      return res.json()
    },
    retry: false,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="data-kpi"
              className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
            >
              Data dos KPIs
            </label>
            <input
              id="data-kpi"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm h-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["bi-integracao-kpi"] })
            }
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar tudo
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-slate-500">Carregando integrações de BI...</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
          {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && integracoes && integracoes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma integração com a tela{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              bi
            </code>{" "}
            cadastrada.
          </p>
          <Link href="/admin/configuracoes/integracoes" className="text-sm text-indigo-600 hover:underline">
            Cadastrar integração
          </Link>
        </div>
      )}

      {!isLoading && !error && integracoes && integracoes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {integracoes.map((integracao) => (
            <BiIntegracaoKpiCard
              key={integracao.id}
              integracao={integracao}
              data={integracao.baseUrl.includes("{") ? data : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}