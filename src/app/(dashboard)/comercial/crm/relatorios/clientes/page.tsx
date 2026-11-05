"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Building2, CalendarCheck, CircleDollarSign, Handshake, Target, Ticket } from "lucide-react"
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

export default function RelatorioClientesPage() {
  const info = getInfoContent("/comercial/crm/relatorios/clientes")
  const { data, isLoading, isError, filtros, atualizar, limpar } = useRelatorioCrm(
    "/api/crm/relatorios/clientes"
  )

  const linhas = data?.linhas || []
  const cards = data?.cards

  const segmentos = useMemo(() => {
    const valores = new Set<string>()
    for (const linha of linhas) {
      if (linha.segmento) valores.add(linha.segmento)
    }
    return Array.from(valores)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((valor) => ({ value: valor, label: valor }))
  }, [linhas])

  const exportacao = useMemo(() => {
    const headers = [
      "Cliente",
      "CNPJ",
      "Segmento",
      "Cidade/UF",
      "Pessoas",
      "Oportunidades",
      "Em aberto",
      "Valor das oportunidades",
      "Propostas",
      "Valor das propostas",
      "Visitas",
      "Cliente desde",
    ]
    const rows = linhas.map((l: any) => [
      l.nome,
      l.cnpj || "—",
      l.segmento || "—",
      l.local || "—",
      l.pessoas || 0,
      l.oportunidades || 0,
      l.oportunidadesEmAberto || 0,
      moeda.format(l.valorOportunidades || 0),
      l.propostas || 0,
      moeda.format(l.valorPropostas || 0),
      l.visitas || 0,
      l.criadoEm ? new Date(l.criadoEm).toLocaleDateString("pt-BR") : "—",
    ])
    return {
      filename: "relatorio-crm-clientes",
      title: "Relatório de Clientes do CRM",
      headers,
      rows,
      stats: {
        Período: data?.periodo?.rotulo || filtros.periodo,
        Total: cards?.total || 0,
        "Clientes com negócio": cards?.comNegocio || 0,
        "Clientes sem negócio": cards?.semNegocio || 0,
        Oportunidades: cards?.oportunidades || 0,
        Propostas: cards?.propostas || 0,
        Visitas: cards?.visitas || 0,
        "Valor das oportunidades": moeda.format(cards?.valorOportunidades || 0),
        "Valor das propostas": moeda.format(cards?.valorPropostas || 0),
      },
      period: data?.periodo?.rotulo,
    }
  }, [cards, data, filtros.periodo, linhas])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Clientes{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Negócio de cada cliente no período — inclui o que foi feito nas pessoas do CRM que
            viraram este cliente.
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
              label: "Clientes",
              value: cards?.total || 0,
              icon: <Building2 size={18} />,
            },
            {
              label: "Clientes com negócio",
              value: cards?.comNegocio || 0,
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
              label: "Valor das oportunidades",
              value: moeda.format(cards?.valorOportunidades || 0),
              icon: <CircleDollarSign size={18} />,
            },
            {
              label: "Valor das propostas",
              value: moeda.format(cards?.valorPropostas || 0),
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
        segmento={filtros.segmento}
        onSegmentoChange={(segmento) => atualizar({ segmento })}
        segmentos={segmentos}
        onLimpar={limpar}
      />

      {!isLoading && !isError && (
        <TabelaRelatorio
          colunas={[
            "Cliente",
            "CNPJ",
            "Segmento",
            "Cidade/UF",
            "Pessoas",
            "Oportunidades",
            "Em aberto",
            "Valor das oportunidades",
            "Propostas",
            "Valor das propostas",
            "Visitas",
          ]}
          total={linhas.length}
          vazio="Nenhum cliente cadastrado"
        >
          {linhas.map((l: any) => (
            <LinhaRelatorio key={l.id}>
              <CelulaRelatorio className="font-medium">
                <Link
                  href={`/comercial/clientes/${l.id}`}
                  className="hover:underline text-blue-600 dark:text-blue-400"
                >
                  {l.nome}
                </Link>
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap font-mono">
                {l.cnpj || "—"}
              </CelulaRelatorio>
              <CelulaRelatorio>{l.segmento || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.local || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">{l.pessoas || 0}</CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">{l.oportunidades || 0}</CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">
                {l.oportunidadesEmAberto || 0}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap tabular-nums">
                {moeda.format(l.valorOportunidades || 0)}
              </CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">{l.propostas || 0}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap tabular-nums">
                {moeda.format(l.valorPropostas || 0)}
              </CelulaRelatorio>
              <CelulaRelatorio className="tabular-nums">{l.visitas || 0}</CelulaRelatorio>
            </LinhaRelatorio>
          ))}
        </TabelaRelatorio>
      )}
    </div>
  )
}
