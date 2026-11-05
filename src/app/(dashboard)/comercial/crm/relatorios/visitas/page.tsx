"use client"

import { useMemo } from "react"
import { CalendarCheck, MapPin, Phone, Video } from "lucide-react"
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

const TIPO_OPCOES = [
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "TELEFONE", label: "Telefone" },
]

const STATUS_OPCOES = [
  { value: "AGENDADA", label: "Agendada" },
  { value: "CONFIRMADA", label: "Confirmada" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "REALIZADA", label: "Realizada" },
]

export default function RelatorioVisitasPage() {
  const info = getInfoContent("/comercial/crm/relatorios/visitas")
  const { data, isLoading, isError, filtros, atualizar, limpar } = useRelatorioCrm(
    "/api/crm/relatorios/visitas"
  )

  const linhas = data?.linhas || []
  const cards = data?.cards

  const exportacao = useMemo(() => {
    const headers = ["Data e hora", "Tipo", "Status", "Pessoa", "Cliente", "Responsável", "Local"]
    const rows = linhas.map((l: any) => [
      l.dataHora,
      l.tipo,
      l.status,
      l.pessoa || "—",
      l.cliente || "—",
      l.responsavel || "—",
      l.local || "—",
    ])
    return {
      filename: "relatorio-crm-visitas",
      title: "Relatório de Visitas do CRM",
      headers,
      rows,
      stats: {
        Período: data?.periodo?.rotulo || filtros.periodo,
        Total: cards?.total || 0,
        Presenciais: cards?.presencial || 0,
        "Por vídeo": cards?.video || 0,
        "Por telefone": cards?.telefone || 0,
        Concluidas: cards?.concluidas || 0,
        "Taxa de comparecimento %": cards?.taxaComparecimento || 0,
      },
      period: data?.periodo?.rotulo,
    }
  }, [cards, data, filtros.periodo, linhas])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Visitas{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Visitas presenciais, por vídeo e por telefone realizadas no período, com data, hora e
            pessoa envolvida.
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
              label: "Visitas no período",
              value: cards?.total || 0,
              icon: <CalendarCheck size={18} />,
            },
            {
              label: "Presenciais",
              value: cards?.presencial || 0,
              icon: <MapPin size={18} />,
            },
            {
              label: "Por vídeo",
              value: cards?.video || 0,
              icon: <Video size={18} />,
            },
            {
              label: "Por telefone",
              value: cards?.telefone || 0,
              icon: <Phone size={18} />,
            },
            {
              label: "Concluídas",
              value: cards?.concluidas || 0,
              icon: <CalendarCheck size={18} />,
            },
            {
              label: "Taxa de comparecimento",
              value: `${cards?.taxaComparecimento || 0}%`,
              icon: <CalendarCheck size={18} />,
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
        statusOpcoes={STATUS_OPCOES}
        tipo={filtros.tipo}
        onTipoChange={(tipo) => atualizar({ tipo })}
        tipoOpcoes={TIPO_OPCOES}
        onLimpar={limpar}
      />

      {!isLoading && !isError && (
        <TabelaRelatorio
          colunas={["Data e hora", "Tipo", "Status", "Pessoa", "Cliente", "Responsável", "Local"]}
          total={linhas.length}
          vazio="Nenhuma visita registrada no período"
        >
          {linhas.map((l: any) => (
            <LinhaRelatorio key={l.id}>
              <CelulaRelatorio className="whitespace-nowrap">{l.dataHora}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.tipo}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.status}</CelulaRelatorio>
              <CelulaRelatorio>{l.pessoa || "—"}</CelulaRelatorio>
              <CelulaRelatorio>{l.cliente || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.responsavel || "—"}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.local || "—"}</CelulaRelatorio>
            </LinhaRelatorio>
          ))}
        </TabelaRelatorio>
      )}
    </div>
  )
}
