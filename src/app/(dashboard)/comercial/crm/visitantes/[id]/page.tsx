"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Trash2,
  MessageSquare,
  Send,
  Loader2,
  Check as CheckIcon,
  CheckCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { podeGerenciarTudo } from "@/lib/permissoes"
import type { Visitante, MensagemWhatsapp } from "../types"

const STATUS_OPTIONS = ["NOVO", "CONTATADO", "QUALIFICADO", "CONVERTIDO", "PERDIDO"] as const
const ORIGEM_OPTIONS = [
  "SITE",
  "INDICACAO",
  "EVENTO",
  "PROSPECCAO",
  "LIGACAO",
  "WHATSAPP",
  "EMAIL",
  "OUTRO",
] as const

type VisitanteForm = {
  nome: string
  tipoPessoa: string | null
  documento: string | null
  email: string | null
  celular: string | null
  telefone: string | null
  empresaNome: string | null
  cargo: string | null
  origem: string | null
  status: string | null
  descricao: string | null
}

const STATUS_CORES: Record<string, string> = {
  NOVO: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400",
  CONTATADO: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400",
  QUALIFICADO: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  CONVERTIDO: "text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400",
  PERDIDO: "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400",
}

type Mensagem = MensagemWhatsapp

export default function VisitanteDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const params = useParams()
  const { data: session } = useSession()
  const podeExcluir = podeGerenciarTudo(session?.user?.role)
  const [visitante, setVisitante] = useState<Visitante | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<VisitanteForm>>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const [textoMsg, setTextoMsg] = useState("")
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/crm/visitantes/${params.id}`)
      .then((r) => r.json() as Promise<Visitante>)
      .then((data: Visitante) => {
        setVisitante(data)
        setForm(data)
      })
      .catch(() => toast.error("Erro ao carregar visitante"))
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (!visitante?.id) return
    fetch(`/api/crm/visitantes/${visitante.id}/whatsapp`)
      .then((r) => r.json() as Promise<MensagemWhatsapp[]>)
      .then((data) => {
        setMensagens(Array.isArray(data) ? data.reverse() : [])
      })
      .catch(console.error)
      .finally(() => setLoadingMsgs(false))
  }, [visitante?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens])

  async function handleSave() {
    try {
      const res = await fetch(`/api/crm/visitantes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const updated = await res.json()
      setVisitante(updated)
      setForm(updated)
      setEditing(false)
      toast.success("Visitante atualizado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar visitante")
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/crm/visitantes/${params.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir")
      toast.success("Visitante excluído")
      router.push("/comercial/crm/visitantes")
    } catch {
      toast.error("Erro ao excluir visitante")
    } finally {
      setDeleteLoading(false)
      setShowDelete(false)
    }
  }

  async function enviarMensagem() {
    if (!textoMsg.trim() || !visitante) return
    setEnviandoMsg(true)
    try {
      const res = await fetch(`/api/crm/visitantes/${visitante.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: textoMsg }),
      })
      if (!res.ok) throw new Error()
      const nova = (await res.json()) as MensagemWhatsapp
      setMensagens((prev) => [...prev, nova])
      setTextoMsg("")
    } catch {
      toast.error("Erro ao enviar mensagem")
    } finally {
      setEnviandoMsg(false)
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    return `${dd}/${mm} ${hh}:${min} (${dias[d.getDay()]})`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!visitante) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Visitante não encontrado</p>
        <Link
          href="/comercial/crm/visitantes"
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {visitante.nome}
              {info && <InfoButton content={info} />}
            </h1>
            {visitante.tipoPessoa && (
              <span
                className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  visitante.tipoPessoa === "PF"
                    ? "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400"
                    : "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400"
                }`}
              >
                {visitante.tipoPessoa === "PF" ? "PF" : "PJ"}
              </span>
            )}
            <span
              className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CORES[visitante.status] || ""}`}
            >
              {visitante.status}
            </span>
          </div>
          {(visitante.empresaNome || visitante.tipoPessoa) && (
            <p className="text-sm text-slate-500">
              {visitante.empresaNome}
              {visitante.tipoPessoa && (visitante.empresaNome ? " — " : "")}
              {visitante.tipoPessoa === "PF"
                ? "Pessoa Física"
                : visitante.tipoPessoa === "PJ"
                  ? "Pessoa Jurídica"
                  : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
              >
                <Check size={14} /> Salvar
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setForm(visitante)
                }}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:underline"
              >
                <X size={14} /> Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <Pencil size={14} /> Editar
              </button>
              {podeExcluir && (
                <button
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
            Dados do Visitante
          </h2>
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.nome || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                  <select
                    value={form.tipoPessoa || ""}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, tipoPessoa: e.target.value, documento: "" }))
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="PF">PF</option>
                    <option value="PJ">PJ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {form.tipoPessoa === "PF"
                      ? "CPF"
                      : form.tipoPessoa === "PJ"
                        ? "CNPJ"
                        : "Documento"}
                  </label>
                  <input
                    type="text"
                    value={form.documento || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, documento: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Celular</label>
                  <input
                    type="text"
                    value={form.celular || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, celular: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={form.empresaNome || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, empresaNome: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={form.cargo || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Origem</label>
                  <select
                    value={form.origem || "OUTRO"}
                    onChange={(e) => setForm((prev) => ({ ...prev, origem: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    {ORIGEM_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={form.status || "NOVO"}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
                <textarea
                  value={form.descricao || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Nome</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.nome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Tipo</p>
                <p className="text-slate-900 dark:text-slate-200">
                  {visitante.tipoPessoa === "PF" ? "PF" : visitante.tipoPessoa === "PJ" ? "PJ" : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">
                  {visitante.tipoPessoa === "PF"
                    ? "CPF"
                    : visitante.tipoPessoa === "PJ"
                      ? "CNPJ"
                      : "Documento"}
                </p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.documento || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Celular</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.celular || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Telefone</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.telefone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Empresa</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.empresaNome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Cargo</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.cargo || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Origem</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.origem || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Status</p>
                <p className="text-slate-900 dark:text-slate-200">{visitante.status || "—"}</p>
              </div>
              {visitante.descricao && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-0.5">Descrição</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {visitante.descricao}
                  </p>
                </div>
              )}
              {visitante.segmentoIa && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Segmento (IA)</p>
                  <p className="text-slate-900 dark:text-slate-200">{visitante.segmentoIa}</p>
                </div>
              )}
              {visitante.porteIa && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Porte (IA)</p>
                  <p className="text-slate-900 dark:text-slate-200">{visitante.porteIa}</p>
                </div>
              )}
              {visitante.pessoaId && (
                <div className="col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 mb-0.5">Lead vinculado</p>
                  <Link
                    href={`/comercial/crm/leads/${visitante.pessoaId}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Ver lead #{visitante.pessoaId} — 
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
            <MessageSquare size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">WhatsApp</h2>
            {loadingMsgs && <Loader2 size={14} className="animate-spin text-slate-400" />}
          </div>
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-2 p-3">
              {mensagens.length === 0 && !loadingMsgs ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhuma mensagem</p>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.tipo === "ENVIADA" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.tipo === "ENVIADA"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.mensagem}</p>
                      <div
                        className={`flex items-center gap-1 mt-1 ${msg.tipo === "ENVIADA" ? "text-blue-200" : "text-slate-400"}`}
                      >
                        <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                        {msg.tipo === "ENVIADA" &&
                          (msg.status === "ENVIADA" ? (
                            <CheckIcon size={12} />
                          ) : (
                            <CheckCheck size={12} />
                          ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textoMsg}
                  onChange={(e) => setTextoMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      enviarMensagem()
                    }
                  }}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  onClick={enviarMensagem}
                  disabled={enviandoMsg || !textoMsg.trim()}
                  className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {enviandoMsg ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Excluir visitante?"
        message={`Tem certeza que deseja excluir "${visitante.nome}"?`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
