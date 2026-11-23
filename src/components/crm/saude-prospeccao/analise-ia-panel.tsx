"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Bot, Download, Loader2, MessageCircle, Send, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InfoButton } from "@/components/ui/info-button"
import { calcularConversaoLeads, type ClienteSaudeLeads } from "@/lib/crm/leads-saude"
import type { FiltrosSaude } from "@/lib/crm/visitas-saude"
import { saudeProspeccaoLeadsInfo } from "@/lib/info-content/crm"

type Mensagem = {
  id: number
  analiseId: number
  papel: string
  conteudo: string
  dadosUsados: Record<string, unknown>
  createdAt: string
}

type Analise = {
  id: number
  titulo: string
  analise: string
  resumo: string | null
  situacao: string
  provedor: string | null
  modelo: string | null
  criadoPorNome: string | null
  createdAt: string
  enviadaEm: string | null
}

const BASE = "/api/crm/saude-prospeccao/ia/analises"

function dataHora(valor: string) {
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR")
}

function linhaParaApi(linha: ClienteSaudeLeads) {
  return {
    id: linha.id,
    tipo: linha.tipo,
    nome: linha.nome,
    documento: linha.documento,
    segmento: linha.segmento,
    porte: linha.porte,
    responsaveis: linha.responsaveis,
    scoreEsforco: linha.scoreEsforco,
    scoreEngajamento: linha.scoreEngajamento,
    percentualConversao: calcularConversaoLeads(linha).percentual,
    visitasRealizadas: linha.visitasRealizadas,
    visitasAgendadas: linha.visitasAgendadas,
    acoesRealizadas: linha.acoesRealizadas,
    acoesAgendadas: linha.acoesAgendadas,
    ultimaVisita: linha.ultimaVisita,
    proximaVisita: linha.proximaVisita,
    ultimaAcao: linha.ultimaAcao,
    proximaAcao: linha.proximaAcao,
    statusOportunidadeDominante: linha.statusOportunidadeDominante,
    valorEstimadoTotal: linha.valorEstimadoTotal,
    probabilidadeMedia: linha.probabilidadeMedia,
    pedidosVenda: linha.pedidosVenda,
    faturamentos: linha.faturamentos,
  }
}

