"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { QuickCreateProposta } from "@/components/crm/quick-create-proposta"

function formatValor(v: string | number | null | undefined) {
  if (!v) return null
  const n = Number(v)
  if (isNaN(n)) return null
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

type PropostaResumo = {
  id: number
  titulo?: string
  status?: string
  valor?: string | null
}

/**
 * Card de propostas do CRM — usado na tela da pessoa (`empresaId`) e na tela
 * do cliente (`clienteId`, que inclui as propostas herdadas das pessoas que
 * viraram o cliente).
 */
export function PropostasCard({
  empresaId,
  clienteId,
  oportunidadeId,
}: {
  empresaId?: string
  clienteId?: string
  oportunidadeId?: string
}) {
  const queryClient = useQueryClient()
  const queryKey = clienteId
    ? ["crm-cliente-propostas", clienteId]
    : ["crm-pessoa-propostas", empresaId]

  const { data } = useQuery<PropostaResumo[]>({
    queryKey,
    queryFn: async () => {
      const url = clienteId
        ? `/api/crm/propostas?clienteId=${clienteId}`
        : `/api/crm/propostas?empresaId=${empresaId}`
      const res = await fetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!empresaId || !!clienteId,
  })
  const propostas = data ?? []

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Propostas</h2>
        <QuickCreateProposta
          empresaId={empresaId}
          clienteId={clienteId}
          oportunidadeId={oportunidadeId}
          onCreated={() => queryClient.invalidateQueries({ queryKey })}
        />
      </div>
      {propostas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nenhuma proposta vinculada</p>
      ) : (
        <div className="space-y-2">
          {propostas.map((prop: PropostaResumo) => (
            <Link
              key={prop.id}
              href={`/comercial/crm/propostas/${prop.id}`}
              className="block p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {prop.titulo}
                </p>
                {prop.status && (
                  <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {prop.status}
                  </span>
                )}
              </div>
              {formatValor(prop.valor) && (
                <p className="text-xs text-slate-500 mt-0.5">{formatValor(prop.valor)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
