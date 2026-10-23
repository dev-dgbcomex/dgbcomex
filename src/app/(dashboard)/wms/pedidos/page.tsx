"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Download, FileText, Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import type { WmsPaginado, WmsPedido, WmsPedidoStatus } from "@/lib/wms/tipos"
import {
  CORES_STATUS,
  KanbanWms,
  Paginacao,
  ROTULOS_STATUS,
  VisualizacaoToggle,
} from "../components/kanban"

const PAGINA = 50
const STATUS: WmsPedidoStatus[] = [
  "SEM_SEPARACAO",
  "LIBERADO",
  "EM_SEPARACAO",
  "SEPARADO",
]

export default function PedidosPage() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const info = getInfoContent(pathname)
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [status, setStatus] = useState("")
  const [offset, setOffset] = useState(0)
  const [modo, setModo] = useState<"lista" | "kanban">("lista")

  const { data, isLoading } = useQuery<WmsPaginado<WmsPedido>>({
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

  const itens = useMemo(() => data?.itens ?? [], [data])

  const colunas = useMemo(
    () =>
      STATUS.map((id) => ({
        id,
        rotulo: ROTULOS_STATUS[id] ?? id,
        cor: CORES_STATUS[id] ?? "#94a3b8",
        itens: itens.filter((pedido) => pedido.separacaoStatus === id),
      })),
    [itens]
  )

  const criar = useMutation({
    mutationFn: async (pedido: WmsPedido) => {
      const res = await fetch("/api/wms/separacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: pedido.empresa, pedido: pedido.pedido }),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao marcar o pedido para separação")
      }
      return res.json()
    },
    onSuccess: (separacao: { id: number }) => {
      toast.success("Pedido marcado para separação")
      queryClient.invalidateQueries({ queryKey: ["wms-pedidos"] })
      queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
      router.push(`/wms/separacoes/${separacao.id}`)
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  function exportarCSV() {
    exportCSV(
      "wms-pedidos",
      ["Pedido", "Cliente", "Data", "Entrega", "Itens", "Saldo (m)", "Separação"],
      itens.map((p) => [
        p.pedido,
        p.clienteNome ?? p.clienteCodigo ?? "",
        p.dataPedido ?? "",
        p.dataEntrega ?? "",
        p.totalItens,
        p.saldoMetros.toFixed(2),
        ROTULOS_STATUS[p.separacaoStatus] ?? p.separacaoStatus,
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
          headers: ["Pedido", "Cliente", "Data", "Entrega", "Itens", "Saldo (m)", "Separação"],
          rows: itens.map((p) => [
            p.pedido,
            p.clienteNome ?? p.clienteCodigo ?? "",
            p.dataPedido ?? "",
            p.dataEntrega ?? "",
            p.totalItens,
            p.saldoMetros.toFixed(2),
            ROTULOS_STATUS[p.separacaoStatus] ?? p.separacaoStatus,
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Pedidos para Separação
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pedidos aprovados e abertos no ERP (status 2) com saldo a separar. Marcar o pedido
            cria a ordem no WMS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VisualizacaoToggle modo={modo} onChange={setModo} />
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
          aria-label="Filtrar por separação"
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
        >
          <option value="">Todas as situações</option>
          {STATUS.map((valor) => (
            <option key={valor} value={valor}>
              {ROTULOS_STATUS[valor]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {isLoading ? (
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
          vazio="Nenhum pedido"
          renderCard={(pedido) => (
            <div
              key={`${pedido.empresa}-${pedido.pedido}`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Pedido {pedido.pedido}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {pedido.clienteNome ?? pedido.clienteCodigo ?? "—"}
                  </p>
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {pedido.saldoMetros.toFixed(1)} m
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {pedido.totalItens} item(ns) · entrega {pedido.dataEntrega ?? "—"}
              </p>
              {pedido.separacaoId ? (
                <Link
                  href={`/wms/separacoes/${pedido.separacaoId}`}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Abrir ordem #{pedido.separacaoId}
                </Link>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={criar.isPending}
                  onClick={() => criar.mutate(pedido)}
                >
                  Marcar para separação
                </Button>
              )}
            </div>
          )}
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
                <th className="px-3 py-2 font-medium">Separação</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((pedido) => (
                <tr key={`${pedido.empresa}-${pedido.pedido}`}>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    {pedido.pedido}
                  </td>
                  <td className="px-3 py-2">{pedido.clienteNome ?? pedido.clienteCodigo ?? "—"}</td>
                  <td className="px-3 py-2">{pedido.dataPedido ?? "—"}</td>
                  <td className="px-3 py-2">{pedido.dataEntrega ?? "—"}</td>
                  <td className="px-3 py-2">{pedido.totalItens}</td>
                  <td className="px-3 py-2">{pedido.saldoMetros.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: CORES_STATUS[pedido.separacaoStatus] }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CORES_STATUS[pedido.separacaoStatus] }}
                      />
                      {ROTULOS_STATUS[pedido.separacaoStatus] ?? pedido.separacaoStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {pedido.separacaoId ? (
                      <Link
                        href={`/wms/separacoes/${pedido.separacaoId}`}
                        className="text-blue-600 hover:underline"
                      >
                        Abrir ordem
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={criar.isPending}
                        onClick={() => criar.mutate(pedido)}
                      >
                        Marcar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGINA && (
        <Paginacao
          total={data.total}
          pagina={Math.floor(offset / PAGINA) + 1}
          porPagina={PAGINA}
          onAnterior={() => setOffset((o) => Math.max(0, o - PAGINA))}
          onProxima={() => setOffset((o) => o + PAGINA)}
        />
      )}
    </div>
  )
}
