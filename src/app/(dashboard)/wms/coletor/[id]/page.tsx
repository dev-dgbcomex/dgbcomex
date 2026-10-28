"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useParams, usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PackagePlus,
  PlayCircle,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { podeColetarWms } from "@/lib/wms/permissoes"
import {
  adicionarPecasColetor,
  detalheSeparacaoColetor,
  gerarRomaneioColetor,
} from "@/lib/wms/repo"
import type {
  WmsColetorSeparacaoDetalhe,
  WmsColetorPecaDisponivel,
  WmsColetorSeparacaoItem,
} from "@/lib/wms/tipos"

export default function SeparacaoDetalhePage() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? null
  const podeColetar = podeColetarWms(role)
  const params = useParams()
  const id = Number((params as { id: string }).id)
  const info = getInfoContent(pathname)

  const [pecaSelecionada, setPecaSelecionada] = useState<
    | null
    | {
        item: number
        nroRolo: string
        nroPeca: string
      }
  >(null)

  const { data, isLoading } = useQuery({
    queryKey: ["wms/coletor/separacao", id],
    queryFn: async () => {
      const res = await fetch(`/api/wms/coletor/separacoes/${id}`)
      if (!res.ok) throw new Error("Falha ao carregar a ordem")
      return res.json()
    },
    enabled: Number.isInteger(id) && id > 0,
  })

  const adicionarPecas = useMutation({
    mutationFn: async (pecas: { nroRolo: string; nroPeca: string }[]) => {
      return adicionarPecasColetor(id, { item: pecaSelecionada?.item ?? 0, pecas })
    },
    onSuccess: () => {
      toast.success("Peças adicionadas com sucesso")
      setPecaSelecionada(null)
      queryClient.invalidateQueries({ queryKey: ["wms/coletor/separacao", id] })
    },
    onError: (erro: Error) => {
      toast.error(`Falha ao adicionar peças: ${erro.message}`)
    },
  })

  const gerarRomaneio = useMutation({
    mutationFn: async () => {
      return gerarRomaneioColetor(id, { usuarioId: session?.user?.id })
    },
    onSuccess: (dados) => {
      toast.success(`Romaneio ${dados.romaneio} gerado com sucesso`)
      queryClient.invalidateQueries({ queryKey: ["wms/coletor/separacao", id] })
      queryClient.invalidateQueries({ queryKey: ["wms/coletor/separacoes"] })
      queryClient.invalidateQueries({ queryKey: ["wms/coletor/dashboard"] })
    },
    onError: (erro: Error) => {
      toast.error(`Falha ao gerar romaneio: ${erro.message}`)
    },
  })

  if (!podeColetar) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center max-w-md">
          <ArrowLeft size={48} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Acesso não autorizado
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Seu perfil não tem permissão para acessar o coletor.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Ordem #{data.id} · Pedido {data.pedido}
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data.cliente ?? "—"} · Entrega {data.dataEntrega ?? "—"} ·
            Status{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {data.status === "LIBERADO" ? "Liberado" : "Em separação"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => gerarRomaneio.mutate()}
            disabled={gerarRomaneio.isPending || data.itens.length === 0}
            className="gap-1.5"
          >
            {gerarRomaneio.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Gerar Romaneio
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
            Peças reservadas
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {data.totalPecas}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
            Metros
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {data.totalMetros?.toFixed(2) ?? "0.00"} m
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
            Saldo (m)
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {data.saldoMetros?.toFixed(2) ?? "0.00"} m
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">
            Itens do pedido ({data.itens.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium">Saldo</th>
              <th className="px-3 py-2 font-medium">Reservado</th>
              <th className="px-3 py-2 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data.itens as WmsColetorSeparacaoItem[]).map((item) => (
              <tr key={item.item}>
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                  {item.item}
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-900 dark:text-slate-100">
                    {item.produtoDesc ?? item.produto ?? "—"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.corDesc ?? item.cor ?? ""}
                    {item.largura ? ` · L {item.largura}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  {item.saldo?.toFixed(2) ?? "0.00"} {item.unid ?? ""}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.pecasReservadas}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPecaSelecionada({
                        item: item.item,
                        nroRolo: "",
                        nroPeca: "",
                      })
                    }
                    className="gap-1.5"
                  >
                    <PackagePlus size={14} /> Coletar peças
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {pecaSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar peças"
          onClick={() => setPecaSelecionada(null)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-50">
                  Coletar peças — item {pecaSelecionada.item}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selecione as peças para adicionar à ordem.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPecaSelecionada(null)}>
                Fechar
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-500">
                  Selecione as peças para adicionar à ordem.
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setPecaSelecionada(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={() => {}} disabled={true} className="gap-1.5">
                Adicionar peças
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
