"use client"

import { useMemo } from "react"
import { Building2, UserCheck, Users, UserRound } from "lucide-react"
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

export default function RelatorioPessoasPage() {
  const info = getInfoContent("/comercial/crm/relatorios/pessoas")
  const { data, isLoading, isError, filtros, atualizar, limpar } = useRelatorioCrm(
    "/api/crm/relatorios/pessoas"
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
      "Data e hora",
      "Nome",
      "Tipo",
      "Documento",
      "Segmento",
      "Cidade",
      "Status",
      "Responsável",
      "Cliente vinculado",
      "Tarja de cliente",
      "Virou cliente em",
      "Promovido por",
    ]
    const rows = linhas.map((l: any) => [
      new Date(l.dataHora).toLocaleString("pt-BR"),
      l.nome,
      l.tipoPessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica",
      l.documento || "—",
      l.segmento || "—",
      l.cidade || "—",
      l.status,
      l.responsavel || "—",
      l.clienteVinculado ? "Sim" : "Não",
      l.promovidaCliente ? "Sim" : "Não",
      l.promovidoEm ? new Date(l.promovidoEm).toLocaleDateString("pt-BR") : "—",
      l.promovidoPorNome || "—",
    ])
    return {
      filename: "relatorio-crm-pessoas",
      title: "Relatório de Pessoas do CRM",
      headers,
      rows,
      stats: {
        Período: data?.periodo?.rotulo || filtros.periodo,
        Total: cards?.total || 0,
        "Pessoas físicas": cards?.pessoasFisicas || 0,
        "Pessoas jurídicas": cards?.pessoasJuridicas || 0,
        "Convertidas em cliente": cards?.convertidasEmCliente || 0,
        "Com tarja de cliente": cards?.comTarja || 0,
      },
      period: data?.periodo?.rotulo,
    }
  }, [cards, data, filtros.periodo, linhas])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Pessoas{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastro de pessoas do CRM criado no período, com responsável e conversão em cliente.
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
              label: "Pessoas no período",
              value: cards?.total || 0,
              icon: <Users size={18} />,
              cor: "text-blue-600",
              fundo: "bg-blue-50 dark:bg-blue-950/50",
            },
            {
              label: "Pessoas físicas",
              value: cards?.pessoasFisicas || 0,
              icon: <UserRound size={18} />,
              cor: "text-emerald-600",
              fundo: "bg-emerald-50 dark:bg-emerald-950/50",
            },
            {
              label: "Pessoas jurídicas",
              value: cards?.pessoasJuridicas || 0,
              icon: <Building2 size={18} />,
              cor: "text-purple-600",
              fundo: "bg-purple-50 dark:bg-purple-950/50",
            },
            {
              label: "Convertidas em cliente",
              value: cards?.convertidasEmCliente || 0,
              icon: <UserCheck size={18} />,
              cor: "text-amber-600",
              fundo: "bg-amber-50 dark:bg-amber-950/50",
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
        tarja={filtros.tarja}
        onTarjaChange={(tarja) => atualizar({ tarja })}
        onLimpar={limpar}
      />

      {!isLoading && !isError && (
        <TabelaRelatorio
          colunas={[
            "Data e hora",
            "Nome",
            "Tipo",
            "Documento",
            "Segmento",
            "Cidade",
            "Status",
            "Responsável",
            "Cliente",
            "Tarja",
            "Virou cliente em",
            "Promovido por",
          ]}
          total={linhas.length}
          vazio="Nenhuma pessoa cadastrada no período"
        >
          {linhas.map((l: any) => (
            <LinhaRelatorio key={l.id}>
              <CelulaRelatorio className="whitespace-nowrap">
                {new Date(l.dataHora).toLocaleString("pt-BR")}
              </CelulaRelatorio>
              <CelulaRelatorio className="font-medium">{l.nome}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.tipoPessoa === "PF" ? "PF" : "PJ"}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.documento || "—"}</CelulaRelatorio>
              <CelulaRelatorio>{l.segmento || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.cidade || "—"}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">{l.status}</CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.responsavel || "—"}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.clienteVinculado ? "Sim" : "Não"}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.promovidaCliente ? "Sim" : "Não"}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.promovidoEm ? new Date(l.promovidoEm).toLocaleDateString("pt-BR") : "—"}
              </CelulaRelatorio>
              <CelulaRelatorio className="whitespace-nowrap">
                {l.promovidoPorNome || "—"}
              </CelulaRelatorio>
            </LinhaRelatorio>
          ))}
        </TabelaRelatorio>
      )}
    </div>
  )
}
