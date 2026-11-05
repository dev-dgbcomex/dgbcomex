"use client"

import { useMemo } from "react"
import { CalendarCheck, CircleDollarSign, Handshake, Target, Ticket } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { useRelatorioCrm } from "@/hooks/use-relatorio-crm"
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

export default function RelatorioConversoesPage() {
  const info = getInfoContent("/comercial/crm/relatorios/conversoes")
  const { data, isLoading, isError, filtros, atualizar, limpar } = useRelatorioCrm(
    "/api/crm/relatorios/conversoes"
  )

  const linhas = data?.linhas || []
  const cards = data?.cards

  const exportacao = useMemo(() => {
    const headers = [
      "Data da conversão",
      "Pessoa",
      "Cliente",
      "Promovido por",
      "Oportunidades",
      "Propostas",
      "Visitas",
      "Valor das propostas",
    ]
    const rows = linhas.map((l: any) => [
      l.dataHora ? new Date(l.dataHora).toLocaleString("pt-BR") : "—",
      l.pessoa || "—",
      l.cliente || "—",
      l.porUsuario || "—",
      l.oportunidades || 0,
      l.propostas || 0,
      l.visitas || 0,
      moeda.format(l.valorPropostas || 0),
    ])
    return {
      filename: "relatorio-crm-conversoes",
      title: "Relatório de Conversões do CRM",
      headers,
      rows,
      stats: {
        Período: data?.periodo?.rotulo || filtros.periodo,
        Total: cards?.total || 0,
        Oportunidades: cards?.oportunidades || 0,
        Propostas: cards?.propostas || 0,
        Visitas: cards?.visitas || 0,
        "Valor das propostas": moeda.format(cards?.valorPropostas || 0),
        "Valor das oportunidades": moeda.format(cards?.valorOportunidades || 0),
        "Ticket médio": moeda.format(cards?.mediaValorPropostas || 0),
      },
      period: data?.periodo?.rotulo,
    }
  }, [cards, data, filtros.periodo, linhas])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Conversões{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pessoas que viraram cliente (tarja) no período, com quem promoveu e o negócio que cada
            uma gerou.
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
              label: "Conversões no período",
              value: cards?.total || 0,
              icon: <Handshake size={18} />,
            },
            {
              label: "Oportunidades",
              value: cards?.oportunidades || 0,
              icon: <Target size={18} />,
            },
            {
              label: "Propostas",
              value: cards?.propostas || 0,
              icon: <CalendarCheck size={18} />,
            },
            {
              label: "Visitas",
              value: cards?.visitas || 0,
              icon: <Handshake size={18} />,
            },
            {
              label: "Valor das propostas",
              value: moeda.format(cards?.valorPropostas || 0),
              icon: <CircleDollarSign size={18} />,
            },
            {
              label: "Valor das oportunidades",
              value: moeda.format(cards?.valorOportunidades || 0),
              icon: <CircleDollarSign size={18} />,
            },
            {
              label: "Ticket médio",
              value: moeda.format(cards?.mediaValorPropostas || 0),
              icon: <Ticket size={18} />,
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
        onLimpar={limpar}
      />

      {!isLoading && !isError && (
        <TabelaRelatorio
          colunas={[
            "Data da conversão",
            "Pessoa",
            "Cliente",
            "Promovido por",
            "Oportunidades",
            "Propostas",
            "Visitas",
            "Valor das propostas",
          ]}
          total={linhas.length}
          vazio="Nenhuma pessoa virou cliente no período"
        >
          {linhas.map((l: any) => (
            <LinhaRelatorio key={l.id}>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.dataHora ? new Date(l.dataHora).toLocaleString("pt-BR") : "—"}
              </CelulaRelatorio>
              <CelulaRelatorio className="font-medium">{l.pessoa || "—"}</CelulaRelatorio>
              <CelulaRelatorio>{l.cliente || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.porUsuario || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">{l.oportunidades || 0}</CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">{l.propostas || 0}</CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">{l.visitas || 0}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap tabular-nums">
                {moeda.format(l.valorPropostas || 0)}
              </CelulaRelatorio>
            </LinhaRelatorio>
          ))}
        </TabelaRelatorio>
      )}
    </div>
  )
}
