"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { Download, FileText, Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import type { WmsGaveta, WmsPaginado } from "@/lib/wms/tipos"
import { KanbanWms, Paginacao, VisualizacaoToggle } from "../components/kanban"

const PAGINA = 100
const CORES_ZONA = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0891b2", "#db2777"]

export default function GavetasPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [busca, setBusca] = useState("")
  const [zona, setZona] = useState("")
  const [filtros, setFiltros] = useState({ busca: "", zona: "" })
  const [offset, setOffset] = useState(0)
  const [modo, setModo] = useState<"lista" | "kanban">("kanban")

  const { data, isLoading } = useQuery<WmsPaginado<WmsGaveta>>({
    queryKey: ["wms-gavetas", filtros, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filtros,
        limite: String(PAGINA),
        offset: String(offset),
      })
      const res = await fetch(`/api/wms/gavetas?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar as gavetas")
      return res.json()
    },
  })

  const itens = useMemo(() => data?.itens ?? [], [data])

  const colunas = useMemo(() => {
    const mapa = new Map<string, WmsGaveta[]>()
    for (const gaveta of itens) {
      const grupo = gaveta.zona ?? "Sem zona"
      const lista = mapa.get(grupo) ?? []
      lista.push(gaveta)
      mapa.set(grupo, lista)
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([grupo, gavetas], indice) => ({
        id: grupo,
        rotulo: grupo,
        cor: CORES_ZONA[indice % CORES_ZONA.length],
        itens: gavetas,
      }))
  }, [itens])

  const zonas = useMemo(
    () => [...new Set(itens.map((g) => g.zona ?? "Sem zona"))].sort((a, b) => a.localeCompare(b)),
    [itens]
  )

  function exportarCSV() {
    exportCSV(
      "wms-gavetas",
      ["Código", "Descrição", "Zona", "Setor", "Faz sugestão", "Estoque plano", "Peças", "Metros"],
      itens.map((g) => [
        g.codigo,
        g.descricao ?? "",
        g.zona ?? "",
        g.setor ?? "",
        g.fazSugestao ?? "",
        g.estoquePlano ?? "",
        g.pecas,
        g.metros.toFixed(2),
      ])
    )
  }

  async function exportarPDF() {
    await exportPDFRelatorio({
      title: "WMS — Gavetas (endereços do ERP)",
      filename: "wms-gavetas",
      stats: {
        Gavetas: data?.total ?? itens.length,
        "Peças em aberto": itens.reduce((soma, g) => soma + g.pecas, 0),
      },
      tables: [
        {
          headers: ["Código", "Descrição", "Zona", "Setor", "Peças", "Metros"],
          rows: itens.map((g) => [
            g.codigo,
            g.descricao ?? "",
            g.zona ?? "",
            g.setor ?? "",
            g.pecas,
            g.metros.toFixed(2),
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
            Gavetas do Armazém
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Catálogo de gavetas (endereços) criado no ERP, com a ocupação das peças em aberto.
            Somente leitura — gavetas são criadas e alteradas no ERP.
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
          setFiltros({ busca: busca.trim(), zona })
        }}
      >
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search size={16} className="absolute left-2.5 top-2 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Código, descrição ou zona"
            className="pl-8"
            aria-label="Buscar gavetas"
          />
        </div>
        <select
          aria-label="Filtrar por zona"
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={zona}
          onChange={(e) => {
            setOffset(0)
            setZona(e.target.value)
            setFiltros({ busca: busca.trim(), zona: e.target.value })
          }}
        >
          <option value="">Todas as zonas</option>
          {zonas.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
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
          Nenhuma gaveta encontrada.
        </p>
      ) : modo === "kanban" ? (
        <KanbanWms
          colunas={colunas}
          vazio="Nenhuma gaveta"
          renderCard={(gaveta) => (
            <div
              key={gaveta.codigo}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {gaveta.codigo}
                </p>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {gaveta.pecas} pç
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {gaveta.descricao ?? "—"}
              </p>
              <p className="text-xs text-slate-400">
                {gaveta.setor ?? "sem setor"} · {gaveta.metros.toFixed(1)} m
              </p>
            </div>
          )}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium">Zona</th>
                <th className="px-3 py-2 font-medium">Setor</th>
                <th className="px-3 py-2 font-medium">Peças</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium">Sugestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((gaveta) => (
                <tr key={gaveta.codigo}>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    {gaveta.codigo}
                  </td>
                  <td className="px-3 py-2">{gaveta.descricao ?? "—"}</td>
                  <td className="px-3 py-2">{gaveta.zona ?? "—"}</td>
                  <td className="px-3 py-2">{gaveta.setor ?? "—"}</td>
                  <td className="px-3 py-2">{gaveta.pecas}</td>
                  <td className="px-3 py-2">{gaveta.metros.toFixed(2)}</td>
                  <td className="px-3 py-2">{gaveta.fazSugestao ?? "—"}</td>
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
