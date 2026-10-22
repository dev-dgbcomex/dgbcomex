"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Boxes, Loader2, Package, Ruler, Warehouse, ArrowLeftRight, MapPin } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"

interface Resumo {
  enderecos: number
  enderecosAtivos: number
  pecasAlocadas: number
  metrosAlocados: number
  pecasEmAberto: number
  movimentosHoje: number
}

const atalhos = [
  { href: "/wms/enderecos", label: "Endereços", desc: "Cadastrar posições do armazém", icon: MapPin },
  { href: "/wms/estoque", label: "Estoque em aberto", desc: "Peças do ERP e alocação", icon: Package },
  { href: "/wms/movimentos", label: "Movimentos", desc: "Entradas, transferências e saídas", icon: ArrowLeftRight },
]

export default function WmsPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)

  const { data, isLoading } = useQuery<Resumo>({
    queryKey: ["wms-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/wms/dashboard")
      if (!res.ok) throw new Error("Falha ao carregar o dashboard do WMS")
      return res.json()
    },
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    )
  }

  const cards = [
    { label: "Endereços", value: data.enderecos, icon: Warehouse, hint: `${data.enderecosAtivos} ativos` },
    { label: "Peças alocadas", value: data.pecasAlocadas, icon: Boxes, hint: `${data.metrosAlocados.toFixed(0)} m` },
    { label: "Peças em aberto", value: data.pecasEmAberto, icon: Package, hint: "no ERP, sem baixa" },
    { label: "Movimentos hoje", value: data.movimentosHoje, icon: Ruler, hint: "entradas e saídas" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          WMS — Gestão de Armazém
          {info && <InfoButton content={info} />}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Endereçamento e movimentação sobre o estoque em aberto, com dados no banco local.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
              <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icon size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
            <p className="text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {atalhos.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <Icon size={20} className="text-blue-600 dark:text-blue-400" />
            <p className="mt-3 font-medium text-slate-900 dark:text-slate-50">{label}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
