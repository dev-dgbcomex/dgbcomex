"use client"

import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  Building2,
  UserPlus,
  Target,
  Calendar,
  TrendingUp,
  Activity,
  FileText,
  MapPin,
  Users,
  Handshake,
} from "lucide-react"
import { getInfoContent } from "@/lib/info-content"
import { usePathname } from "next/navigation"
import { InfoButton } from "@/components/ui/info-button"

const CrmRelatoriosCharts = dynamic(() => import("./charts").then((m) => m.CrmRelatoriosCharts), {
  ssr: false,
})

const RELATORIOS = [
  {
    href: "/comercial/crm/relatorios/atividades",
    label: "Atividades",
    desc: "O que cada usuário fez: registros criados por dia, semana e mês",
    icon: Activity,
    cor: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
  },
  {
    href: "/comercial/crm/relatorios/pessoas",
    label: "Pessoas",
    desc: "Cadastro de pessoas do CRM por período, responsável e conversão",
    icon: Users,
    cor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
  },
  {
    href: "/comercial/crm/relatorios/oportunidades",
    label: "Oportunidades",
    desc: "Pipeline, conversão, valores e pessoa envolvida",
    icon: Target,
    cor: "text-purple-600 bg-purple-50 dark:bg-purple-950/50",
  },
  {
    href: "/comercial/crm/relatorios/propostas",
    label: "Propostas",
    desc: "Propostas enviadas, aceitas e recusadas com valores",
    icon: FileText,
    cor: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50",
  },
  {
    href: "/comercial/crm/relatorios/visitas",
    label: "Visitas",
    desc: "Visitas presenciais, por vídeo e por telefone",
    icon: MapPin,
    cor: "text-amber-600 bg-amber-50 dark:bg-amber-950/50",
  },
  {
    href: "/comercial/crm/relatorios/conversoes",
    label: "Conversões",
    desc: "Pessoas que viraram cliente, com quem promoveu e o negócio gerado",
    icon: Handshake,
    cor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
  },
  {
    href: "/comercial/crm/relatorios/clientes",
    label: "Clientes",
    desc: "Negócio de cada cliente, direto ou herdado das pessoas promovidas",
    icon: Building2,
    cor: "text-slate-600 bg-slate-100 dark:bg-slate-800",
  },
]

async function fetchRelatorios() {
  const res = await fetch("/api/crm/relatorios")
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json()
}

export default function CrmRelatoriosPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)

  const { data, isLoading } = useQuery({
    queryKey: ["crm-relatorios"],
    queryFn: fetchRelatorios,
    retry: 1,
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Relatórios CRM{info && <InfoButton content={info} />}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Análise consolidada de leads, pipeline, conversão e performance comercial
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-slate-400">Erro ao carregar dados</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <CardEstatistica
              icon={<Building2 size={18} />}
              value={data.totalEmpresas}
              label="Negócios"
              color="text-blue-600"
              bg="bg-blue-100 dark:bg-blue-950/50"
            />
            <CardEstatistica
              icon={<UserPlus size={18} />}
              value={data.totalLeads}
              label="Leads"
              color="text-emerald-600"
              bg="bg-emerald-100 dark:bg-emerald-950/50"
            />
            <CardEstatistica
              icon={<Target size={18} />}
              value={data.totalOportunidades}
              label="Oportunidades"
              color="text-purple-600"
              bg="bg-purple-100 dark:bg-purple-950/50"
            />
            <CardEstatistica
              icon={<Calendar size={18} />}
              value={data.totalVisitas}
              label="Visitas"
              color="text-amber-600"
              bg="bg-amber-100 dark:bg-amber-950/50"
            />
            <CardEstatistica
              icon={<TrendingUp size={18} />}
              value={data.totalCampanhas}
              label="Campanhas"
              color="text-cyan-600"
              bg="bg-cyan-100 dark:bg-cyan-950/50"
            />
          </div>

          <CrmRelatoriosCharts data={data} />

          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
              Relatórios detalhados
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Cada relatório tem filtros por período, cards de resumo, listagem completa e
              exportação em PDF, CSV e Markdown.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {RELATORIOS.map((relatorio) => {
                const Icon = relatorio.icon
                return (
                  <Link
                    key={relatorio.href}
                    href={relatorio.href}
                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                  >
                    <div
                      className={`rounded-lg p-2 w-fit mb-2 ${relatorio.cor} group-hover:scale-105 transition-transform`}
                    >
                      <Icon size={16} />
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {relatorio.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {relatorio.desc}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CardEstatistica({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
  bg: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg ${bg} p-2.5`}>
          <span className={color}>{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  )
}
