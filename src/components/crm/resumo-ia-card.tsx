"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, FileText, Loader2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  exportarResumosIA,
  type FormatoExportacaoResumoIA,
  type ModoExportacaoResumoIA,
  type ResumoIAExportacao,
} from "@/lib/crm/resumo-ia-export"

type ResumoItem = ResumoIAExportacao

interface ResumoIACardProps {
  tipo: "lead" | "cliente"
  id: number | string
  nomeEntidade: string
  abertoId: number | null
  onAbertoIdChange: (id: number | null) => void
}

const COR_CLASSIFICACAO: Record<string, string> = {
  QUENTE: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  MORNO: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  FRIO: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
}

function formatarData(valor: string | Date | null) {
  if (!valor) return "sem data"
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? "sem data" : data.toLocaleString("pt-BR")
}

function Secao({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {titulo}
      </h4>
      <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{texto}</p>
    </div>
  )
}

export default function ResumoIACard({
  tipo,
  id,
  nomeEntidade,
  abertoId,
  onAbertoIdChange,
}: ResumoIACardProps) {
  const queryClient = useQueryClient()
  const [gerando, setGerando] = useState(false)
  const [formato, setFormato] = useState<FormatoExportacaoResumoIA>("md")
  const [modo, setModo] = useState<ModoExportacaoResumoIA>("unico")
  const [selecionados, setSelecionados] = useState<number[]>([])
  const idNumerico = Number(id)
  const queryKey = ["resumos-ia", tipo, idNumerico]

  const { data: resumos = [], isLoading } = useQuery<ResumoItem[]>({
    queryKey,
    enabled: Number.isFinite(idNumerico) && idNumerico > 0,
    queryFn: async () => {
      const res = await fetch(`/api/crm/ia/resumos?tipo=${tipo}&id=${idNumerico}`)
      if (!res.ok) throw new Error("Falha ao carregar resumos")
      const data: { resumos?: ResumoItem[] } = await res.json()
      return data.resumos ?? []
    },
  })

  const resumoAberto = resumos.find((resumo) => resumo.id === abertoId) ?? null
  const todosIds = resumos.map((resumo) => resumo.id)
  const exportados = selecionados.length ? resumos.filter((resumo) => selecionados.includes(resumo.id)) : resumos

  async function gerar() {
    setGerando(true)
    try {
      const res = await fetch("/api/crm/ia/resumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, id: idNumerico }),
      })
      const data: { resumo?: ResumoItem; error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error || "Falha ao gerar resumo")
      await queryClient.invalidateQueries({ queryKey })
      if (data.resumo) onAbertoIdChange(data.resumo.id)
      toast.success("Resumo IA gerado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar resumo")
    } finally {
      setGerando(false)
    }
  }

  async function exportar() {
    try {
      await exportarResumosIA({ resumos: exportados, nomeEntidade, formato, modo })
      toast.success("Exportação concluída")
    } catch {
      toast.error("Erro ao exportar resumos")
    }
  }

  function alternarSelecao(resumoId: number) {
    if (!selecionados.length) {
      setSelecionados(todosIds.filter((item) => item !== resumoId))
      return
    }
    setSelecionados((prev) =>
      prev.includes(resumoId) ? prev.filter((item) => item !== resumoId) : [...prev, resumoId]
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Wand2 size={16} className="text-purple-500" aria-hidden="true" />
            Resumo IA
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Histórico de análises com sugestões e classificação do relacionamento.
          </p>
        </div>
        <Button size="sm" onClick={gerar} disabled={gerando} className="gap-1.5">
          {gerando ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Gerar resumo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : resumos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nenhum resumo disponível</p>
      ) : (
        <div className="mt-4 space-y-2">
          {resumos.map((resumo) => (
            <button
              key={resumo.id}
              type="button"
              onClick={() => onAbertoIdChange(resumo.id)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    COR_CLASSIFICACAO[resumo.classificacao] ??
                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {resumo.classificacao}
                </span>
                <span className="text-[10px] text-slate-400">{formatarData(resumo.createdAt)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{resumo.resumo}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(abertoId)} onOpenChange={(open) => !open && onAbertoIdChange(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={16} aria-hidden="true" />
              Resumo IA
            </DialogTitle>
            <DialogDescription>
              {resumoAberto
                ? `Gerado em ${formatarData(resumoAberto.createdAt)}${resumoAberto.criadoPorNome ? ` por ${resumoAberto.criadoPorNome}` : ""}`
                : "Carregando resumo"}
            </DialogDescription>
          </DialogHeader>

          {resumoAberto && (
            <div className="space-y-4">
              <div
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                  COR_CLASSIFICACAO[resumoAberto.classificacao] ??
                  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {resumoAberto.classificacao}
              </div>
              <Secao titulo="Resumo" texto={resumoAberto.resumo} />
              <Secao titulo="Insights" texto={resumoAberto.insights} />
              <Secao titulo="Sugestões" texto={resumoAberto.sugestoes} />
              <Secao titulo="Motivo da classificação" texto={resumoAberto.motivoClassificacao} />

              <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Exportar resumos
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={formato} onValueChange={(valor) => setFormato(valor as FormatoExportacaoResumoIA)}>
                    <SelectTrigger aria-label="Formato de exportação">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="md">Markdown (.md)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      <SelectItem value="txt">Texto (.txt)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={modo} onValueChange={(valor) => setModo(valor as ModoExportacaoResumoIA)}>
                    <SelectTrigger aria-label="Modo de exportação">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unico">Arquivo único</SelectItem>
                      <SelectItem value="separado">Arquivos separados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {resumos.map((resumo) => (
                    <label
                      key={resumo.id}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                    >
                      <Checkbox
                        checked={!selecionados.length || selecionados.includes(resumo.id)}
                        onCheckedChange={() => alternarSelecao(resumo.id)}
                      />
                      {formatarData(resumo.createdAt)} — {resumo.classificacao}
                    </label>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={exportar} disabled={!exportados.length} className="gap-1.5">
                  <Download size={14} />
                  Exportar {exportados.length} resumo{exportados.length === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onAbertoIdChange(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
