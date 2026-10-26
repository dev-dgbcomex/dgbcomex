"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Download, FileText, Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import type { WmsPaginado, WmsSeparacao, WmsSeparacaoStatus } from "@/lib/wms/tipos"
import {
  CORES_STATUS,
  KanbanWms,
  Paginacao,
  ROTULOS_STATUS,
  VisualizacaoToggle,
} from "../components/kanban"

const PAGINA = 50
const STATUS: WmsSeparacaoStatus[] = ["LIBERADO", "EM_SEPARACAO", "SEPARADO", "CANCELADO"]

export default function SeparacoesPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [status, setStatus] = useState("")
  const [offset, setOffset] = useState(0)
  const [modo, setModo] = useState<"lista" | "kanban">("kanban")

  const { data, isLoading } = useQuery<WmsPaginado<WmsSeparacao>>({
    queryKey: ["wms-separacoes", buscaAplicada, status, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        busca: buscaAplicada,
        status,
        limite: String(PAGINA),
        offset: String(offset),
      })
      const res = await fetch(`/api/wms/separacoes?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar as separações")
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
        itens: itens.filter((ordem) => ordem.status === id),
      })),
    [itens]
  )

  function exportarCSV() {
    exportCSV(
      "wms-separacoes",
      ["Ordem", "Pedido", "Cliente", "Status", "Peças", "Metros", "Saldo (m)", "Criada em"],
      itens.map((o) => [
        o.id,
        o.pedido,
        o.clienteNome ?? o.clienteCodigo ?? "",
        ROTULOS_STATUS[o.status] ?? o.status,
        o.totalPecas,
        o.totalMetros.toFixed(2),
        o.saldoMetros.toFixed(2),
        o.criadoEm ?? "",
      ])
    )
  }

  async function exportarPDF() {
    await exportPDFRelatorio({
      title: "WMS — Ordens de separação",
      filename: "wms-separacoes",
      stats: {
        Ordens: itens.length,
        Peças: itens.reduce((soma, o) => soma + o.totalPecas, 0),
        "Metros separados": itens.reduce((soma, o) => soma + o.totalMetros, 0).toFixed(1),
      },
      tables: [
        {
          headers: [
            "Ordem",
            "Pedido",
            "Cliente",
            "Status",
            "Peças",
            "Metros",
            "Saldo (m)",
            "Criada em",
          ],
          rows: itens.map((o) => [
            o.id,
            o.pedido,
            o.clienteNome ?? o.clienteCodigo ?? "",
            ROTULOS_STATUS[o.status] ?? o.status,
            o.totalPecas,
            o.totalMetros.toFixed(2),
            o.saldoMetros.toFixed(2),
            o.criadoEm ?? "",
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
            Ordens de Separação
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ordens criadas a partir dos pedidos liberados. As peças reservadas ficam bloqueadas
            para outras ordens até a baixa no ERP.
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
            aria-label="Buscar ordens"
          />
        </div>
        <select
          aria-label="Filtrar por status"
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
        >
          <option value="">Todos os status</option>
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
          Nenhuma ordem de separação encontrada.
        </p>
      ) : modo === "kanban" ? (
        <KanbanWms
          colunas={colunas}
          vazio="Nenhuma ordem"
          renderCard={(ordem) => (
            <Link
              key={ordem.id}
              href={`/wms/separacoes/${ordem.id}`}
              className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 space-y-1.5 hover:border-blue-400"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  #{ordem.id} · Pedido {ordem.pedido}
                </p>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {ordem.totalPecas} pç
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {ordem.clienteNome ?? ordem.clienteCodigo ?? "—"}
              </p>
              <p className="text-xs text-slate-400">
                {ordem.totalMetros.toFixed(1)} m separados • saldo {ordem.saldoMetros.toFixed(1)} m{ordem.artigos ? ` • Artigos: ${ordem.artigos}` : ""}\n              </p>
            </Link>
          )}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Ordem</th>
                <th className="px-3 py-2 font-medium">Pedido</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Peças</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium">Saldo (m)</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((ordem) => (
                <tr key={ordem.id}>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    #{ordem.id}
                  </td>
                  <td className="px-3 py-2">{ordem.pedido}</td>
                  <td className="px-3 py-2">{ordem.clienteNome ?? ordem.clienteCodigo ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: CORES_STATUS[ordem.status] }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CORES_STATUS[ordem.status] }}
                      />
                      {ROTULOS_STATUS[ordem.status] ?? ordem.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{ordem.totalPecas}</td>
                  <td className="px-3 py-2">{ordem.totalMetros.toFixed(2)}</td>
                  <td className="px-3 py-2">{ordem.saldoMetros.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/wms/separacoes/${ordem.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Abrir
                    </Link>
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
