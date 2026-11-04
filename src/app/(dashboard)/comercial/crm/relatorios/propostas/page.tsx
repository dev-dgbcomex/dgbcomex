"use client"

import { useMemo } from "react"
import { CircleDollarSign, FileText, ThumbsDown, ThumbsUp } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { useRelatorioCrm } from "@/hooks/use-relatorio-crm"
import { useStatuses } from "@/hooks/use-statuses"
import { CardsRelatorio } from "@/components/crm/relatorios/cards-relatorio"
import { FiltrosRelatorio } from "@/components/crm/relatorios/filtros-relatorio"
import {
  CelulaRelatorio,
  LinhaRelatorio,
  TabelaRelatorio,
} from "@/components/crm/relatorios/tabela-relatorio"
import { ExportarRelatorio } from "@/components/crm/relatorios/exportar-relatorio"

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
})

export default function RelatorioPropostasPage() {
  const info = getInfoContent("/comercial/crm/relatorios/propostas")
  const { data, isLoading, isError, filtros, atualizar, limpar } = useRelatorioCrm(
    "/api/crm/relatorios/propostas"
  )
  const { statuses } = useStatuses("PROPOSTA")

  const linhas = data?.linhas || []
  const cards = data?.cards

  const statusOpcoes = useMemo(
    () => statuses.map((s) => ({ value: s.nome, label: s.rotulo || s.nome })),
    [statuses]
  )

  const exportacao = useMemo(() => {
    const headers = [
      "Data e hora",
      "Proposta",
      "Pessoa",
      "Cliente",
      "Criada por",
      "Status",
      "Valor",
      "Data da resposta",
    ]
    const rows = linhas.map((l: any) => [
      new Date(l.dataHora).toLocaleString("pt-BR"),
      l.titulo,
      l.pessoa || "—",
      l.cliente || "—",
      l.responsavel || "—",
      l.status,
      moeda.format(l.valor || 0),
      l.dataResposta ? new Date(l.dataResposta).toLocaleString("pt-BR") : "—",
    ])
    return {
      filename: "relatorio-crm-propostas",
      title: "Relatório de Propostas do CRM",
      headers,
      rows,
      stats: {
        Período: data?.periodo?.rotulo || filtros.periodo,
        Total: cards?.total || 0,
        Aceitas: cards?.aceitas || 0,
        Recusadas: cards?.recusadas || 0,
        Pendentes: cards?.pendentes || 0,
        "Taxa de aceitação %": cards?.taxaAceitacao || 0,
        "Valor total": moeda.format(cards?.valorTotal || 0),
        "Valor aceito": moeda.format(cards?.valorAceito || 0),
      },
      period: data?.periodo?.rotulo,
    }
  }, [cards, data, filtros.periodo, linhas])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Propostas{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Propostas enviadas, aceitas e recusadas no período, com valores e pessoa envolvida.
          </p>
        </div>
        <ExportarRelatorio dados={exportacao} disabled={isLoading || linhas.length === 0} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <p className="text-center text-sm text-red-500 py-10">Erro ao carregar o relatório</p>
      ) : (
        <CardsRelatorio
          cards={[
            {
              label: "Propostas no período",
              value: cards?.total || 0,
              icon: <FileText size={18} />,
              cor: "text-blue-600",
              fundo: "bg-blue-50 dark:bg-blue-950/50",
            },
            {
              label: "Aceitas",
              value: cards?.aceitas || 0,
              icon: <ThumbsUp size={18} />,
              cor: "text-emerald-600",
              fundo: "bg-emerald-50 dark:bg-emerald-950/50",
            },
            {
              label: "Recusadas",
              value: cards?.recusadas || 0,
              icon: <ThumbsDown size={18} />,
              cor: "text-red-600",
              fundo: "bg-red-50 dark:bg-red-950/50",
            },
            {
              label: "Em aberto",
              value: cards?.pendentes || 0,
              icon: <FileText size={18} />,
              cor: "text-amber-600",
              fundo: "bg-amber-50 dark:bg-amber-950/50",
            },
            {
              label: "Taxa de aceitação",
              value: `${cards?.taxaAceitacao || 0}%`,
              icon: <ThumbsUp size={18} />,
              cor: "text-purple-600",
              fundo: "bg-purple-50 dark:bg-purple-950/50",
            },
            {
              label: "Valor enviado",
              value: moeda.format(cards?.valorTotal || 0),
              icon: <CircleDollarSign size={18} />,
              cor: "text-cyan-600",
              fundo: "bg-cyan-50 dark:bg-cyan-950/50",
            },
            {
              label: "Valor aceito",
              value: moeda.format(cards?.valorAceito || 0),
              icon: <CircleDollarSign size={18} />,
              cor: "text-emerald-600",
              fundo: "bg-emerald-50 dark:bg-emerald-950/50",
            },
          ]}
        />
      )}

      <FiltrosRelatorio
        periodo={filtros.periodo}
        onPeriodoChange={(periodo) => atualizar({ periodo })}
        de={filtros.de}
        onDeChange={(de) => atualizar({ de })}
        ate={filtros.ate}
        onAteChange={(ate) => atualizar({ ate })}
        usuarios={data?.usuarios || []}
        usuario={filtros.usuario}
        onUsuarioChange={(usuario) => atualizar({ usuario })}
        status={filtros.status}
        onStatusChange={(status) => atualizar({ status })}
        statusOpcoes={statusOpcoes}
        onLimpar={limpar}
      />

      {!isLoading && !isError && (
        <TabelaRelatorio
          colunas={[
            "Data e hora",
            "Proposta",
            "Pessoa",
            "Cliente",
            "Criada por",
            "Status",
            "Valor",
            "Resposta",
          ]}
          total={linhas.length}
          vazio="Nenhuma proposta criada no período"
        >
          {linhas.map((l: any) => (
            <LinhaRelatorio key={l.id}>
              <CelulaRelatorio className="whitespace-nowrap">
                {new Date(l.dataHora).toLocaleString("pt-BR")}
              </CelulaRelatorio>
              <CelulaRelatorio className="font-medium">{l.titulo}</CelulaRelatorio>
              <CelulaRelatorio>{l.pessoa || "—"}</CelulaRelatorio>
              <CelulaRelatorio>{l.cliente || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.responsavel || "—"}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.status}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap tabular-nums">
                {moeda.format(l.valor || 0)}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.dataResposta ? new Date(l.dataResposta).toLocaleString("pt-BR") : "—"}
              </CelulaRelatorio>
            </LinhaRelatorio>
          ))}
        </TabelaRelatorio>
      )}
    </div>
  )
}
