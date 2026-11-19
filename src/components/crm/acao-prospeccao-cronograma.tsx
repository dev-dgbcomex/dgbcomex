"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MapPin, Navigation, Clock, CheckCircle2, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useStatuses } from "@/hooks/use-statuses"
import type { PontoMapa } from "./acao-prospeccao-rota-mapa"

const AcaoProspeccaoRotaMapa = dynamic(() => import("./acao-prospeccao-rota-mapa"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
  ),
})

type AcaoCronograma = {
  id: number
  nome: string
  empresaId: number | null
  clienteId: number | null
  dataAcao: string
  hora: string | null
  tipo: string
  status: string
  enderecoTexto: string
  checkInTime: string | null
  checkOutTime: string | null
  latitude: number | null
  longitude: number | null
  localizacaoFonte: "checkin" | "endereco" | "geocodificada" | null
  km: number | null
}

type AcaoProspeccaoCronogramaData = {
  viagem: {
    id: number
    titulo: string
    descricao: string | null
    destinoCidade: string | null
    destinoUf: string | null
    dataInicio: string | null
    dataFim: string | null
    status: string
  }
  acoes: AcaoCronograma[]
  resumo: {
    total: number
    realizadas: number
    canceladas: number
    agendadas: number
    comLocalizacao: number
    comEndereco: number
    geocodificadas: number
    kmTotal: number
    kmSemLocalizacao: number
  }
}

const STATUS_BADGES: Record<string, string> = {
  REALIZADA: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  CANCELADA: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  EM_ANDAMENTO: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  AGENDADA: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
}

interface AcaoProspeccaoCronogramaModalProps {
  viagemId: number | null
  viagemTitulo: string
  open: boolean
  onClose: () => void
}

export default function AcaoProspeccaoCronogramaModal({
  viagemId,
  viagemTitulo,
  open,
  onClose,
}: AcaoProspeccaoCronogramaModalProps) {
  const { getLabel } = useStatuses("ACAO_PROSPECCAO")
  const { data, isLoading } = useQuery<AcaoProspeccaoCronogramaData>({
    queryKey: ["acao-prospeccao-cronograma", viagemId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/acoes-prospeccao/dashboard/viagem?viagemId=${viagemId}`)
      if (!res.ok) throw new Error("Erro ao carregar cronograma")
      return (await res.json()) as AcaoProspeccaoCronogramaData
    },
    enabled: open && !!viagemId,
    retry: 1,
  })

  const acoes = data?.acoes ?? []
  const resumo = data?.resumo
  const pontos: PontoMapa[] = acoes
    .filter((acao) => acao.latitude != null && acao.longitude != null)
    .map((acao) => ({
      id: acao.id,
      latitude: acao.latitude as number,
      longitude: acao.longitude as number,
      rotulo: acao.nome,
    }))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="flex-row items-start justify-between gap-2 p-4 pr-12 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Cronograma da Viagem
            </DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
              {viagemTitulo}
            </p>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {isLoading && !data ? (
            <div role="status" className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-slate-400" size={24} />
              <span className="sr-only">Carregando cronograma da viagem...</span>
            </div>
          ) : (
            <>
              {data?.viagem && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {[data.viagem.destinoCidade, data.viagem.destinoUf].filter(Boolean).join(" - ")}
                  {data.viagem.dataInicio ? ` · ${formatData(data.viagem.dataInicio)}` : ""}
                  {data.viagem.dataFim ? ` a ${formatData(data.viagem.dataFim)}` : ""}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Chip
                  icon={<Navigation size={14} />}
                  label="Km total"
                  value={formatKm(resumo?.kmTotal ?? 0)}
                  tone="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50"
                />
                <Chip
                  icon={<Calendar size={14} />}
                  label="Ações"
                  value={`${resumo?.total ?? 0}`}
                  tone="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/60"
                />
                <Chip
                  icon={<CheckCircle2 size={14} />}
                  label="Realizadas"
                  value={`${resumo?.realizadas ?? 0}`}
                  tone="text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/50"
                />
                <Chip
                  icon={<MapPin size={14} />}
                  label="Com localização"
                  value={`${resumo?.comLocalizacao ?? 0}`}
                  tone="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50"
                />
              </div>

              {resumo && resumo.geocodificadas + resumo.comEndereco > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Localização de {resumo.geocodificadas + resumo.comEndereco} ação(ões) estimada
                  pelo endereço (sem check-in).
                </p>
              )}

              {resumo && resumo.kmSemLocalizacao > 0 && (
                <p className="text-[11px] text-slate-400">
                  {resumo.kmSemLocalizacao} ação(ões) sem endereço ficaram fora do trajeto no mapa.
                </p>
              )}

              <AcaoProspeccaoRotaMapa pontos={pontos} />

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">
                  Linha do tempo
                </h3>
                {acoes.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    Nenhuma ação de prospecção nesta viagem
                  </p>
                ) : (
                  <ol className="space-y-0">
                    {acoes.map((acao, index) => (
                      <li key={acao.id} className="relative pl-9 pb-5 last:pb-0">
                        {index < acoes.length - 1 && (
                          <span className="absolute left-[13px] top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                        )}
                        <span className="absolute left-0 top-0 flex items-center justify-center w-[26px] h-[26px] rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {index + 1}
                        </span>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/comercial/crm/acoes-prospeccao/${acao.id}`}
                              onClick={onClose}
                              className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline truncate inline-flex items-center gap-1.5"
                            >
                              {acao.nome}
                            </Link>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{formatData(acao.dataAcao)}</span>
                              {acao.hora && <span>{acao.hora}</span>}
                              {acao.checkInTime && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={11} />
                                  {formatHora(acao.checkInTime)}
                                </span>
                              )}
                            </div>
                            {acao.enderecoTexto && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {acao.enderecoTexto}
                              </p>
                            )}
                            {(acao.localizacaoFonte === "geocodificada" ||
                              acao.localizacaoFonte === "endereco") && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                <MapPin size={10} />
                                Estimada pelo endereço
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                STATUS_BADGES[acao.status] || STATUS_BADGES.AGENDADA
                              }`}
                            >
                              {getLabel(acao.status) || acao.status}
                            </span>
                            {index === 0 ? (
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                Partida
                              </span>
                            ) : acao.km != null ? (
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                +{formatKm(acao.km)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Chip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
      <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ${tone} mb-1.5`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  )
}

function formatData(dia: string) {
  const data = new Date(dia + "T12:00:00")
  return isNaN(data.getTime())
    ? dia
    : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function formatHora(iso: string) {
  const data = new Date(iso)
  return isNaN(data.getTime())
    ? ""
    : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatKm(km: number) {
  return `${km % 1 === 0 ? km : km.toFixed(1)} km`
}
