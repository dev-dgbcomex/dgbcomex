"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Download, FileText, Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import { podeMoverParaSituacao } from "@/lib/wms/permissoes"
import type {
  WmsPaginado,
  WmsPedido,
  WmsSituacaoPedido,
} from "@/lib/wms/tipos"
import {
  KanbanWms,
  Paginacao,
  VisualizacaoToggle,
} from "../components/kanban"

const PAGINA = 50

function corDaSituacao(situacao?: WmsSituacaoPedido | null): string {
  return situacao?.cor ?? "#94a3b8"
}

function nomeDaSituacao(
  pedido: WmsPedido,
  situacoes: WmsSituacaoPedido[]
): string {
  if (pedido.situacaoNome) return pedido.situacaoNome
  const encontrada = situacoes.find((s) => s.codigo === pedido.separacaoStatus)
  return encontrada?.nome ?? pedido.separacaoStatus ?? "Sem separação"
}

export default function PedidosPage() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? null
  const info = getInfoContent(pathname)
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [status, setStatus] = useState("")
  const [offset, setOffset] = useState(0)
  const [modo, setModo] = useState<"lista" | "kanban">("lista")

  const pedidosQuery = useQuery<WmsPaginado<WmsPedido>>({
    queryKey: ["wms-pedidos", buscaAplicada, status, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        busca: buscaAplicada,
        statusSeparacao: status,
        limite: String(PAGINA),
        offset: String(offset),
      })
      const res = await fetch(`/api/wms/pedidos?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar os pedidos")
      return res.json()
    },
  })

  const situacoesQuery = useQuery<WmsPaginado<WmsSituacaoPedido>>({
    queryKey: ["wms-situacoes", "todas"],
    queryFn: async () => {
      const res = await fetch("/api/wms/situacoes")
      if (!res.ok) throw new Error("Falha ao carregar as situações")
      return res.json()
    },
  })

  const itens = useMemo(() => pedidosQuery.data?.itens ?? [], [pedidosQuery.data])
  const situacoes = useMemo(
    () => situacoesQuery.data?.itens ?? [],
    [situacoesQuery.data]
  )
  const situacoesAtivas = useMemo(
    () => situacoes.filter((s) => s.ativo),
    [situacoes]
  )
  const situacaoPadrao = useMemo(
    () => situacoes.find((s) => s.codigo === "SEM_SEPARACAO"),
    [situacoes]
  )

  const colunas = useMemo(() => {
    const comPedidos = new Set(itens.map((p) => p.situacaoId))
    return situacoesAtivas
      .filter((s) => s.ativo || comPedidos.has(s.id))
      .map((situacao) => ({
        id: String(situacao.id),
        rotulo: situacao.nome,
        cor: situacao.cor,
        itens: itens.filter(
          (pedido) =>
            (pedido.situacaoId ?? situacaoPadrao?.id ?? null) === situacao.id
        ),
      }))
  }, [itens, situacoesAtivas, situacaoPadrao])

  const mover = useMutation({
    mutationFn: async ({
      pedido,
      situacao,
    }: {
      pedido: WmsPedido
      situacao: WmsSituacaoPedido
    }) => {
      const res = await fetch(
        `/api/wms/pedidos/${encodeURIComponent(pedido.empresa)}/${encodeURIComponent(
          pedido.pedido
        )}/situacao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ situacaoId: situacao.id }),
        }
      )
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao mover o pedido")
      }
      return res.json()
    },
    onSuccess: (_dados, variaveis) => {
      toast.success(`Pedido movido para ${variaveis.situacao.nome}`)
      queryClient.invalidateQueries({ queryKey: ["wms-pedidos"] })
      queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["wms-separacoes"] })
      queryClient.invalidateQueries({ queryKey: ["wms-situacoes"] })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  function moverPedido(pedido: WmsPedido, situacaoId: string) {
    const situacao = situacoes.find((s) => String(s.id) === situacaoId)
    if (!situacao) return
    if ((pedido.situacaoId ?? situacaoPadrao?.id) === situacao.id) return
    mover.mutate({ pedido, situacao })
  }

  function podeMover(pedido: WmsPedido, destino: string): boolean {
    const situacao = situacoes.find((s) => String(s.id) === destino)
    if (!situacao || !situacao.ativo) return false
    if (mover.isPending) return false
    return podeMoverParaSituacao(role, situacao)
  }

  function destinosDoPedido(pedido: WmsPedido) {
    return situacoesAtivas.filter(
      (situacao) =>
        situacao.id !== pedido.situacaoId && podeMoverParaSituacao(role, situacao)
    )
  }

  function exportarCSV() {
    exportCSV(
      "wms-pedidos",
      ["Pedido", "Cliente", "Data", "Entrega", "Itens", "Saldo (m)", "Situação"],
      itens.map((p) => [
        p.pedido,
        p.clienteNome ?? p.clienteCodigo ?? "",
        p.dataPedido ?? "",
        p.dataEntrega ?? "",
        p.totalItens,
        p.saldoMetros.toFixed(2),
        nomeDaSituacao(p, situacoes),
      ])
    )
  }

  async function exportarPDF() {
    await exportPDFRelatorio({
      title: "WMS — Pedidos liberados",
      filename: "wms-pedidos",
      stats: {
        Pedidos: itens.length,
        "Saldo total (m)": itens.reduce((soma, p) => soma + p.saldoMetros, 0).toFixed(1),
      },
      tables: [
        {
          headers: [
            "Pedido",
            "Cliente",
            "Data",
            "Entrega",
            "Itens",
            "Saldo (m)",
            "Situação",
          ],
          rows: itens.map((p) => [
            p.pedido,
            p.clienteNome ?? p.clienteCodigo ?? "",
            p.dataPedido ?? "",
            p.dataEntrega ?? "",
            p.totalItens,
            p.saldoMetros.toFixed(2),
            nomeDaSituacao(p, situacoes),
          ]),
        },
      ],
    })
  }

  const carregando = pedidosQuery.isLoading || situacoesQuery.isLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Pedidos para Separação
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Arraste os pedidos entre as colunas para liberar, iniciar, concluir ou cancelar a
            separação. As colunas vêm do cadastro de situações.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VisualizacaoToggle modo={modo} onChange={setModo} />
          <Link
            href="/wms/situacoes"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Situações
          </Link>
          <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPDF} className="gap-1.5">
            <FileText size={14} /> PDF
          </Button>
        </div>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setOffset(0)
          setBuscaAplicada(busca.trim())
        }}
      >
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search size={16} className="absolute left-2.5 top-2 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pedido, cliente ou razão social"
            className="pl-8"
            aria-label="Buscar pedidos"
          />
        </div>
        <select
          aria-label="Filtrar por situação"
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
        >
          <option value="">Todas as situações</option>
          {situacoesAtivas.map((situacao) => (
            <option key={situacao.id} value={situacao.codigo}>
              {situacao.nome}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {carregando ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Nenhum pedido liberado encontrado.
        </p>
      ) : modo === "kanban" ? (
        <KanbanWms
          colunas={colunas}
          chave={(pedido) => `${pedido.empresa}-${pedido.pedido}`}
          vazio="Nenhum pedido"
          onMover={moverPedido}
          podeMover={podeMover}
          renderCard={(pedido) => {
            const situacao = situacoes.find((s) => s.id === pedido.situacaoId)
            return (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 dark:text-slate-50">
                      Pedido {pedido.pedido}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 break-words">
                      {pedido.clienteNome ?? pedido.clienteCodigo ?? "—"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {pedido.saldoMetros.toFixed(1)} m
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>{pedido.totalItens} item(ns)</span>
                  <span aria-hidden>·</span>
                  <span>entrega {pedido.dataEntrega ?? "—"}</span>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    color: corDaSituacao(situacao),
                    backgroundColor: `${corDaSituacao(situacao)}1a`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: corDaSituacao(situacao) }}
                  />
                  {nomeDaSituacao(pedido, situacoes)}
                </span>
                {pedido.separacaoId && (
                  <Link
                    href={`/wms/separacoes/${pedido.separacaoId}`}
                    className="block text-xs font-medium text-blue-600 hover:underline"
                  >
                    Abrir ordem #{pedido.separacaoId}
                  </Link>
                )}
              </div>
            )
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Pedido</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Entrega</th>
                <th className="px-3 py-2 font-medium">Itens</th>
                <th className="px-3 py-2 font-medium">Saldo (m)</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 font-medium">Mover</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((pedido) => {
                const situacao = situacoes.find((s) => s.id === pedido.situacaoId)
                const destinos = destinosDoPedido(pedido)
                return (
                  <tr key={`${pedido.empresa}-${pedido.pedido}`}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                      {pedido.pedido}
                    </td>
                    <td className="px-3 py-2">
                      {pedido.clienteNome ?? pedido.clienteCodigo ?? "—"}
                    </td>
                    <td className="px-3 py-2">{pedido.dataPedido ?? "—"}</td>
                    <td className="px-3 py-2">{pedido.dataEntrega ?? "—"}</td>
                    <td className="px-3 py-2">{pedido.totalItens}</td>
                    <td className="px-3 py-2">{pedido.saldoMetros.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: corDaSituacao(situacao) }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: corDaSituacao(situacao) }}
                        />
                        {nomeDaSituacao(pedido, situacoes)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {destinos.length > 0 ? (
                        <select
                          aria-label={`Mover pedido ${pedido.pedido}`}
                          value=""
                          disabled={mover.isPending}
                          onChange={(e) => {
                            const destino = e.target.value
                            if (destino) moverPedido(pedido, destino)
                            e.target.value = ""
                          }}
                          className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-2 text-xs"
                        >
                          <option value="">Mover para…</option>
                          {destinos.map((destino) => (
                            <option key={destino.id} value={destino.id}>
                              {destino.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {pedido.separacaoId && (
                        <Link
                          href={`/wms/separacoes/${pedido.separacaoId}`}
                          className="text-blue-600 hover:underline"
                        >
                          Abrir ordem
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pedidosQuery.data && pedidosQuery.data.total > PAGINA && (
        <Paginacao
          total={pedidosQuery.data.total}
          pagina={Math.floor(offset / PAGINA) + 1}
          porPagina={PAGINA}
          onAnterior={() => setOffset((o) => Math.max(0, o - PAGINA))}
          onProxima={() => setOffset((o) => o + PAGINA)}
        />
      )}
    </div>
  )
}
