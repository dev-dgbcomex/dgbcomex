"use client"

import { useMemo } from "react"
import { Activity, CalendarDays, CheckCircle2 } from "lucide-react"
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

const CATEGORIAS = [
  { key: "pessoas", label: "Pessoas" },
  { key: "oportunidades", label: "Oportunidades" },
  { key: "propostas", label: "Propostas" },
  { key: "visitas", label: "Visitas" },
  { key: "tarefas", label: "Tarefas" },
  { key: "leads", label: "Leads" },
  { key: "contatos", label: "Contatos" },
]

export default function RelatorioAtividadesPage() {
  const info = getInfoContent("/comercial/crm/relatorios/atividades")
  const { data, isLoading, isError, filtros, atualizar, limpar } = useRelatorioCrm(
    "/api/crm/relatorios/atividades"
  )

  const resumo = data?.resumo
  const porUsuario = data?.porUsuario || []
  const atividades = data?.atividades || []

  const cards = useMemo(() => {
    if (!resumo) return []
    return [
      {
        label: "Atividades no período",
        value: resumo.periodo?.total || 0,
        icon: <Activity size={18} />,
      },
      {
        label: "Criados hoje",
        value: resumo.dia?.total || 0,
        icon: <CalendarDays size={18} />,
      },
      {
        label: "Criados nos últimos 7 dias",
        value: resumo.semana?.total || 0,
        icon: <CalendarDays size={18} />,
      },
      {
        label: "Criados no mês",
        value: resumo.mes?.total || 0,
        icon: <CheckCircle2 size={18} />,
      },
    ]
  }, [resumo])

  const exportacao = useMemo(() => {
    const headers = ["Usuário", "Ação", "Registro", "Pessoa / Cliente", "Data e hora", "Descrição"]
    const rows = atividades.map((a: any) => [
      a.usuario,
      a.acao,
      a.entidade,
      [a.pessoa, a.cliente].filter(Boolean).join(" / ") || "—",
      new Date(a.dataHora).toLocaleString("pt-BR"),
      a.descricao || "—",
    ])
    return {
      filename: "relatorio-crm-atividades",
      title: "Relatório de Atividades do CRM",
      headers,
      rows,
      stats: {
        Período: data?.periodo?.rotulo || filtros.periodo,
        Atividades: resumo?.totalAtividades || 0,
        "Criados hoje": resumo?.dia?.total || 0,
        "Criados na semana": resumo?.semana?.total || 0,
        "Criados no mês": resumo?.mes?.total || 0,
      },
      period: data?.periodo?.rotulo,
    }
  }, [atividades, data, filtros.periodo, resumo])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Atividades do CRM{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tudo que cada usuário fez no CRM: quantos registros criou por dia, semana e mês, com
            data, hora e pessoa envolvida.
          </p>
        </div>
        <ExportarRelatorio dados={exportacao} disabled={isLoading || atividades.length === 0} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <p className="text-center text-sm text-red-500 py-10">Erro ao carregar o relatório</p>
      ) : (
        <CardsRelatorio cards={cards} />
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
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Produção por usuário
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registros criados por cada usuário em cada período
              </p>
            </div>
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950/90 backdrop-blur">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-3 py-2.5 font-medium text-slate-500 whitespace-nowrap">
                      Usuário
                    </th>
                    {CATEGORIAS.map((categoria) => (
                      <th
                        key={categoria.key}
                        className="text-right px-3 py-2.5 font-medium text-slate-500 whitespace-nowrap"
                      >
                        {categoria.label}
                      </th>
                    ))}
                    <th className="text-right px-3 py-2.5 font-medium text-slate-500 whitespace-nowrap">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {porUsuario.length === 0 ? (
                    <tr>
                      <td
                        colSpan={CATEGORIAS.length + 2}
                        className="px-3 py-10 text-center text-slate-400"
                      >
                        Nenhuma atividade registrada no período
                      </td>
                    </tr>
                  ) : (
                    porUsuario.map((linha: any) => (
                      <LinhaRelatorio key={linha.usuario}>
                        <CelulaRelatorio className="font-medium whitespace-nowrap">
                          {linha.usuario}
                        </CelulaRelatorio>
                        {CATEGORIAS.map((categoria) => (
                          <CelulaRelatorio
                            key={categoria.key}
                            className="text-right tabular-nums whitespace-nowrap"
                          >
                            {linha.periodo?.[categoria.key] || 0}
                            <span className="block text-[10px] text-slate-400">
                              {linha.dia?.[categoria.key] || 0} /{" "}
                              {linha.semana?.[categoria.key] || 0} /{" "}
                              {linha.mes?.[categoria.key] || 0}
                            </span>
                          </CelulaRelatorio>
                        ))}
                        <CelulaRelatorio className="text-right font-semibold tabular-nums">
                          {linha.periodo?.total || 0}
                        </CelulaRelatorio>
                      </LinhaRelatorio>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              Em cada célula: total do período / hoje / últimos 7 dias / mês
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">
              Listagem de atividades
            </h2>
            <TabelaRelatorio
              colunas={[
                "Data e hora",
                "Usuário",
                "Ação",
                "Registro",
                "Pessoa / Cliente",
                "Descrição",
              ]}
              total={atividades.length}
              vazio="Nenhuma atividade registrada no período"
            >
              {atividades.map((a: any) => (
                <LinhaRelatorio key={a.id}>
                  <CelulaRelatorio className="whitespace-nowrap">
                    {new Date(a.dataHora).toLocaleString("pt-BR")}
                  </CelulaRelatorio>
                  <CelulaRelatorio className="whitespace-nowrap">{a.usuario}</CelulaRelatorio>
                  <CelulaRelatorio className="whitespace-nowrap">{a.acao}</CelulaRelatorio>
                  <CelulaRelatorio className="whitespace-nowrap">{a.entidade}</CelulaRelatorio>
                  <CelulaRelatorio>
                    {[a.pessoa, a.cliente].filter(Boolean).join(" / ") || "—"}
                  </CelulaRelatorio>
                  <CelulaRelatorio>{a.descricao || "—"}</CelulaRelatorio>
                </LinhaRelatorio>
              ))}
            </TabelaRelatorio>
          </div>
        </>
      )}
    </div>
  )
}
