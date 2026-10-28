"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { Download, FileText, Info, Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import type { PecaEmAberto, WmsPaginado } from "@/lib/wms/tipos"
import { KanbanWms, Paginacao, VisualizacaoToggle } from "../components/kanban"
import { VoltarSeparacoes } from "../components/voltar-separacoes"
import { BotaoVoltar } from "../components/botao-voltar"

const PAGINA = 100
const CORES_ZONA = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0891b2", "#db2777"]

export default function EstoquePage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [busca, setBusca] = useState("")
  const [gaveta, setGaveta] = useState("")
  const [subLote, setSubLote] = useState("")
  const [aviso, setAviso] = useState("")
  const [cor, setCor] = useState("")
  const [produto, setProduto] = useState("")
  const [filtros, setFiltros] = useState({
    busca: "",
    gaveta: "",
    subLote: "",
    aviso: "",
    cor: "",
    produto: "",
  })
  const [offset, setOffset] = useState(0)
  const [modo, setModo] = useState<"lista" | "kanban">("lista")

  const { data, isLoading } = useQuery<WmsPaginado<PecaEmAberto>>({
    queryKey: ["wms-estoque", filtros, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filtros,
        limite: String(PAGINA),
        offset: String(offset),
      })
      const res = await fetch(`/api/wms/estoque?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar o estoque")
      return res.json()
    },
  })

  const itens = useMemo(() => data?.itens ?? [], [data])

  const colunas = useMemo(() => {
    const mapa = new Map<string, PecaEmAberto[]>()
    for (const peca of itens) {
      const zona = peca.zona ?? "Sem zona"
      const lista = mapa.get(zona) ?? []
      lista.push(peca)
      mapa.set(zona, lista)
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([zona, pecas], indice) => ({
        id: zona,
        rotulo: zona,
        cor: CORES_ZONA[indice % CORES_ZONA.length],
        itens: pecas,
      }))
  }, [itens])

  function aplicar() {
    setOffset(0)
    setFiltros({
      busca: busca.trim(),
      gaveta: gaveta.trim(),
      subLote: subLote.trim(),
      aviso: aviso.trim(),
      cor: cor.trim(),
      produto: produto.trim(),
    })
  }

  function exportarCSV() {
    exportCSV(
      "wms-estoque",
      [
        "Rolo",
        "Peça",
        "Produto",
        "Cor",
        "Situação",
        "Largura",
        "Metros",
        "Sub-lote",
        "Aviso",
        "Gaveta",
        "Zona",
        "Entrada",
      ],
      itens.map((p) => [
        p.nro_rolo,
        p.nro_peca,
        p.produto_desc ?? p.produto ?? "",
        p.cor_desc ?? p.cor ?? "",
        p.situacao_desc ?? p.situacao ?? "",
        p.largura ?? "",
        p.metros != null ? p.metros.toFixed(2) : "",
        p.sub_lote ?? "",
        p.aviso ?? "",
        p.gaveta ?? "",
        p.zona ?? "",
        p.data_entrada ?? "",
      ])
    )
  }

  async function exportarPDF() {
    await exportPDFRelatorio({
      title: "WMS — Estoque em aberto",
      filename: "wms-estoque",
      stats: {
        Peças: data?.total ?? itens.length,
        "Metros na página": itens.reduce((soma, p) => soma + (p.metros ?? 0), 0).toFixed(1),
      },
      tables: [
        {
          headers: [
            "Rolo",
            "Peça",
            "Produto",
            "Cor",
            "Largura",
            "Metros",
            "Sub-lote",
            "Gaveta",
            "Zona",
          ],
          rows: itens.map((p) => [
            p.nro_rolo,
            p.nro_peca,
            p.produto_desc ?? p.produto ?? "",
            p.cor_desc ?? p.cor ?? "",
            p.largura ?? "",
            p.metros != null ? p.metros.toFixed(2) : "",
            p.sub_lote ?? "",
            p.gaveta ?? "",
            p.zona ?? "",
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <VoltarSeparacoes />
          <BotaoVoltar />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Estoque em Aberto
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Peças sem baixa no ERP, já excluindo as reservadas/separadas por ordens ativas. A
            seleção das peças acontece na ordem de separação.
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
          aplicar()
        }}
      >
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search size={16} className="absolute left-2.5 top-2 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Rolo, peça, produto ou cor"
            className="pl-8"
            aria-label="Buscar no estoque"
            title="Busca em rolo, peça, produto (código ou descrição) e cor"
          />
          <Info className="absolute right-2 top-2 text-xs text-slate-400" size={14} aria-label="Ajuda: busca" />
        </div>
        <div className="flex items-center gap-1">
          <Input
            value={gaveta}
            onChange={(e) => setGaveta(e.target.value)}
            placeholder="Gaveta"
            aria-label="Filtrar por gaveta"
            className="w-36"
            title="Código da gaveta (endereço físico da peça)"
          />
          <span title="Código da gaveta (endereço físico da peça)" className="text-slate-400 cursor-help">
            <Info className="text-xs" size={14} />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Input
            value={subLote}
            onChange={(e) => setSubLote(e.target.value)}
            placeholder="Sub-lote"
            aria-label="Filtrar por sub-lote"
            className="w-32"
            title="Sub-lote (lote) da peça"
          />
          <span title="Sub-lote (lote) da peça" className="text-slate-400 cursor-help">
            <Info className="text-xs" size={14} />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Input
            value={aviso}
            onChange={(e) => setAviso(e.target.value)}
            placeholder="Aviso"
            aria-label="Filtrar por aviso"
            className="w-28"
            title="Aviso / marcação da peça"
          />
          <span title="Aviso / marcação da peça" className="text-slate-400 cursor-help">
            <Info className="text-xs" size={14} />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Input
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            placeholder="Cor"
            aria-label="Filtrar por cor"
            className="w-28"
            title="Código da cor da peça"
          />
          <span title="Código da cor da peça" className="text-slate-400 cursor-help">
            <Info className="text-xs" size={14} />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Input
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
            placeholder="Produto"
            aria-label="Filtrar por produto"
            className="w-32"
            title="Código do produto (busca parcial, ex.: 000029)"
          />
          <span title="Código do produto (busca parcial)" className="text-slate-400 cursor-help">
            <Info className="text-xs" size={14} />
          </span>
        </div>
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
          Nenhuma peça em aberto encontrada.
        </p>
      ) : modo === "kanban" ? (
        <KanbanWms
          colunas={colunas}
          vazio="Nenhuma peça"
          renderCard={(peca) => (
            <div
              key={`${peca.empresa}-${peca.nro_rolo}-${peca.nro_peca}`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {peca.nro_rolo}/{peca.nro_peca}
                </p>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {peca.metros != null ? `${peca.metros.toFixed(1)} m` : "—"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {peca.produto_desc ?? peca.produto ?? "—"}
              </p>
              <p className="text-xs text-slate-400">
                {peca.gaveta ?? "sem gaveta"} · {peca.cor_desc ?? peca.cor ?? "—"}
                {peca.aviso ? ` · aviso ${peca.aviso}` : ""}
              </p>
            </div>
          )}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Rolo / Peça</th>
                <th className="px-3 py-2 font-medium">Cód. Produto</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Cor / Situação</th>
                <th className="px-3 py-2 font-medium">Largura</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium">Sub-lote</th>
                <th className="px-3 py-2 font-medium">Gaveta</th>
                <th className="px-3 py-2 font-medium">Zona</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((peca) => (
                <tr key={`${peca.empresa}-${peca.nro_rolo}-${peca.nro_peca}`}>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    {peca.nro_rolo}/{peca.nro_peca}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">
                    {peca.produto ?? "—"}
                  </td>
                  <td className="px-3 py-2">{peca.produto_desc ?? peca.produto ?? "—"}</td>
                  <td className="px-3 py-2">
                    {peca.cor_desc ?? peca.cor ?? "—"}
                    <span className="block text-xs text-slate-400">
                      {peca.situacao_desc ?? peca.situacao ?? ""}
                    </span>
                  </td>
                  <td className="px-3 py-2">{peca.largura ?? "—"}</td>
                  <td className="px-3 py-2">
                    {peca.metros != null ? peca.metros.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2">{peca.sub_lote ?? "—"}</td>
                  <td className="px-3 py-2">{peca.gaveta ?? "—"}</td>
                  <td className="px-3 py-2">{peca.zona ?? "—"}</td>
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

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <VoltarSeparacoes />
      </div>
    </div>
  )
}
