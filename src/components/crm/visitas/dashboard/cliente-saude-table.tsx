"use client"

import { useMemo, useState } from "react"
import { FileDown, FileSpreadsheet, FileText, Loader2, Search } from "lucide-react"
import {
  exportCSV,
  exportMarkdown,
  exportPDFRelatorio,
} from "@/lib/export-utils"
import {
  filtrarClientesSaude,
  labelStatusOportunidade,
  type ClienteSaude,
  type FiltrosSaude,
} from "@/lib/crm/visitas-saude"
import { DiferencaBadge, ScoreBadge } from "./score-badges"

const STATUS_VISITA_LABELS: Record<string, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
}

const TIPO_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  VIDEO: "Vídeo",
  TELEFONE: "Telefone",
}

const CABECALHOS = [
  "Nome",
  "Tipo",
  "Documento",
  "Segmento",
  "Porte",
  "Responsáveis",
  "Visitas realizadas",
  "Visitas agendadas",
  "Visitas canceladas",
  "Ata/Relato",
  "Check-in",
  "Contato",
  "Proposta",
  "Oportunidade",
  "Status oportunidade",
  "Valor estimado",
  "Probabilidade média",
  "Pedidos de venda",
  "Valor pedidos",
  "Faturamentos",
  "Valor faturado",
  "Score esforço",
  "Score engajamento",
  "Diferença",
] as const

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatarData(valor: string | null): string {
  if (!valor) return "—"
  const data = new Date(`${valor}T12:00:00`)
  return isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR")
}

function opcoesUnicas(valores: string[]): string[] {
  return Array.from(new Set(valores.filter((valor) => valor.length > 0))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  )
}

function classesSelect(): string {
  return "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
}

