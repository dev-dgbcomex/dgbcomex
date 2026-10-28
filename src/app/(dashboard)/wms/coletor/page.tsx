"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Download, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { podeColetarWms } from "@/lib/wms/permissoes"
import {
  obterDashboardColetor,
  listarSeparacoesColetor,
  sincronizarColetor,
} from "@/lib/wms/repo"
import type { WmsColetorSeparacao } from "@/lib/wms/tipos"
import { BotaoVoltar } from "../components/botao-voltar"

const PAGINA = 50

export default function ColetorPage() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? null
  const podeColetar = podeColetarWms(role)
  const info = getInfoContent(pathname)
  const [offset, setOffset] = useState(0)

  const dashboard = useQuery({
    queryKey: ["wms/coletor/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/wms/coletor/dashboard")
      if (!res.ok) throw new Error("Falha ao carregar o dashboard do coletor")
      return res.json()
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["wms/coletor/separacoes", offset],
    queryFn: async () => {
      const res = await fetch(
        `/api/wms/coletor/separacoes?limite=${PAGINA}&offset=${offset}`
      )
      if (!res.ok) throw new Error("Falha ao carregar as ordens de separação")
      return res.json()
    },
  })

  const itens = useMemo(() => data?.itens ?? [], [data])
  const total = useMemo(() => data?.total ?? 0, [data])

  const sincronizar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wms/coletor/sincronizar", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Falha ao sincronizar com o ERP")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Sincronização concluída com sucesso")
      queryClient.invalidateQueries({ queryKey: ["wms/coletor/separacoes"] })
      queryClient.invalidateQueries({ queryKey: ["wms/coletor/dashboard"] })
    },
    onError: (erro: Error) => {
      toast.error(`Falha na sincronização: ${erro.message}`)
    },
  })

  useEffect(() => {
    // Disparar sincronização automática ao montar a tela
    sincronizar.mutate()
  }, [])

  if (!podeColetar) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center max-w-md">
          <ArrowLeft size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Acesso não autorizado
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Seu perfil não tem permissão para acessar o coletor de pedidos.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <BotaoVoltar />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Coletor de Pedidos
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ordens de separação prontas para coleta. Selecione uma ordem para
            adicionar peças e gerar o romaneio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sincronizar.mutate()}
            disabled={sincronizar.isPending}
            className="gap-1.5"
          >
            {sincronizar.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Sincronizar
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Exportação CSV não implementada")} className="gap-1.5">
            <Download size={14} /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
            Pendentes
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {dashboard.data?.pendentes ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
            Em andamento
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {dashboard.data?.emAndamento ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
            Concluídas hoje
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {dashboard.data?.concluidasHoje ?? 0}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Nenhuma ordem de separação disponível para coleta.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Ordem</th>
                <th className="px-3 py-2 font-medium">Pedido</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Peças</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((ordem: WmsColetorSeparacao) => (
                <tr key={ordem.id}>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    #{ordem.id}
                  </td>
                  <td className="px-3 py-2">{ordem.pedido}</td>
                  <td className="px-3 py-2">{ordem.cliente ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium"
                      style={
                        {
                          color:
                            ordem.status === "LIBERADO"
                              ? "#f59e0b"
                              : ordem.status === "EM_SEPARACAO"
                              ? "#2563eb"
                              : "#94a3b8",
                        }
                      }
                    >
                      {ordem.status === "LIBERADO" ? "Liberado" : "Em separação"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{ordem.totalPecas}</td>
                  <td className="px-3 py-2">{ordem.totalMetros?.toFixed(2) ?? "0.00"}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/wms/coletor/separacoes/${ordem.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Coletar <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGINA && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Exibindo {Math.min(offset + itens.length, total)} de {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGINA))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGINA >= total}
              onClick={() => setOffset((o) => o + PAGINA)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
