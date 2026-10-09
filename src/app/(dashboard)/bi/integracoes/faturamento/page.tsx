"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Download, FileText, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { FaturamentoCard } from "./components/faturamento-card"
import { FaturamentoCharts } from "./components/faturamento-charts"
import { FaturamentoToolbar, type FiltrosToolbar } from "./components/faturamento-toolbar"
import { gerarPdfConsolidado } from "./components/faturamento-pdf"
import { ORIENTACAO_LABEL, agruparPorNf, filtrarGruposPorBusca } from "./components/utils"
import type { IntegracaoBi, ItemDetalhe, OrientacaoPdf } from "./components/types"

const ITENS_POR_PAGINA = 500

function janelasPadrao() {
  const hoje = new Date()
  const ano = hoje.getFullYear() - 1
  return {
    dataInicio: `${ano}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`,
    dataFim: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`,
  }
}

function paraItem(item: Record<string, unknown>): Omit<ItemFaturamento, "chave"> {
  return {
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
  }
}

/** Baixa a página inteira do dump da API de origem, para popular o IndexedDB. */
async function baixarTodosItens(integracaoId: number, caminho: string): Promise<Omit<ItemFaturamento, "chave">[]> {
  const lista: Omit<ItemFaturamento, "chave">[] = []
  let pagina = 1
  for (;;) {
    const res = await fetch(
      `/api/integracao/${integracaoId}/detalhe/faturamento-detalhe/${caminho}?pagina=${pagina}&por_pagina=500`
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json?.detail || json?.error || "Erro ao baixar itens")
    const itens: Record<string, unknown>[] = json.itens ?? []
    for (const item of itens) lista.push(paraItem(item))
    const paginacao = json.paginacao ?? {}
    if (pagina >= Number(paginacao.total_paginas ?? 1)) break
    pagina += 1
  }
  return lista
}

export default function FaturamentoDetalhePage() {
  const [filtros, setFiltros] = useState<FiltrosToolbar>(() => ({
    ...janelasPadrao(),
    representante: "",
    cliente: "",
    produto: "",
    nota: "",
  }))
  const [aplicados, setAplicados] = useState<FiltrosToolbar>(() => ({ ...janelasPadrao(), representante: "", cliente: "", produto: "", nota: "" }))
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState("")
  const [acao, setAcao] = useState<"idle" | "carregando" | "atualizando" | "erro">("idle")
  const [erro, setErro] = useState("")
  const [selectedNfs, setSelectedNfs] = useState<Set<string>>(() => new Set())
  const [expandedNfs, setExpandedNfs] = useState<Set<string>>(() => new Set())
  const [orientacaoPdf, setOrientacaoPdf] = useState<OrientacaoPdf>("portrait")
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const { data: integracoes } = useQuery<IntegracaoBi[]>({
    queryKey: ["bi-integracao-listar"],
    queryFn: async () => {
      const res = await fetch("/api/integracao/listar?tela=bi")
      if (!res.ok) throw new Error("Erro ao listar integrações")
      return res.json()
    },
    retry: false,
  })

  const integracao = integracoes?.find(
    (i) => /faturamento-detalhe/i.test(i.baseUrl) || /faturamento/i.test(i.nome)
  )

  const consultaFiltros = useMemo<FiltrosFaturamento>(() => {
    const f: FiltrosFaturamento = {}
    if (aplicados.dataInicio) f.data_inicio = aplicados.dataInicio
    if (aplicados.dataFim) f.data_fim = aplicados.dataFim
    if (aplicados.representante.trim()) f.representante = aplicados.representante.trim()
    if (aplicados.cliente.trim()) f.cliente = aplicados.cliente.trim()
    if (aplicados.produto.trim()) f.produto = aplicados.produto.trim()
    return f
  }, [aplicados])

  const {
    data: consulta,
    isLoading: carregandoDb,
    refetch: recarregarDb,
  } = useQuery<ConsultaFaturamento>({
    queryKey: ["faturamento-detalhe-consulta", consultaFiltros, pagina],
    queryFn: () => consultar(consultaFiltros, pagina, ITENS_POR_PAGINA),
    retry: false,
  })

  const { data: estado } = useQuery<EstadoFaturamentoDetalhe | null>({
    queryKey: ["faturamento-detalhe-estado-db"],
    queryFn: () => estadoSalvo(),
    retry: false,
  })

  const itensPagina = useMemo<ItemDetalhe[]>(() => consulta?.itens ?? [], [consulta])

  const todosGrupos = useMemo(() => agruparPorNf(itensPagina), [itensPagina])

  const grupos = useMemo(() => {
    const porNota = aplicados.nota.trim()
      ? todosGrupos.filter((g) => g.nr_nota.includes(aplicados.nota.trim()))
      : todosGrupos
    return filtrarGruposPorBusca(porNota, busca)
  }, [todosGrupos, busca, aplicados.nota])

  const resumo = consulta?.resumo

  const totaisDaPagina = useMemo(
    () => ({
      faturamento: grupos.reduce((soma, g) => soma + g.faturamento, 0),
      itens: grupos.reduce((soma, g) => soma + g.totalItens, 0),
      metros: grupos.reduce((soma, g) => soma + g.totalMetros, 0),
      peso: grupos.reduce((soma, g) => soma + g.totalPeso, 0),
    }),
    [grupos]
  )

  const paginacao = consulta?.paginacao
  const temBase = estado?.carga_completa ?? false

  function aplicarFiltros() {
    setAplicados(filtros)
    setPagina(1)
    setSelectedNfs(new Set())
    setExpandedNfs(new Set())
  }

  function limparFiltros() {
    const padrao: FiltrosToolbar = { ...janelasPadrao(), representante: "", cliente: "", produto: "", nota: "" }
    setFiltros(padrao)
    setAplicados(padrao)
    setBusca("")
    setPagina(1)
    setSelectedNfs(new Set())
    setExpandedNfs(new Set())
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
      if (!res.ok) throw new Error(json?.detail || json?.error || "Erro ao carregar a base")
      const lista = await baixarTodosItens(integracao.id, "")
      await limpar()
      await substituirBase(lista)
      await salvarEstado({
        carga_completa: true,
        contagem: Number(json.contagem || lista.length),
        ultima_data: json.ultima_data ?? null,
        janela_inicio: filtros.dataInicio,
        janela_fim: filtros.dataFim,
      })
      setPagina(1)
      setSelectedNfs(new Set())
      setExpandedNfs(new Set())
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
      setErro("Integração de faturamento não encontrada. Cadastre-a em Admin → Integrações.")
      return
    }
    const st = await estadoSalvo()
    if (!st?.carga_completa) {
      setErro("Carregue a base completa antes de atualizar (botão Carregar base).")
      return
    }
    setAcao("atualizando")
    try {
      const res = await fetch(`/api/integracao/${integracao.id}/detalhe/faturamento-detalhe/sync`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.detail || json?.error || "Erro ao atualizar")
      const novos = await baixarTodosItens(integracao.id, "")
      await mergeDelta(novos, filtros.dataInicio, filtros.dataFim)
      await salvarEstado({
        carga_completa: true,
        contagem: Number(json.contagem || novos.length),
        ultima_data: json.ultima_data ?? st.ultima_data,
        janela_inicio: filtros.dataInicio,
        janela_fim: filtros.dataFim,
      })
      await recarregarDb()
      setAcao("idle")
    } catch (err) {
      setAcao("erro")
      setErro(err instanceof Error ? err.message : "Erro ao atualizar")
    }
  }

  function exportarCsv() {
    if (!itensPagina.length) return
    const colunas: (keyof ItemDetalhe)[] = [
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
    ]
    const linhas = itensPagina.map((linha) =>
      colunas
        .map((coluna) => {
          const valor = linha[coluna]
          if (valor === null || valor === undefined) return ""
          return `"${String(valor).replace(/"/g, '""')}"`
        })
        .join(";")
    )
    const blob = new Blob([[colunas.join(";"), ...linhas].join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `faturamento_detalhe_${filtros.dataInicio}_${filtros.dataFim}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleSelecaoNf = useCallback((chaveNf: string) => {
    setSelectedNfs((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chaveNf)) proximo.delete(chaveNf)
      else proximo.add(chaveNf)
      return proximo
    })
  }, [])

  const toggleExpandirNf = useCallback((chaveNf: string) => {
    setExpandedNfs((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chaveNf)) proximo.delete(chaveNf)
      else proximo.add(chaveNf)
      return proximo
    })
  }, [])

  const selecionadas = useMemo(() => [...selectedNfs], [selectedNfs])

  function limparSelecao() {
    setSelectedNfs(new Set())
  }

  async function baixarPdfSelecionadas() {
    if (!selecionadas.length) return
    setGerandoPdf(true)
    setErro("")
    try {
      await gerarPdfConsolidado(grupos, selecionadas, orientacaoPdf)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar PDF")
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/bi/integracoes"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Faturamento — Detalhe das notas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cache local no IndexedDB —{" "}
              {integracao ? integracao.nome : "integração não encontrada"} · última carga:{" "}
              {estado?.ultima_data ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={carregarBase} disabled={acao !== "idle"} className="gap-2">
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
            disabled={!itensPagina.length}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}

      <FaturamentoToolbar
        filtros={filtros}
        onChange={(patch) => setFiltros((atual) => ({ ...atual, ...patch }))}
        busca={busca}
        onBuscaChange={setBusca}
        onLimpar={limparFiltros}
        onAplicar={aplicarFiltros}
        totalNotas={grupos.length}
      />

      {resumo && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Itens no filtro: <strong>{resumo.itens.toLocaleString("pt-BR")}</strong>
          </span>
          <span>
            Notas: <strong>{resumo.notas.toLocaleString("pt-BR")}</strong>
          </span>
          <span>
            Pedidos: <strong>{resumo.pedidos.toLocaleString("pt-BR")}</strong>
          </span>
        </div>
      )}

      <FaturamentoCharts
        grupos={grupos}
        faturamentoTotal={totaisDaPagina.faturamento}
        totalItens={totaisDaPagina.itens}
        totalNotas={grupos.length}
        totalMetros={totaisDaPagina.metros}
        totalPeso={totaisDaPagina.peso}
      />

      {selecionadas.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm dark:border-teal-900 dark:bg-teal-950">
          <span className="text-teal-900 dark:text-teal-100">
            <strong>{selecionadas.length}</strong>{" "}
            {selecionadas.length === 1 ? "nota selecionada" : "notas selecionadas"}
          </span>
          <select
            aria-label="Orientação do PDF"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={orientacaoPdf}
            onChange={(e) => setOrientacaoPdf(e.target.value as OrientacaoPdf)}
          >
            {Object.entries(ORIENTACAO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                PDF {rotulo}
              </option>
            ))}
          </select>
          <Button type="button" onClick={baixarPdfSelecionadas} disabled={gerandoPdf} className="gap-2">
            <FileText className="w-4 h-4" />
            {gerandoPdf ? "Gerando..." : "Gerar PDF das selecionadas"}
          </Button>
          <Button type="button" variant="ghost" onClick={limparSelecao}>
            Limpar seleção
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {grupos.map((grupo) => (
          <FaturamentoCard
            key={grupo.chave_nf}
            grupo={grupo}
            selecionado={selectedNfs.has(grupo.chave_nf)}
            expandido={expandedNfs.has(grupo.chave_nf)}
            onSelecionar={toggleSelecaoNf}
            onExpandir={toggleExpandirNf}
            orientacao={orientacaoPdf}
          />
        ))}
        {grupos.length === 0 && !carregandoDb && (
          <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Nenhuma nota encontrada. Carregue a base ou ajuste os filtros.
          </p>
        )}
      </div>

      {paginacao && paginacao.total_paginas > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 dark:text-slate-400">
            Página {paginacao.pagina} de {paginacao.total_paginas} —{" "}
            {paginacao.total.toLocaleString("pt-BR")} itens
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
              disabled={pagina >= paginacao.total_paginas}
              onClick={() => setPagina((p) => Math.min(paginacao.total_paginas, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}