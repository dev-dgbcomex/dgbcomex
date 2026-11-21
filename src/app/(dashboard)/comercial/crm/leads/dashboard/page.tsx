"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Users } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { ClienteSaudeModal } from "@/components/crm/visitas/dashboard/cliente-saude-modal"
import { ItensEngajamentoModal } from "@/components/crm/visitas/dashboard/itens-engajamento-modal"
import { ClienteSaudeLeadsTable } from "@/components/crm/leads/dashboard/cliente-saude-table"
import { mesclarSaudeProspeccao, type ClienteSaudeLeads } from "@/lib/crm/leads-saude"
import type { ClienteSaude as ClienteSaudeAcoes } from "@/lib/crm/acoes-prospeccao-saude"
import type { ClienteSaude as ClienteSaudeVisitas } from "@/lib/crm/visitas-saude"
import { getInfoContent } from "@/lib/info-content"

export default function LeadsDashboardPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [leadsFilter, setLeadsFilter] = useState<"todas" | "minhas">("todas")
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSaudeLeads | null>(null)
  const [itensSelecionados, setItensSelecionados] = useState<ClienteSaudeLeads | null>(null)

  const querySuffix = leadsFilter === "minhas" ? "?mine=true" : ""

  const visitasQuery = useQuery<ClienteSaudeVisitas[]>({
    queryKey: ["leads-dashboard-visitas", leadsFilter],
    queryFn: () =>
      fetch(`/api/crm/visitas/dashboard/clientes${querySuffix}`).then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar saúde de visitas")
        return response.json()
      }),
    retry: 1,
  })

  const acoesQuery = useQuery<ClienteSaudeAcoes[]>({
    queryKey: ["leads-dashboard-acoes", leadsFilter],
    queryFn: () =>
      fetch(`/api/crm/acoes-prospeccao/dashboard/clientes${querySuffix}`).then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar saúde de ações")
        return response.json()
      }),
    retry: 1,
  })

  const linhas = mesclarSaudeProspeccao(visitasQuery.data ?? [], acoesQuery.data ?? [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Dashboard de Leads{info && <InfoButton content={info} />}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Saúde da prospecção por cliente/pessoa: visitas e ações lado a lado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Filtro de leads"
            className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setLeadsFilter("todas")}
              aria-pressed={leadsFilter === "todas"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                leadsFilter === "todas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <Users size={14} aria-hidden="true" />
              Todas
            </button>
            <button
              type="button"
              onClick={() => setLeadsFilter("minhas")}
              aria-pressed={leadsFilter === "minhas"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                leadsFilter === "minhas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <Users size={14} aria-hidden="true" />
              Minhas
            </button>
          </div>
          <Link
            href="/comercial/crm/leads"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Listar Leads
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <ClienteSaudeLeadsTable
        linhas={linhas}
        isLoading={visitasQuery.isLoading || acoesQuery.isLoading}
        onSelecionar={setClienteSelecionado}
        onVerItens={setItensSelecionados}
      />

      <ClienteSaudeModal
        cliente={clienteSelecionado}
        onClose={() => setClienteSelecionado(null)}
      />
      <ItensEngajamentoModal
        cliente={itensSelecionados}
        onClose={() => setItensSelecionados(null)}
      />
    </div>
  )
}
