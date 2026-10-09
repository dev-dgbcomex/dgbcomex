"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  consultar,
  estadoSalvo,
  limpar,
  mergeDelta,
  salvarEstado,
  substituirBase,
  type ConsultaFaturamento,
  type EstadoFaturamentoDetalhe,
  type FiltrosFaturamento,
  type ItemFaturamento,
} from "@/lib/bi/faturamento-detalhe-db"

interface IntegracaoBi {
  id: number
  nome: string
  baseUrl: string
  tipoAuth: string
}

const ORDEM_CAMPOS = [
  "data_nota",
  "nr_nota",
  "empresa",
  "pedido",
  "item",
  "cliente",
  "nome_cliente",
  "cod_produto",
  "romaneio",
  "representante",
  "representante_codigo",
  "metros",
  "vr_unitario",
  "vr_total",
  "acres_desc",
  "peso",
  "vr_nota",
] as const

export default function FaturamentoDetalhePage() {
  const hoje = new Date()
  const anoInicio = hoje.getFullYear() - 1
  const [dataInicio, setDataInicio] = useState(`${anoInicio}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`)
  const [dataFim, setDataFim] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`
  )
  const [representante, setRepresentante] = useState("")
  const [cliente, setCliente] = useState("")
  const [produto, setProduto] = useState("")
  const [pagina, setPagina] = useState(1)
  const [acao, setAcao] = useState<"carregando" | "atualizando" | "idle" | "erro">("idle")
  const [erro, setErro] = useState<string>("")

  const { data: integracoes } = useQuery<IntegracaoBi[]>({
    queryKey: ["bi-integracao-listar"],
    queryFn: async () => {
      const res = await fetch("/api/integracao/listar?tela=bi")
      if (!res.ok) throw new Error("erro ao listar integrações")
      return res.json()
    },
    retry: false,
  })

  const integracao = integracoes?.find(
    (i) => /faturamento-detalhe/i.test(i.baseUrl) || /faturamento/i.test(i.nome)
  )

  const filtros = useMemo<FiltrosFaturamento>(() => {
    const f: FiltrosFaturamento = {}
    if (dataInicio) f.data_inicio = dataInicio
    if (dataFim) f.data_fim = dataFim
    if (representante.trim()) f.representante = representante.trim()
    if (cliente.trim()) f.cliente = cliente.trim()
    if (produto.trim()) f.produto = produto.trim()
    return f
  }, [dataInicio, dataFim, representante, cliente, produto])

  const {
    data: consulta,
    isLoading: carregandoDb,
    refetch: recarregarDb,
  } = useQuery<ConsultaFaturamento>({
    queryKey: ["faturamento-detalhe-consulta", filtros, pagina],
    queryFn: async () => {
      const res = await consultar(filtros, pagina, 100)
      return res
    },
    retry: false,
    enabled: true,
  })

  const { data: estado } = useQuery<EstadoFaturamentoDetalhe | null>({
    queryKey: ["faturamento-detalhe-estado-db"],
    queryFn: async () => estadoSalvo(),
    retry: false,
    enabled: true,
  })

  function limparFiltros() {
    setDataInicio(`${anoInicio}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`)
    setDataFim(
      `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`
    )
    setRepresentante("")
    setCliente("")
    setProduto("")
    setPagina(1)
  }

  async function carregarBase() {
    setErro("")
    if (!integracao) {
      setErro("Integração de faturamento não encontrada. Cadastre-a em Admin → Integrações.")
      return
    }
    setAcao("carregando")
    try {
      const res = await fetch(`/api/integracao/${integracao.id}/detalhe/faturamento-detalhe/carga`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.detail || json?.error || "Erro ao carregar a base")
      }
      const estado: EstadoFaturamentoDetalhe = {
        carga_completa: true,
        contagem: Number(json.contagem || 0),
        ultima_data: json.ultima_data ?? null,
        janela_inicio: dataInicio,
        janela_fim: dataFim,
      }
      // Buscar todos os itens da API (primeira página grande) para encher o IDB
      const lista: Omit<ItemFaturamento, "chave">[] = []
      let paginaApi = 1
      while (true) {
        const r = await fetch(
          `/api/integracao/${integracao.id}/detalhe/faturamento-detalhe?pagina=${paginaApi}&por_pagina=500`
        )
        const j = await r.json()
        if (!r.ok) throw new Error("Erro ao baixar itens")
        const itens: Record<string, unknown>[] = j.itens || []
        for (const item of itens) {
          lista.push({
            empresa: String(item.empresa ?? ""),
            pedido: String(item.pedido ?? ""),
            item: Number(item.item ?? 0),
            nr_nota: String(item.nr_nota ?? ""),
            data_nota: String(item.data_nota ?? ""),
            cliente: String(item.cliente ?? ""),
            nome_cliente: String(item.nome_cliente ?? ""),
            cod_produto: String(item.cod_produto ?? ""),
            metros: Number(item.metros ?? 0),
            vr_unitario: Number(item.vr_unitario ?? 0),
            vr_total: Number(item.vr_total ?? 0),
            acres_desc: Number(item.acres_desc ?? 0),
            peso: Number(item.peso ?? 0),
            vr_nota: Number(item.vr_nota ?? 0),
            romaneio: String(item.romaneio ?? ""),
            representante_codigo: String(item.representante_codigo ?? ""),
            representante: String(item.representante ?? ""),
          })
        }
        const pag = j.paginacao || {}
        if (paginaApi >= Number(pag.total_paginas || 1)) break
        paginaApi++
      }
      await limpar()
      await substituirBase(lista)
      await salvarEstado(estado)
      setPagina(1)
      await recarregarDb()
      setAcao("idle")
    } catch (err) {
      setAcao("erro")
      setErro(err instanceof Error ? err.message : "Erro ao carregar a base")
    }
  }

  async function atualizarDelta() {
    setErro("")
    if (!integracao) {
      setErro("Integração de faturamento não encontrada.")
      return
    }
    const st = await estadoSalvo()
    if (!st?.carga_completa) {
      setErro("É preciso carregar a base completa antes de atualizar (botão Carregar base).")
      return
    }
    setAcao("atualizando")
    try {
      const res = await fetch(`/api/integracao/${integracao.id}/detalhe/faturamento-detalhe/sync`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.detail || json?.error || "Erro ao atualizar")
      }
      const novos: Omit<ItemFaturamento, "chave">[] = []
      let paginaApi = 1
      while (true) {
        const r = await fetch(
          `/api/integracao/${integracao.id}/detalhe/faturamento-detalhe?pagina=${paginaApi}&por_pagina=500`
        )
        const j = await r.json()
        if (!r.ok) throw new Error("Erro ao baixar itens")
        const itens: Record<string, unknown>[] = j.itens || []
        for (const item of itens) {
          novos.push({
            empresa: String(item.empresa ?? ""),
            pedido: String(item.pedido ?? ""),
            item: Number(item.item ?? 0),
            nr_nota: String(item.nr_nota ?? ""),
            data_nota: String(item.data_nota ?? ""),
            cliente: String(item.cliente ?? ""),
            nome_cliente: String(item.nome_cliente ?? ""),
            cod_produto: String(item.cod_produto ?? ""),
            metros: Number(item.metros ?? 0),
            vr_unitario: Number(item.vr_unitario ?? 0),
            vr_total: Number(item.vr_total ?? 0),
            acres_desc: Number(item.acres_desc ?? 0),
            peso: Number(item.peso ?? 0),
            vr_nota: Number(item.vr_nota ?? 0),
            romaneio: String(item.romaneio ?? ""),
            representante_codigo: String(item.representante_codigo ?? ""),
            representante: String(item.representante ?? ""),
          })
        }
        const pag = j.paginacao || {}
        if (paginaApi >= Number(pag.total_paginas || 1)) break
        paginaApi++
      }
      await mergeDelta(novos, dataInicio, dataFim)
      const estadoNovo: EstadoFaturamentoDetalhe = {
        carga_completa: true,
        contagem: Number(json.contagem || novos.length),
        ultima_data: json.ultima_data ?? st.ultima_data,
        janela_inicio: dataInicio,
        janela_fim: dataFim,
      }
      await salvarEstado(estadoNovo)
      await recarregarDb()
      setAcao("idle")
    } catch (err) {
      setAcao("erro")
      setErro(err instanceof Error ? err.message : "Erro ao atualizar")
    }
  }

  function exportarCsv() {
    if (!consulta?.itens.length) return
    const cabe = ORDEM_CAMPOS.join(";")
    const linhas = consulta.itens.map((linha) => {
      const partes = ORDEM_CAMPOS.map((chave) => {
        const valor = (linha as Record<string, unknown>)[chave]
        if (valor === null || valor === undefined) return ""
        const str = String(valor)
        return `"${str.replace(/"/g, '""')}"`
      })
      return partes.join(";")
    })
    const csv = [cabe, ...linhas].join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `faturamento_detalhe_${dataInicio}_${dataFim}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const temBase = estado?.carga_completa ?? false

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link href="/bi/integracoes">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Faturamento — Detalhe dos itens de nota
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Base de 12 meses no Neon + cache IndexedDB • {integracao ? integracao.nome : "integração não encontrada"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={carregarBase}
            disabled={acao !== "idle"}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${acao === "carregando" ? "animate-spin" : ""}`} />
            Carregar base
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={atualizarDelta}
            disabled={acao !== "idle" || !temBase}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${acao === "atualizando" ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportarCsv}
            disabled={!consulta?.itens.length}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="flex flex-col gap-1">
            <Label htmlFor="data-inicio">Data inicial</Label>
            <Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="data-fim">Data final</Label>
            <Input id="data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="representante">Representante</Label>
            <Input id="representante" value={representante} onChange={(e) => setRepresentante(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cliente">Cliente</Label>
            <Input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="produto">Produto</Label>
            <Input id="produto" value={produto} onChange={(e) => setProduto(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setPagina(1); recarregarDb(); }} className="gap-2">
              <Search className="w-4 h-4" />
              Aplicar filtros
            </Button>
            <Button type="button" variant="ghost" onClick={limparFiltros}>Limpar</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Itens: <strong>{consulta?.resumo.itens.toLocaleString("pt-BR")}</strong></span>
          <span>Notas: <strong>{consulta?.resumo.notas.toLocaleString("pt-BR")}</strong></span>
          <span>Pedidos: <strong>{consulta?.resumo.pedidos.toLocaleString("pt-BR")}</strong></span>
          <span>Metros: <strong>{consulta?.resumo.metros.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <span>Peso: <strong>{consulta?.resumo.peso.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <span>Faturamento: <strong>{consulta?.resumo.faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></span>
          <span>Última atualização (DB): <strong>{estado?.ultima_data ?? "—"}</strong></span>
        </div>
        {erro && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{erro}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nota</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pedido/Item</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Romaneio</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Representante</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Qtd (m)</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Vlr. unit.</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Vlr. total</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acres/Desc</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(consulta?.itens || []).map((linha, idx) => {
                const chave = `${linha.empresa}|${linha.pedido}|${linha.item}|${linha.nr_nota}|${idx}`
                return (
                  <tr key={chave} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {linha.data_nota}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-slate-900 dark:text-slate-100">
                      {linha.empresa}-{linha.nr_nota}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {linha.pedido}/{linha.item}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 max-w-[220px] truncate" title={linha.nome_cliente}>
                      {linha.cliente} — {linha.nome_cliente}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {linha.cod_produto}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {linha.romaneio}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 max-w-[220px] truncate" title={linha.representante}>
                      {linha.representante}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-slate-600 dark:text-slate-300">
                      {Number(linha.metros).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-slate-600 dark:text-slate-300">
                      {Number(linha.vr_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-slate-600 dark:text-slate-300">
                      {Number(linha.vr_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-slate-600 dark:text-slate-300">
                      {Number(linha.acres_desc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-slate-600 dark:text-slate-300">
                      {Number(linha.peso).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
              {consulta && consulta.itens.length === 0 && !carregandoDb && (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nenhum item encontrado. Carregue a base ou ajuste os filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {consulta && consulta.paginacao.total_paginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-3 py-3 text-xs">
            <span>
              Página {consulta.paginacao.pagina} de {consulta.paginacao.total_paginas} • {consulta.paginacao.total.toLocaleString("pt-BR")} itens
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina >= consulta.paginacao.total_paginas}
                onClick={() => setPagina((p) => Math.min(consulta.paginacao.total_paginas, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}