export function ClienteSaudeTable({
  linhas,
  isLoading,
  onSelecionar,
}: {
  linhas: ClienteSaude[]
  isLoading?: boolean
  onSelecionar: (linha: ClienteSaude) => void
}) {
  const [busca, setBusca] = useState("")
  const [segmento, setSegmento] = useState("")
  const [porte, setPorte] = useState("")
  const [responsavel, setResponsavel] = useState("")
  const [statusVisita, setStatusVisita] = useState("")
  const [statusOportunidade, setStatusOportunidade] = useState("")
  const [tipoVisita, setTipoVisita] = useState("")
  const [apenasAlertas, setApenasAlertas] = useState(false)

  const filtros = useMemo<FiltrosSaude>(
    () => ({
      busca,
      segmento,
      porte,
      responsavel,
      statusVisita,
      statusOportunidade,
      tipoVisita,
      apenasAlertas,
    }),
    [
      busca,
      segmento,
      porte,
      responsavel,
      statusVisita,
      statusOportunidade,
      tipoVisita,
      apenasAlertas,
    ]
  )

  const filtradas = useMemo(() => filtrarClientesSaude(linhas, filtros), [linhas, filtros])

  const opcoes = useMemo(
    () => ({
      segmentos: opcoesUnicas(linhas.map((linha) => linha.segmento ?? "")),
      portes: opcoesUnicas(linhas.map((linha) => linha.porte ?? "")),
      responsaveis: opcoesUnicas(linhas.flatMap((linha) => linha.responsaveis)),
      statusVisitas: opcoesUnicas(linhas.flatMap((linha) => linha.statusVisitas)),
      statusOportunidades: opcoesUnicas(linhas.flatMap((linha) => linha.statusOportunidades)),
      tiposVisita: opcoesUnicas(linhas.flatMap((linha) => linha.tiposVisita)),
    }),
    [linhas]
  )

  const dadosExportacao = filtradas.map((linha) => [
    linha.nome,
    linha.tipo,
    linha.documento,
    linha.segmento,
    linha.porte,
    linha.responsaveis.join("; "),
    linha.visitasRealizadas,
    linha.visitasAgendadas,
    linha.visitasCanceladas,
    linha.visitasComRelato > 0 ? "Sim" : "Não",
    linha.visitasComCheckIn > 0 ? "Sim" : "Não",
    linha.temContato ? "Sim" : "Não",
    linha.temProposta ? "Sim" : "Não",
    linha.temOportunidade ? "Sim" : "Não",
    labelStatusOportunidade(linha.statusOportunidadeDominante),
    formatarMoeda(linha.valorEstimadoTotal),
    `${linha.probabilidadeMedia}%`,
    linha.pedidosVenda,
    formatarMoeda(linha.valorPedidosVenda),
    linha.faturamentos,
    formatarMoeda(linha.valorFaturamento),
    `${linha.scoreEsforco}/100`,
    `${linha.scoreEngajamento}/100`,
    `${linha.diferenca > 0 ? "+" : ""}${linha.diferenca}`,
  ])

  const estatisticas = {
    Registros: filtradas.length,
    "Muito esforço, pouco retorno": filtradas.filter((linha) => linha.diferenca >= 20).length,
    "Cliente engajado, pouco esforço": filtradas.filter((linha) => linha.diferenca <= -20).length,
    Equilibrados: filtradas.filter((linha) => Math.abs(linha.diferenca) < 20).length,
  }

  function exportarCSV() {
    exportCSV("saude-prospeccao-visitas", [...CABECALHOS], dadosExportacao)
  }

  function exportarMarkdown() {
    exportMarkdown({
      filename: "saude-prospeccao-visitas",
      title: "Saúde da prospecção — visitas",
      headers: [...CABECALHOS],
      rows: dadosExportacao,
      stats: estatisticas,
      period: "Ano corrente",
    })
  }

  function exportarPDF() {
    void exportPDFRelatorio({
      title: "Saúde da prospecção — visitas",
      period: "Ano corrente",
      stats: estatisticas,
      tables: [{ headers: [...CABECALHOS], rows: dadosExportacao }],
      filename: "saude-prospeccao-visitas",
      orientation: "landscape",
    })
  }

  return (
    <section
      id="saude-prospeccao"
      className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Saúde da prospecção por cliente/pessoa
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Esforço comercial × engajamento do cliente — visitas do ano corrente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet size={14} aria-hidden="true" />
            CSV
          </button>
          <button
            type="button"
            onClick={exportarPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileDown size={14} aria-hidden="true" />
            PDF
          </button>
          <button
            type="button"
            onClick={exportarMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileText size={14} aria-hidden="true" />
            MD
          </button>
        </div>
      </div>

      <div className="grid gap-2 border-b border-slate-100 p-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(estatisticas).map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{rotulo}</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 border-b border-slate-100 p-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            aria-label="Buscar cliente ou pessoa"
            placeholder="Buscar cliente ou pessoa"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
        <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Segmento
          <select value={segmento} onChange={(e) => setSegmento(e.target.value)} className={classesSelect()}>
            <option value="">Todos</option>
            {opcoes.segmentos.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Porte
          <select value={porte} onChange={(e) => setPorte(e.target.value)} className={classesSelect()}>
            <option value="">Todos</option>
            {opcoes.portes.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Responsável
          <select
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className={classesSelect()}
          >
            <option value="">Todos</option>
            {opcoes.responsaveis.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Status da visita
          <select
            value={statusVisita}
            onChange={(e) => setStatusVisita(e.target.value)}
            className={classesSelect()}
          >
            <option value="">Todos</option>
            {opcoes.statusVisitas.map((valor) => (
              <option key={valor} value={valor}>
                {STATUS_VISITA_LABELS[valor] ?? valor}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Status da oportunidade
          <select
            value={statusOportunidade}
            onChange={(e) => setStatusOportunidade(e.target.value)}
            className={classesSelect()}
          >
            <option value="">Todos</option>
            {opcoes.statusOportunidades.map((valor) => (
              <option key={valor} value={valor}>
                {labelStatusOportunidade(valor)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Tipo de visita
          <select
            value={tipoVisita}
            onChange={(e) => setTipoVisita(e.target.value)}
            className={classesSelect()}
          >
            <option value="">Todos</option>
            {opcoes.tiposVisita.map((valor) => (
              <option key={valor} value={valor}>
                {TIPO_LABELS[valor] ?? valor}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-1 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={apenasAlertas}
            onChange={(event) => setApenasAlertas(event.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
          />
          Só alertas (diferença ≥ 20)
        </label>
      </div>

      {isLoading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
          Carregando saúde da prospecção...
        </div>
      ) : filtradas.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhum cliente/pessoa encontrado com os filtros atuais.
        </p>
      ) : (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1600px] text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {[
                  "Nome",
                  "Documento",
                  "Segmento/Porte",
                  "Visitas R/A/C",
                  "Última visita",
                  "Ata",
                  "Check-in",
                  "Contato",
                  "Proposta",
                  "Oportunidade",
                  "Status",
                  "Valor estimado",
                  "Prob.",
                  "Pedidos",
                  "Faturado",
                  "Esforço",
                  "Engajamento",
                  "Diferença",
                ].map((coluna) => (
                  <th
                    key={coluna}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400"
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtradas.map((linha) => (
                <tr key={`${linha.tipo}-${linha.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onSelecionar(linha)}
                      className="text-left font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {linha.nome}
                    </button>
                    <p className="text-[10px] text-slate-400 capitalize">{linha.tipo}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.documento ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.segmento ?? "—"}
                    {linha.porte ? ` / ${linha.porte}` : ""}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-700 dark:text-slate-200">
                    {linha.visitasRealizadas}/{linha.visitasAgendadas}/{linha.visitasCanceladas}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                    {formatarData(linha.ultimaVisita)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        linha.visitasComRelato > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }
                    >
                      {linha.visitasComRelato > 0 ? `Sim (${linha.visitasComRelato})` : "Não"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.visitasComCheckIn > 0 ? `Sim (${linha.visitasComCheckIn})` : "Não"}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.temContato ? "Sim" : "Não"}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.temProposta ? "Sim" : "Não"}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.temOportunidade ? "Sim" : "Não"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                    {labelStatusOportunidade(linha.statusOportunidadeDominante)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-200">
                    {formatarMoeda(linha.valorEstimadoTotal)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.probabilidadeMedia}%
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.pedidosVenda} · {formatarMoeda(linha.valorPedidosVenda)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                    {linha.faturamentos} · {formatarMoeda(linha.valorFaturamento)}
                  </td>
                  <td className="px-3 py-2">
                    <ScoreBadge rotulo="Esforço" valor={linha.scoreEsforco} />
                  </td>
                  <td className="px-3 py-2">
                    <ScoreBadge rotulo="Engajamento" valor={linha.scoreEngajamento} />
                  </td>
                  <td className="px-3 py-2">
                    <DiferencaBadge valor={linha.diferenca} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
