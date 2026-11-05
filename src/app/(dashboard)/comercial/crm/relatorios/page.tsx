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
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"
import type { CSSProperties } from "react"

const CrmRelatoriosCharts = dynamic(() => import("./charts").then((m) => m.CrmRelatoriosCharts), {
  ssr: false,
})

const RELATORIOS = [
  {
    href: "/comercial/crm/relatorios/atividades",
    label: "Atividades",
    desc: "O que cada usuário fez: registros criados por dia, semana e mês",
    icon: Activity,
  },
  {
    href: "/comercial/crm/relatorios/pessoas",
    label: "Pessoas",
    desc: "Cadastro de pessoas do CRM por período, responsável e conversão",
    icon: Users,
  },
  {
    href: "/comercial/crm/relatorios/oportunidades",
    label: "Oportunidades",
    desc: "Pipeline, conversão, valores e pessoa envolvida",
    icon: Target,
  },
  {
    href: "/comercial/crm/relatorios/propostas",
    label: "Propostas",
    desc: "Propostas enviadas, aceitas e recusadas com valores",
    icon: FileText,
  },
  {
    href: "/comercial/crm/relatorios/visitas",
    label: "Visitas",
    desc: "Visitas presenciais, por vídeo e por telefone",
    icon: MapPin,
  },
  {
    href: "/comercial/crm/relatorios/conversoes",
    label: "Conversões",
    desc: "Pessoas que viraram cliente, com quem promoveu e o negócio gerado",
    icon: Handshake,
  },
  {
    href: "/comercial/crm/relatorios/clientes",
    label: "Clientes",
    desc: "Negócio de cada cliente, direto ou herdado das pessoas promovidas",
    icon: Building2,
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
            />
            <CardEstatistica icon={<UserPlus size={18} />} value={data.totalLeads} label="Leads" />
            <CardEstatistica
              icon={<Target size={18} />}
              value={data.totalOportunidades}
              label="Oportunidades"
            />
            <CardEstatistica
              icon={<Calendar size={18} />}
              value={data.totalVisitas}
              label="Visitas"
            />
            <CardEstatistica
              icon={<TrendingUp size={18} />}
              value={data.totalCampanhas}
              label="Campanhas"
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
                const estilo = corPorTitulo(relatorio.label)
                return (
                  <Link
                    key={relatorio.href}
                    href={relatorio.href}
                    style={
                      {
                        "--card-fundo": estilo.fundoClaro,
                        "--card-fundo-escuro": estilo.fundoEscuro,
                        "--card-borda": estilo.borda,
                        "--card-realce": estilo.cor,
                      } as CSSProperties
                    }
                    className="group rounded-xl border border-[color:var(--card-borda)] bg-white dark:bg-slate-900 bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)] p-4 hover:border-[color:var(--card-realce)] transition-colors"
                  >
                    <div
                      className="rounded-lg p-2 w-fit mb-2 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
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
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  const estilo = corPorTitulo(label)
  const Icone = iconePorTitulo(label)
  return (
    <div
      style={
        {
          "--card-fundo": estilo.fundoClaro,
          "--card-fundo-escuro": estilo.fundoEscuro,
          "--card-borda": estilo.borda,
          "--card-realce": estilo.cor,
        } as CSSProperties
      }
      className="rounded-xl border border-[color:var(--card-borda)] bg-white dark:bg-slate-900 bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)] p-4"
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-lg p-2.5"
          style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span style={{ color: estilo.cor }} aria-hidden="true">
              <Icone size={12} />
            </span>
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}