export function AnaliseIaPanel({
  linhas,
  filtros,
}: {
  linhas: ClienteSaudeLeads[]
  filtros: FiltrosSaude
}) {
  const [aberto, setAberto] = useState(false)
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [historico, setHistorico] = useState<Analise[]>([])
  const [pergunta, setPergunta] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const payload = useMemo(
    () => ({
      titulo: `Análise de saúde da prospecção — ${new Date().toLocaleString("pt-BR")}`,
      linhas: linhas.map(linhaParaApi),
      filtros,
    }),
    [linhas, filtros]
  )

  const carregarHistorico = useCallback(async () => {
    try {
      const resposta = await fetch(BASE)
      if (!resposta.ok) throw new Error("Falha ao carregar análises")
      const dados = (await resposta.json()) as { analises: Analise[] }
      setHistorico(dados.analises)
    } catch {
      toast.error("Não foi possível carregar as análises salvas")
    }
  }, [])

  useEffect(() => {
    if (aberto) void carregarHistorico()
  }, [aberto, carregarHistorico])

  async function gerarAnalise() {
    if (!payload.linhas.length) {
      toast.error("Não há registros filtrados para analisar")
      return
    }
    setCarregando(true)
    try {
      const resposta = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error ?? "Falha ao gerar análise")
      setAnalise(dados.analise as Analise)
      setMensagens([])
      setPergunta("")
      await carregarHistorico()
      toast.success("Análise gerada com as regras do sistema")
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao gerar análise")
    } finally {
      setCarregando(false)
    }
  }

  async function abrirAnalise(id: number) {
    setCarregando(true)
    try {
      const resposta = await fetch(`${BASE}/${id}`)
      if (!resposta.ok) throw new Error("Falha ao abrir análise")
      const dados = (await resposta.json()) as { analise: Analise; mensagens: Mensagem[] }
      setAnalise(dados.analise)
      setMensagens(dados.mensagens)
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao abrir análise")
    } finally {
      setCarregando(false)
    }
  }

  async function enviarPergunta() {
    if (!analise || !pergunta.trim()) return
    const texto = pergunta.trim()
    setEnviando(true)
    try {
      const resposta = await fetch(`${BASE}/${analise.id}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta: texto,
          mensagens: mensagens.map((mensagem) => ({
            papel: mensagem.papel === "usuario" ? "usuario" : "assistente",
            conteudo: mensagem.conteudo,
          })),
        }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error ?? "Falha ao enviar pergunta")
      setMensagens((atuais) => [...atuais, ...(dados.mensagens as Mensagem[])])
      setPergunta("")
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao enviar pergunta")
    } finally {
      setEnviando(false)
    }
  }

  async function concluir() {
    if (!analise) return
    setEnviando(true)
    try {
      const resposta = await fetch(`${BASE}/${analise.id}/concluir`, { method: "POST" })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error ?? "Falha ao enviar e-mail")
      setAnalise({ ...analise, situacao: "ENVIADA", enviadaEm: new Date().toISOString() })
      await carregarHistorico()
      toast.success("Conversa enviada por e-mail")
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao enviar e-mail")
    } finally {
      setEnviando(false)
    }
  }

  function baixarMarkdown() {
    if (!analise) return
    const conversa = mensagens
      .map((mensagem) => `### ${mensagem.papel === "usuario" ? "Pergunta" : "Resposta"}\n\n${mensagem.conteudo}`)
      .join("\n\n")
    const conteudo = `# ${analise.titulo}\n\n${analise.analise}\n\n## Conversa\n\n${conversa}\n`
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/markdown;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "saude-prospeccao-analise.md"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={!linhas.length}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={14} aria-hidden="true" />
        Analisar com IA
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="flex h-[92dvh] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] flex-col gap-3 overflow-hidden p-3 sm:max-w-[96rem] sm:p-5">
          <DialogHeader className="shrink-0 border-b pb-3 pr-10">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                <Bot size={18} aria-hidden="true" />
                Análise de IA — Saúde da Prospecção
                <InfoButton content={saudeProspeccaoLeadsInfo.ia} />
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm">
              Análise das {linhas.length} linha{linhas.length === 1 ? "" : "s"} filtradas, usando somente
              as regras do sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,15rem)_1fr]">
            <aside
              aria-label="Análises salvas"
              className="flex max-h-32 min-h-0 flex-col overflow-hidden rounded-lg border bg-slate-50 dark:bg-slate-900 lg:max-h-none"
            >
              <p className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Análises salvas
              </p>
              <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-2 lg:flex-col lg:overflow-y-auto">
                {historico.length === 0 ? (
                  <p className="px-1 py-3 text-xs text-slate-500">Nenhuma análise salva.</p>
                ) : (
                  <ul className="flex gap-2 lg:flex-col lg:space-y-1 lg:gap-0">
                    {historico.map((item) => (
                      <li key={item.id} className="shrink-0 lg:w-full">
                        <button
                          type="button"
                          onClick={() => void abrirAnalise(item.id)}
                          className={`w-full min-w-[170px] rounded-md border px-2 py-2 text-left text-xs transition lg:min-w-0 ${
                            analise?.id === item.id
                              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                              : "border-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="block truncate font-medium">{item.titulo}</span>
                          <span className="block text-[10px] text-slate-500">{dataHora(item.createdAt)}</span>
                          {item.situacao === "ENVIADA" && (
                            <span className="mt-0.5 inline-block text-[10px] text-emerald-600">Enviada</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>

            <section aria-label="Análise e conversa" className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => void gerarAnalise()}
                  disabled={carregando || !linhas.length}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {carregando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Gerar análise
                </button>
                <button
                  type="button"
                  onClick={baixarMarkdown}
                  disabled={!analise}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download size={14} />
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => void concluir()}
                  disabled={!analise || enviando || analise.situacao === "ENVIADA"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  <Send size={14} />
                  Concluir e enviar
                </button>
                {analise && (
                  <span className="ml-auto text-[10px] text-slate-500">
                    {analise.provedor ?? "IA"} · {dataHora(analise.createdAt)}
                  </span>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
                {!analise ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-sm text-slate-500">
                    <MessageCircle size={28} aria-hidden="true" />
                    <p>Gere uma análise para começar ou selecione uma análise salva.</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-5">
                    <article className="prose prose-sm max-w-none break-words dark:prose-invert sm:prose-base">
                      <ReactMarkdown>{analise.analise}</ReactMarkdown>
                    </article>
                    {mensagens.map((mensagem) => (
                      <div
                        key={mensagem.id}
                        className={`rounded-lg border p-3 ${
                          mensagem.papel === "usuario"
                            ? "ml-4 bg-blue-50 dark:bg-blue-950/30 sm:ml-10"
                            : "mr-4 bg-slate-50 dark:bg-slate-900 sm:mr-10"
                        }`}
                      >
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {mensagem.papel === "usuario" ? "Pergunta" : "Resposta"}
                        </p>
                        {mensagem.papel === "usuario" ? (
                          <p className="whitespace-pre-wrap text-sm">{mensagem.conteudo}</p>
                        ) : (
                          <div className="prose prose-sm max-w-none break-words dark:prose-invert sm:prose-base">
                            <ReactMarkdown>{mensagem.conteudo}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <textarea
                    value={pergunta}
                    onChange={(evento) => setPergunta(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter" && !evento.shiftKey) {
                        evento.preventDefault()
                        void enviarPergunta()
                      }
                    }}
                    rows={2}
                    disabled={!analise || enviando}
                    placeholder="Pergunte mais sobre estes registros…"
                    aria-label="Pergunta para a IA"
                    className="min-h-[54px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 sm:min-w-0 sm:flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => void enviarPergunta()}
                    disabled={!analise || !pergunta.trim() || enviando}
                    className="inline-flex h-[54px] w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
                  >
                    {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Enviar
                  </button>
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
