"use client"

import { useState } from "react"
import { Bot, Send } from "lucide-react"
import { toast } from "sonner"

type MensagemChat = {
  papel: "usuario" | "ia"
  texto: string
}

export function TimelineIaChat({ tipo, id }: { tipo: "cliente" | "lead"; id: string }) {
  const [analise, setAnalise] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [mensagens, setMensagens] = useState<MensagemChat[]>([])
  const [pergunta, setPergunta] = useState("")
  const [enviando, setEnviando] = useState(false)

  async function chamarEndpoint(historico: MensagemChat[]): Promise<string> {
    const res = await fetch("/api/crm/ia/timeline-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, id, mensagens: historico }),
    })
    if (!res.ok) {
      const erro = await res.json().catch(() => null)
      throw new Error(erro?.error || "Erro ao consultar a IA")
    }
    const dados = (await res.json()) as { resposta?: string }
    return dados.resposta || ""
  }

  async function gerarAnalise() {
    setGerando(true)
    try {
      setAnalise(await chamarEndpoint([]))
    } catch {
      toast.error("Erro ao gerar análise da timeline")
    } finally {
      setGerando(false)
    }
  }

  async function enviarPergunta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const texto = pergunta.trim()
    if (!texto || enviando) return

    const historico: MensagemChat[] = [...mensagens, { papel: "usuario", texto }]
    setEnviando(true)
    try {
      const resposta = await chamarEndpoint(historico)
      setMensagens([...historico, { papel: "ia", texto: resposta }])
      setPergunta("")
    } catch {
      toast.error("Erro ao enviar pergunta sobre a timeline")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <Bot size={16} className="text-purple-500" />
            Análise da timeline
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A IA resume os eventos e responde perguntas sobre este histórico.
          </p>
        </div>
        <button
          type="button"
          onClick={gerarAnalise}
          disabled={gerando}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <Bot size={14} />
          {gerando ? "Gerando..." : "Gerar análise"}
        </button>
      </div>

      {analise !== null && (
        <div className="rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 p-3">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
            Análise da IA
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{analise}</p>
        </div>
      )}

      {mensagens.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {mensagens.map((mensagem, indice) => (
            <div
              key={indice}
              className={`rounded-lg p-2.5 text-sm whitespace-pre-wrap ${
                mensagem.papel === "usuario"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  : "bg-purple-50 dark:bg-purple-950/30 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="block text-[10px] font-medium uppercase text-slate-500 mb-0.5">
                {mensagem.papel === "usuario" ? "Você" : "IA"}
              </span>
              {mensagem.texto}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={enviarPergunta} className="flex gap-2">
        <label htmlFor={`timeline-ia-pergunta-${tipo}-${id}`} className="sr-only">
          Perguntar sobre a timeline
        </label>
        <input
          id={`timeline-ia-pergunta-${tipo}-${id}`}
          aria-label="Perguntar sobre a timeline"
          value={pergunta}
          onChange={(event) => setPergunta(event.target.value)}
          placeholder="Perguntar sobre a timeline"
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={enviando || !pergunta.trim()}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={14} />
          Enviar
        </button>
      </form>
    </div>
  )
}
