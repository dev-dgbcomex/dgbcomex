"use client"

import { useMemo } from "react"
import { CircleDollarSign, Target, TrendingUp, Trophy, XCircle } from "lucide-react"
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

export default function RelatorioOportunidadesPage() {
  const info = getInfoContent("/comercial/crm/relatorios/oportunidades")
  const { data, isLoading, isError, filtros, atualizar, limpar } = useRelatorioCrm(
    "/api/crm/relatorios/oportunidades"
  )
  const { statuses } = useStatuses("OPORTUNIDADE")

  const linhas = data?.linhas || []
  const cards = data?.cards

  const statusOpcoes = useMemo(
    () => statuses.map((s) => ({ value: s.nome, label: s.rotulo || s.nome })),
    [statuses]
  )

  const exportacao = useMemo(() => {
    const headers = [
      "Data e hora",
      "Oportunidade",
      "Pessoa",
      "Cliente",
      "Responsável",
      "Status",
      "Valor",
      "Probabilidade %",
    ]
    const rows = linhas.map((l: any) => [
      new Date(l.dataHora).toLocaleString("pt-BR"),
      l.titulo,
      l.pessoa || "—",
      l.cliente || "—",
      l.responsavel || "—",
      l.status,
      moeda.format(l.valor || 0),
      l.probabilidade || 0,
    ])
    return {
      filename: "relatorio-crm-oportunidades",
      title: "Relatório de Oportunidades do CRM",
      headers,
      rows,
      stats: {
        Período: data?.periodo?.rotulo || filtros.periodo,
        Total: cards?.total || 0,
        "Em aberto": cards?.emAberto || 0,
        Ganhas: cards?.ganhas || 0,
        Perdidas: cards?.perdidas || 0,
        "Taxa de conversão %": cards?.taxaConversao || 0,
        "Valor total": moeda.format(cards?.valorTotal || 0),
      },
      period: data?.periodo?.rotulo,
    }
  }, [cards, data, filtros.periodo, linhas])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Oportunidades{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pipeline, conversão e valores das oportunidades criadas no período, com a pessoa e o
            cliente envolvidos.
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
              label: "Oportunidades no período",
              value: cards?.total || 0,
              icon: <Target size={18} />,
            },
            {
              label: "Em aberto",
              value: cards?.emAberto || 0,
              icon: <TrendingUp size={18} />,
            },
            {
              label: "Ganhas",
              value: cards?.ganhas || 0,
              icon: <Trophy size={18} />,
            },
            {
              label: "Perdidas",
              value: cards?.perdidas || 0,
              icon: <XCircle size={18} />,
            },
            {
              label: "Taxa de conversão",
              value: `${cards?.taxaConversao || 0}%`,
              icon: <TrendingUp size={18} />,
            },
            {
              label: "Valor do pipeline",
              value: moeda.format(cards?.valorTotal || 0),
              icon: <CircleDollarSign size={18} />,
            },
            {
              label: "Valor ganho",
              value: moeda.format(cards?.valorGanho || 0),
              icon: <CircleDollarSign size={18} />,
            },
            {
              label: "Ticket médio",
              value: moeda.format(cards?.mediaValor || 0),
              icon: <CircleDollarSign size={18} />,
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
            "Oportunidade",
            "Pessoa",
            "Cliente",
            "Responsável",
            "Status",
            "Valor",
            "Probabilidade",
          ]}
          total={linhas.length}
          vazio="Nenhuma oportunidade criada no período"
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
              <CelulaRelatorio className="tabular-nums">{l.probabilidade || 0}%</CelulaRelatorio>
            </LinhaRelatorio>
          ))}
        </TabelaRelatorio>
      )}
    </div>
  )
}
