"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { QuickCreateVisitante } from "@/components/crm/quick-create-visitante"

type VisitanteResumo = {
  id: number
  nome?: string
  cargo?: string
  celular?: string
  empresaNome?: string
  empresaRazaoSocial?: string
  empresaNomeFantasia?: string
}

export function VisitantesCard({ empresaId }: { empresaId: string }) {
  const queryClient = useQueryClient()
  const { data } = useQuery<VisitanteResumo[]>({
    queryKey: ["crm-lead-visitantes", empresaId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/visitantes?empresaId=${empresaId}`)
      if (!res.ok) return []
      return res.json()
    },
  })
  const visitantes = data ?? []

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Visitantes</h2>
        <QuickCreateVisitante
          empresaId={empresaId}
          onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ["crm-lead-visitantes", empresaId] })
          }
        />
      </div>
      {visitantes.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nenhum visitante vinculado</p>
      ) : (
        <div className="space-y-2">
          {visitantes.map((visitante: VisitanteResumo) => (
            <Link
              key={visitante.id}
              href={`/comercial/crm/visitantes/${visitante.id}`}
              className="block p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{visitante.nome}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {visitante.empresaNomeFantasia ||
                  visitante.empresaRazaoSocial ||
                  visitante.empresaNome ||
                  [visitante.cargo, visitante.celular].filter(Boolean).join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
