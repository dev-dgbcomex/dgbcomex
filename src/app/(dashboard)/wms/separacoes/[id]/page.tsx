"use client"

import { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  PackagePlus,
  PlayCircle,
  XCircle,
} from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import { estoqueDisponivelParaItem } from "@/lib/wms/repo"
import type {
  EstoqueDisponivelParaItem,
  PecaEmAberto,
  WmsPaginado,
  WmsPecaSeparacao,
  WmsSeparacaoDetalhe,
  WmsItemPedido,
} from "@/lib/wms/tipos"
import { CORES_STATUS, ROTULOS_STATUS } from "../../components/kanban"

const STATUS_EDITAVEIS = new Set(["LIBERADO", "EM_SEPARACAO"])

function corCapacidade(percentual: number): string {
  if (percentual >= 100) return "bg-green-100 text-green-700 border-green-200"
  if (percentual > 50) return "bg-blue-100 text-blue-700 border-blue-200"
  if (percentual >= 20) return "bg-amber-100 text-amber-800 border-amber-200"
  if (percentual >= 5) return "bg-orange-100 text-orange-800 border-orange-200"
  return "bg-red-100 text-red-700 border-red-200"
}

export default function SeparacaoDetalhePage() {
  const pathname = usePathname()
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const info = getInfoContent("/wms/separacoes")
  const id = Number(params?.id)
  const [itemAberto, setItemAberto] = useState<WmsItemPedido | null>(null)
  const router = useRouter()
  const [estoquePorItem, setEstoquePorItem] = useState<
    Map<string, EstoqueDisponivelParaItem>
  >(new Map())

  const { data, isLoading } = useQuery<WmsSeparacaoDetalhe>({
    queryKey: ["wms-separacao", id],
    enabled: Number.isInteger(id) && id > 0,
    queryFn: async () => {
      const res = await fetch(`/api/wms/separacoes/${id}`)
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao carregar a ordem")
      }
      return res.json()
    },
  })

  function recarregar() {
    queryClient.invalidateQueries({ queryKey: ["wms-separacao", id] })
    queryClient.invalidateQueries({ queryKey: ["wms-separacoes"] })
    queryClient.invalidateQueries({ queryKey: ["wms-pedidos"] })
    queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["wms-estoque"] })
  }

  useEffect(() => {
    if (!data) return
    const mapa = new Map<string, EstoqueDisponivelParaItem>()
    let carregando = 0
    for (const item of data.itens) {
      carregando++
      estoqueDisponivelParaItem(
        data.empresa,
        data.pedido,
        item.item
      ).then((est) => {
        mapa.set(String(item.item), est)
        carregando--
        if (carregando === 0) setEstoquePorItem(mapa)
      }).catch(() => {
        carregando--
        if (carregando === 0) setEstoquePorItem(mapa)
      })
    }
    if (data.itens.length === 0) setEstoquePorItem(new Map())
  }, [data])

  const acao = useMutation({
    mutationFn: async (tipo: "iniciar" | "concluir" | "cancelar") => {
      const res = await fetch(`/api/wms/separacoes/${id}/${tipo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao atualizar a ordem")
      }
      return res.json()
    },
    onSuccess: (_dados, tipo) => {
      toast.success(
        tipo === "iniciar"
          ? "Separação iniciada"
          : tipo === "concluir"
            ? "Separação concluída"
            : "Separação cancelada"
      )
      recarregar()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const remover = useMutation({
    mutationFn: async (pecaId: number) => {
      const res = await fetch(`/api/wms/separacoes/${id}/pecas/${pecaId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao remover a peça")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Peça removida da ordem")
      queryClient.invalidateQueries({ queryKey: ["wms-separacao", id] })
      queryClient.invalidateQueries({ queryKey: ["wms", "separacao", id] })
      queryClient.invalidateQueries({ queryKey: ["wms", "separacoes", id] })
      queryClient.invalidateQueries({ queryKey: ["wms", "separacoes", "itens", id] })
      queryClient.invalidateQueries({ queryKey: ["wms", "separacoes", "pecas", id] })
      queryClient.invalidateQueries({ queryKey: ["wms", "estoque", "livre"] })
      queryClient.invalidateQueries({ queryKey: ["wms", "pedidos"] })
      queryClient.invalidateQueries({ queryKey: ["wms", "pedidos", "kanban"] })
      recarregar()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  function cancelar() {
    if (!window.confirm("Cancelar esta ordem de separação? As peças voltam para o estoque.")) {
      return
    }
    acao.mutate("cancelar")
  }

  const pecas = useMemo(() => data?.pecas ?? [], [data])

  const pecasPorItem = useMemo(() => {
    const mapa = new Map<number, WmsPecaSeparacao[]>()
    for (const peca of pecas) {
      const lista = mapa.get(peca.item) ?? []
      lista.push(peca)
      mapa.set(peca.item, lista)
    }
    return mapa
  }, [pecas])

  function exportarCSV() {
    exportCSV(
      `wms-separacao-${id}`,
      ["Item", "Rolo", "Peça", "Produto", "Cor", "Gaveta", "Metros", "Status", "Baixado no ERP"],
      pecas.map((p) => [
        p.item,
        p.nroRolo,
        p.nroPeca,
        p.produtoDesc ?? p.produto ?? "",
        p.corDesc ?? p.cor ?? "",
        p.gaveta ?? "",
        p.metros != null ? p.metros.toFixed(2) : "",
        p.status,
        p.baixadoNoErp ? "Sim" : "Não",
      ])
    )
  }

  async function exportarPDF() {
    if (!data) return
    await exportPDFRelatorio({
      title: `WMS — Ordem #${data.id} · Pedido ${data.pedido}`,
      filename: `wms-separacao-${data.id}`,
      stats: {
        Cliente: data.clienteNome ?? data.clienteCodigo ?? "—",
        Status: ROTULOS_STATUS[data.status] ?? data.status,
        Peças: data.totalPecas,
        "Metros separados": data.totalMetros.toFixed(1),
        "Saldo do pedido": data.saldoMetros.toFixed(1),
      },
      tables: [
        {
          headers: ["Item", "Rolo", "Peça", "Produto", "Cor", "Gaveta", "Metros", "Status"],
          rows: pecas.map((p) => [
            p.item,
            p.nroRolo,
            p.nroPeca,
            p.produtoDesc ?? p.produto ?? "",
            p.corDesc ?? p.cor ?? "",
            p.gaveta ?? "",
            p.metros != null ? p.metros.toFixed(2) : "",
            p.status,
          ]),
        },
      ],
    })
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    )
  }

  const editavel = STATUS_EDITAVEIS.has(data.status)
  const divergentes = pecas.filter((p) => p.baixadoNoErp)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/wms/separacoes"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-1"
          >
            <ArrowLeft size={12} /> Voltar para as separações
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Ordem #{data.id} · Pedido {data.pedido}
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data.clienteNome ?? data.clienteCodigo ?? "Cliente não identificado"} · entrega{" "}
            {data.dataEntrega ?? "—"} · status{" "}
            <span
              className="font-medium"
              style={{ color: CORES_STATUS[data.status] }}
            >
              {ROTULOS_STATUS[data.status] ?? data.status}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/wms/pedidos")}
            className="gap-1.5"
          >
            Pedidos
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPDF} className="gap-1.5">
            <FileText size={14} /> PDF
          </Button>
          {data.status === "LIBERADO" && (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={acao.isPending}
              onClick={() => acao.mutate("iniciar")}
            >
              <PlayCircle size={14} /> Iniciar
            </Button>
          )}
          {data.status === "EM_SEPARACAO" && (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={acao.isPending}
              onClick={() => acao.mutate("concluir")}
            >
              <CheckCircle2 size={14} /> Concluir
            </Button>
          )}
          {editavel && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
              disabled={acao.isPending}
              onClick={cancelar}
            >
              <XCircle size={14} /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Peças reservadas", value: data.totalPecas },
          { label: "Metros separados", value: data.totalMetros.toFixed(1) },
          { label: "Itens com peças", value: data.itensSeparados },
          { label: "Saldo do pedido (m)", value: data.saldoMetros.toFixed(1) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {data.status === "CANCELADO" && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={16} className="mt-0.5" />
          <span>
            Ordem cancelada{data.motivoCancelamento ? `: ${data.motivoCancelamento}` : "."} As
            peças voltaram para o estoque em aberto.
          </span>
        </div>
      )}

      {data.status === "SEPARADO" && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 size={16} className="mt-0.5" />
          <span>
            Ordem concluída. As peças continuam bloqueadas até a baixa no ERP.
          </span>
        </div>
      )}

      {divergentes.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5" />
          <span>
            {divergentes.length} peça(s) já foram baixadas no ERP durante a separação. Confira e
            troque/remova se necessário.
          </span>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">Itens do pedido</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium">Cor / Desenho</th>
              <th className="px-3 py-2 font-medium">Largura</th>
              <th className="px-3 py-2 font-medium">Saldo</th>
              <th className="px-3 py-2 font-medium text-right">Estoque disp. (m)</th>
              <th className="px-3 py-2 font-medium text-center">Capacidade</th>
              <th className="px-3 py-2 font-medium">Reservado</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.itens.map((item) => {
              const doItem = pecasPorItem.get(item.item) ?? []
              return (
                <tr key={item.item}>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    {item.item}
                  </td>
                  <td className="px-3 py-2">
                    {item.produtoDesc ?? item.produto ?? "—"}
                    <span className="block text-xs text-slate-400">
                      {[item.situacaoDesc, item.categoriaDesc, item.varianteDesc]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {[item.corDesc ?? item.cor, item.desenhoDesc ?? item.desenho]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </td>
                  <td className="px-3 py-2">{item.largura ?? "—"}</td>
                  <td className="px-3 py-2">{item.saldo.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    {(() => {
                      const est = estoquePorItem.get(String(item.item))
                      if (!est) return "—"
                      return est.totalMetrosDisponiveis.toFixed(2)
                    })()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(() => {
                      const est = estoquePorItem.get(String(item.item))
                      if (!est) return <span className="text-xs text-slate-400">—</span>
                      const pct = est.percentualCapacidade
                      return (
                        <span
                          className={`inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs font-medium ${corCapacidade(pct)}`}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    {doItem.length} pç ·{" "}
                    {doItem.reduce((soma, p) => soma + (p.metros ?? 0), 0).toFixed(2)} m
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editavel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setItemAberto(item)}
                      >
                        <PackagePlus size={14} /> Adicionar peças
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">
            Peças na ordem ({pecas.length})
          </h2>
        </div>
        {pecas.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Nenhuma peça adicionada. Use “Adicionar peças” em um item do pedido.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Rolo / Peça</th>
                <th className="px-3 py-2 font-medium">Produto / Cor</th>
                <th className="px-3 py-2 font-medium">Gaveta</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pecas.map((peca) => (
                <tr key={peca.id}>
                  <td className="px-3 py-2">{peca.item}</td>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    {peca.nroRolo}/{peca.nroPeca}
                  </td>
                  <td className="px-3 py-2">
                    {peca.produtoDesc ?? peca.produto ?? "—"}
                    <span className="block text-xs text-slate-400">
                      {peca.corDesc ?? peca.cor ?? ""}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {peca.gaveta ?? "—"}
                    {peca.zona && (
                      <span className="block text-xs text-slate-400">{peca.zona}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {peca.metros != null ? peca.metros.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {peca.status}
                    {peca.baixadoNoErp && (
                      <span className="ml-2 text-xs text-amber-600">baixada no ERP</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {data.status === "EM_SEPARACAO" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={remover.isPending}
                        onClick={() => remover.mutate(peca.id)}
                      >
                        Remover
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {itemAberto && (
        <SeletorPecas
          separacaoId={data.id}
          item={itemAberto}
          onClose={() => setItemAberto(null)}
          onAdicionado={() => {
            setItemAberto(null)
            recarregar()
          }}
        />
      )}
    </div>
  )
}

function SeletorPecas({
  separacaoId,
  item,
  onClose,
  onAdicionado,
}: {
  separacaoId: number
  item: WmsItemPedido
  onClose: () => void
  onAdicionado: () => void
}) {
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [campo, setCampo] = useState<"" | "lote" | "aviso" | "gaveta">("")
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery<WmsPaginado<PecaEmAberto>>({
    queryKey: ["wms-pecas-item", separacaoId, item.item, buscaAplicada, campo],
    queryFn: async () => {
      const params = new URLSearchParams({
        busca: buscaAplicada,
        campo,
        limite: "200",
        offset: "0",
      })
      const res = await fetch(
        `/api/wms/separacoes/${separacaoId}/itens/${item.item}/pecas?${params.toString()}`
      )
      if (!res.ok) throw new Error("Falha ao carregar as peças disponíveis")
      return res.json()
    },
  })

  const queryClient2 = useQueryClient()
  const adicionar = useMutation({
    mutationFn: async (pecas: { nroRolo: string; nroPeca: string }[]) => {
      const res = await fetch(`/api/wms/separacoes/${separacaoId}/pecas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: item.item, pecas }),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao adicionar as peças")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Peças reservadas para a ordem")
      queryClient2.invalidateQueries({ queryKey: ["wms-separacao", separacaoId] })
      queryClient2.invalidateQueries({ queryKey: ["wms", "separacao", separacaoId] })
      queryClient2.invalidateQueries({ queryKey: ["wms", "separacoes", separacaoId] })
      queryClient2.invalidateQueries({ queryKey: ["wms", "separacoes", "itens", separacaoId] })
      queryClient2.invalidateQueries({ queryKey: ["wms", "separacoes", "pecas", separacaoId] })
      queryClient2.invalidateQueries({ queryKey: ["wms", "estoque", "livre"] })
      queryClient2.invalidateQueries({ queryKey: ["wms", "pedidos"] })
      queryClient2.invalidateQueries({ queryKey: ["wms", "pedidos", "kanban"] })
      onAdicionado()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const itens = data?.itens ?? []

  function alternar(chave: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      return proximo
    })
  }

  function confirmar() {
    const pecas = itens
      .filter((p) => selecionadas.has(`${p.nro_rolo}|${p.nro_peca}`))
      .map((p) => ({ nroRolo: p.nro_rolo, nroPeca: p.nro_peca }))
    if (pecas.length === 0) return
    adicionar.mutate(pecas)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar peças à ordem"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">
              Adicionar peças — item {item.item}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {item.produtoDesc ?? item.produto ?? "—"} ·{" "}
              {[item.corDesc ?? item.cor, item.desenhoDesc ?? item.desenho]
                .filter(Boolean)
                .join(" / ")}{" "}
              · largura {item.largura ?? "—"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-800">
          <div
            className="flex gap-1 px-4 pt-3"
            role="tablist"
            aria-label="Campo de busca das peças"
          >
            {[
              { id: "" as const, rotulo: "Rolo/peça" },
              { id: "lote" as const, rotulo: "Lote" },
              { id: "aviso" as const, rotulo: "Aviso" },
              { id: "gaveta" as const, rotulo: "Gaveta" },
            ].map((aba) => (
              <button
                key={aba.id || "geral"}
                type="button"
                role="tab"
                aria-selected={campo === aba.id}
                onClick={() => {
                  setCampo(aba.id)
                  setBusca("")
                  setBuscaAplicada("")
                }}
                className={`rounded-t-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  campo === aba.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>
          <form
            className="px-4 py-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setBuscaAplicada(busca.trim())
            }}
          >
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                campo === "lote"
                  ? "Buscar por lote/sub-lote"
                  : campo === "aviso"
                    ? "Buscar por aviso"
                    : campo === "gaveta"
                      ? "Buscar por gaveta (endereço)"
                      : "Rolo ou peça"
              }
              aria-label="Buscar peças disponíveis"
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : itens.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Nenhuma peça em aberto compatível com o item.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300 sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 font-medium">Rolo / Peça</th>
                  <th className="px-3 py-2 font-medium">Sub-lote</th>
                  <th className="px-3 py-2 font-medium">Gaveta</th>
                  <th className="px-3 py-2 font-medium">Metros</th>
                  <th className="px-3 py-2 font-medium">Aviso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {itens.map((peca) => {
                  const chave = `${peca.nro_rolo}|${peca.nro_peca}`
                  return (
                    <tr key={chave}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${peca.nro_rolo}/${peca.nro_peca}`}
                          checked={selecionadas.has(chave)}
                          onChange={() => alternar(chave)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                        {peca.nro_rolo}/{peca.nro_peca}
                      </td>
                      <td className="px-3 py-2">{peca.sub_lote ?? "—"}</td>
                      <td className="px-3 py-2">
                        {peca.gaveta ?? "—"}
                        {peca.zona && (
                          <span className="block text-xs text-slate-400">{peca.zona}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {peca.metros != null ? peca.metros.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2">{peca.aviso ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {selecionadas.size} peça(s) selecionada(s) · {data?.total ?? 0} disponível(is)
          </p>
          <Button
            disabled={selecionadas.size === 0 || adicionar.isPending}
            onClick={confirmar}
          >
            {adicionar.isPending ? "Reservando..." : "Reservar peças"}
          </Button>
        </div>
      </div>
    </div>
  )
}
