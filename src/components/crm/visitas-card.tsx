"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Calendar } from "lucide-react"

type VisitaResumo = {
  id: number
  dataVisita?: string | Date | null
  tipo?: string | null
  status?: string | null
  relato?: string | null
  nomeAvulso?: string | null
  empresaNome?: string | null
  clienteNome?: string | null
}

function formatarData(valor?: string | Date | null) {
  if (!valor) return null
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return null
  return data.toLocaleDateString("pt-BR")
}

export function VisitasCard({ empresaId, clienteId }: { empresaId?: string; clienteId?: string }) {
  const chave = clienteId ? `cliente:${clienteId}` : `empresa:${empresaId}`
  const { data } = useQuery<VisitaResumo[]>({
    queryKey: ["crm-visitas-card", chave],
    queryFn: async () => {
      const url = clienteId
        ? `/api/crm/visitas?all=true&clienteId=${clienteId}`
        : `/api/crm/visitas?all=true&empresaId=${empresaId}`
      const res = await fetch(url)
      if (!res.ok) return []
      const dados = await res.json()
      return Array.isArray(dados) ? dados : []
    },
    enabled: !!empresaId || !!clienteId,
  })
  const visitas = data ?? []

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-50">
          <Calendar size={16} className="text-purple-500" />
          Visitas
        </h2>
        {visitas.length > 0 && <span className="text-xs text-slate-400">({visitas.length})</span>}
      </div>
      {visitas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nenhuma visita vinculada</p>
      ) : (
        <div className="space-y-2">
          {visitas.map((visita) => (
            <Link
              key={visita.id}
              href={`/comercial/crm/visitas/${visita.id}`}
              className="block p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {visita.relato || visita.tipo || visita.nomeAvulso || visita.empresaNome || visita.clienteNome || "Visita"}
                </p>
                {formatarData(visita.dataVisita) && (
                  <span className="text-[10px] shrink-0 text-slate-400">
                    {formatarData(visita.dataVisita)}
                  </span>
                )}
              </div>
              {visita.status && <p className="text-xs text-slate-500 mt-0.5">{visita.status}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
