"use client"

import { useMemo, useState, type CSSProperties } from "react"
import { FileDown, FileSpreadsheet, FileText, Loader2, Search } from "lucide-react"
import { exportCSV, exportMarkdown, exportPDFRelatorio } from "@/lib/export-utils"
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"
import {
  calcularConversao,
  classificarAlerta,
  filtrarClientesSaude,
  formatarPontos,
  labelStatusOportunidade,
  obterEngajamento,
  type ClienteSaude,
  type FiltrosSaude,
} from "@/lib/crm/acoes-prospeccao-saude"
import { InfoButton } from "@/components/ui/info-button"
import { saudeProspeccaoAcoesInfo } from "@/lib/info-content/crm"
import { AlertaListaModal } from "./alerta-lista-modal"
import { AcoesRacModal } from "./acoes-rac-modal"
import { ConversaoBadge } from "./conversao-badge"
import { ConversaoModal } from "./conversao-modal"
import { EngajamentoBadge } from "./engajamento-badge"
import { ScoreBadge } from "./score-badges"
import { ScoreDetalheModal, type SelecaoScore } from "./score-detalhe-modal"

const STATUS_ACAO_LABELS: Record<string, string> = {
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
  "Ações realizadas",
  "Ações agendadas",
  "Ações canceladas",
  "Última ação",
  "Próxima ação",
  "Itens de engajamento",
  "Status oportunidade",
  "Valor estimado",
  "Probabilidade média",
  "Conversão",
  "Esforço",
  "Engajamento",
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
  onVerItens,
}: {
  linhas: ClienteSaude[]
  isLoading?: boolean
  onSelecionar: (linha: ClienteSaude) => void
  onVerItens: (linha: ClienteSaude) => void
}) {
  const [busca, setBusca] = useState("")
  const [segmento, setSegmento] = useState("")
  const [porte, setPorte] = useState("")
  const [responsavel, setResponsavel] = useState("")
  const [statusAcao, setStatusAcao] = useState("")
  const [statusOportunidade, setStatusOportunidade] = useState("")
  const [tipoAcao, setTipoAcao] = useState("")
  const [apenasAlertas, setApenasAlertas] = useState(false)
  const [alertaSelecionado, setAlertaSelecionado] = useState<{
    titulo: string
    descricao: string
    linhas: ClienteSaude[]
  } | null>(null)
  const [conversaoSelecionada, setConversaoSelecionada] = useState<ClienteSaude | null>(null)
  const [acoesSelecionadas, setAcoesSelecionadas] = useState<ClienteSaude | null>(null)
  const [selecaoScore, setSelecaoScore] = useState<SelecaoScore | null>(null)

  const filtros = useMemo<FiltrosSaude>(
    () => ({
      busca,
      segmento,
      porte,
      responsavel,
      statusAcao,
      statusOportunidade,
      tipoAcao,
      apenasAlertas,
    }),
    [
      busca,
      segmento,
      porte,
      responsavel,
      statusAcao,
      statusOportunidade,
      tipoAcao,
      apenasAlertas,
    ]
  )

  const filtradas = useMemo(() => filtrarClientesSaude(linhas, filtros), [linhas, filtros])

  const opcoes = useMemo(
    () => ({
      segmentos: opcoesUnicas(linhas.map((linha) => linha.segmento ?? "")),
      portes: opcoesUnicas(linhas.map((linha) => linha.porte ?? "")),
      responsaveis: opcoesUnicas(linhas.flatMap((linha) => linha.responsaveis)),
      statusAcoes: opcoesUnicas(linhas.flatMap((linha) => linha.statusAcoes)),
      statusOportunidades: opcoesUnicas(linhas.flatMap((linha) => linha.statusOportunidades)),
      tiposAcao: opcoesUnicas(linhas.flatMap((linha) => linha.tiposAcao)),
    }),
    [linhas]
  )

  const dadosExportacao = filtradas.map((linha) => {
    const { resumo } = obterEngajamento(linha)
    return [
      linha.nome,
      linha.tipo,
      linha.documento,
      linha.segmento,
      linha.porte,
      linha.responsaveis.join("; "),
      linha.acoesRealizadas,
      linha.acoesAgendadas,
      linha.acoesCanceladas,
      formatarData(linha.ultimaAcao),
      formatarData(linha.proximaAcao),
      `${resumo.quantidade}/${resumo.total} (${resumo.porcentagem}%)`,
      labelStatusOportunidade(linha.statusOportunidadeDominante),
      formatarMoeda(linha.valorEstimadoTotal),
      `${linha.probabilidadeMedia}%`,
      `${calcularConversao(linha).percentual}% (${linha.pedidosVenda} pedidos / ${linha.faturamentos} faturamentos)`,
      `${formatarPontos(linha.scoreEsforco)}%`,
      `${formatarPontos(linha.scoreEngajamento)}%`,
    ]
  })

  const aec = filtradas.filter((linha) => classificarAlerta(linha).rotulo === "AEC")
  const engajados = filtradas.filter((linha) => classificarAlerta(linha).rotulo === "Engajados")
  const bec = filtradas.filter((linha) => classificarAlerta(linha).rotulo === "BEC")

  const estatisticas = {
    AEC: aec.length,
    Engajados: engajados.length,
    BEC: bec.length,
  }

  const cartoes = [
    {
      rotulo: "AEC",
      valor: aec.length,
      info: saudeProspeccaoAcoesInfo.aec,
      titulo: "Alto Esforço comercial",
      descricao: "Esforço acima de 45% com engajamento de até 30%",
      linhas: aec,
    },
    {
      rotulo: "Engajados",
      valor: engajados.length,
      info: saudeProspeccaoAcoesInfo.engajados,
      titulo: "Cliente puxando o resultado",
      descricao: "Engajamento acima de 30%, independente do esforço",
      linhas: engajados,
    },
    {
      rotulo: "BEC",
      valor: bec.length,
      info: saudeProspeccaoAcoesInfo.bec,
      titulo: "Baixo Esforço comercial",
      descricao: "Esforço de até 45% com engajamento de até 30%",
      linhas: bec,
    },
  ]

  function exportarCSV() {
    exportCSV("saude-prospeccao-acoes-prospeccao", [...CABECALHOS], dadosExportacao)
  }

  function exportarMarkdown() {
    exportMarkdown({
      filename: "saude-prospeccao-acoes-prospeccao",
      title: "Saúde da prospecção — ações de prospecção",
      headers: [...CABECALHOS],
      rows: dadosExportacao,
      stats: estatisticas,
      period: "Ano corrente",
    })
  }

  function exportarPDF() {
    void exportPDFRelatorio({
      title: "Saúde da prospecção — ações de prospecção",
      period: "Ano corrente",
      stats: estatisticas,
      tables: [{ headers: [...CABECALHOS], rows: dadosExportacao }],
      filename: "saude-prospeccao-acoes-prospeccao",
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
          <div className="flex items-center">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Saúde da prospecção por cliente/pessoa
            </h2>
            <InfoButton content={saudeProspeccaoAcoesInfo.tabela} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Esforço comercial × engajamento do cliente — ações de prospecção do ano corrente
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

      <div className="grid gap-2 border-b border-slate-100 p-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
        {cartoes.map((cartao) => {
          const estilo = corPorTitulo(cartao.rotulo)
          const Icone = iconePorTitulo(cartao.rotulo)
          const estiloCss = {
            "--card-fundo": estilo.fundoClaro,
            "--card-fundo-escuro": estilo.fundoEscuro,
            "--card-borda": estilo.borda,
            "--card-realce": estilo.cor,
          } as CSSProperties
          const classes =
            "cursor-pointer rounded-lg border border-[color:var(--card-borda)] bg-[image:var(--card-fundo)] p-3 outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-[image:var(--card-fundo-escuro)] dark:focus-visible:ring-blue-400"

          const conteudo = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-md"
                    style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
                    aria-hidden="true"
                  >
                    <Icone size={12} />
                  </span>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {cartao.rotulo}
                  </p>
                </div>
                <span
                  onClick={(evento) => evento.stopPropagation()}
                  onKeyDown={(evento) => evento.stopPropagation()}
                >
                  <InfoButton content={cartao.info} />
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold" style={{ color: estilo.cor }}>
                {cartao.valor}
              </p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                {cartao.descricao}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Clique para ver a lista</p>
            </>
          )

          const abrir = () =>
            setAlertaSelecionado({
              titulo: cartao.titulo,
              descricao: cartao.descricao,
              linhas: cartao.linhas,
            })

          return (
            <div
              key={cartao.rotulo}
              role="button"
              tabIndex={0}
              aria-label={`${cartao.rotulo}: ${cartao.valor} registros. Abrir lista de clientes e pessoas`}
              onClick={abrir}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                  evento.preventDefault()
                  abrir()
                }
              }}
              style={estiloCss}
              className={classes}
            >
              {conteudo}
            </div>
          )
        })}
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
          Status da ação
          <select
            value={statusAcao}
            onChange={(e) => setStatusAcao(e.target.value)}
            className={classesSelect()}
          >
            <option value="">Todos</option>
            {opcoes.statusAcoes.map((valor) => (
              <option key={valor} value={valor}>
                {STATUS_ACAO_LABELS[valor] ?? valor}
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
          Tipo de ação
          <select
            value={tipoAcao}
            onChange={(e) => setTipoAcao(e.target.value)}
            className={classesSelect()}
          >
            <option value="">Todos</option>
            {opcoes.tiposAcao.map((valor) => (
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
          Só alertas (AEC/Engajados)
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
                  "Ações R/A/C",
                  "Última ação",
                  "Próxima ação",
                  "Itens de engajamento",
                  "Status",
                  "Valor estimado",
                  "Prob.",
                  "Conversão",
                  "Esforço",
                  "Engajamento",
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
              {filtradas.map((linha) => {
                const { resumo } = obterEngajamento(linha)
                const conversao = calcularConversao(linha)
                return (
                  <tr
                    key={`${linha.tipo}-${linha.id}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
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
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setAcoesSelecionadas(linha)}
                        aria-label={`Ações R/A/C de ${linha.nome}: ${linha.acoesRealizadas}/${linha.acoesAgendadas}/${linha.acoesCanceladas}. Ver lista`}
                        title="Ver lista de ações"
                        className="rounded px-1 font-mono text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400"
                      >
                        {linha.acoesRealizadas}/{linha.acoesAgendadas}/{linha.acoesCanceladas}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                      {formatarData(linha.ultimaAcao)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                      {formatarData(linha.proximaAcao)}
                    </td>
                    <td className="px-3 py-2">
                      <EngajamentoBadge
                        resumo={resumo}
                        nome={linha.nome}
                        onClick={() => onVerItens(linha)}
                      />
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
                    <td className="px-3 py-2">
                      <ConversaoBadge
                        resumo={conversao}
                        nome={linha.nome}
                        onClick={() => setConversaoSelecionada(linha)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreBadge
                        rotulo="Esforço"
                        valor={linha.scoreEsforco}
                        onClick={() => setSelecaoScore({ linha, tipo: "Esforço" })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreBadge
                        rotulo="Engajamento"
                        valor={linha.scoreEngajamento}
                        onClick={() => setSelecaoScore({ linha, tipo: "Engajamento" })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertaListaModal
        aberto={!!alertaSelecionado}
        titulo={alertaSelecionado?.titulo ?? ""}
        descricao={alertaSelecionado?.descricao ?? ""}
        linhas={alertaSelecionado?.linhas ?? []}
        onClose={() => setAlertaSelecionado(null)}
      />
      <ConversaoModal
        cliente={conversaoSelecionada}
        onClose={() => setConversaoSelecionada(null)}
      />
      <AcoesRacModal
        cliente={acoesSelecionadas}
        onClose={() => setAcoesSelecionadas(null)}
      />
      <ScoreDetalheModal
        selecao={selecaoScore}
        onClose={() => setSelecaoScore(null)}
      />
    </section>
  )
}
