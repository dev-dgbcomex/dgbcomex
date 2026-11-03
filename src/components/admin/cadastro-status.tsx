"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Edit3, Check, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TIPOS_STATUS } from "@/lib/tipos-status"
import { invalidarCacheStatuses } from "@/hooks/use-statuses"
import { StatusGatilhosDialog } from "./status-gatilhos-dialog"

export interface StatusCadastroItem {
  id: number
  nome: string
  rotulo: string
  tipo: string
  cor: string | null
  ordem: number
  ativo: boolean
  exibirKanban: boolean | null
}

const TIPO_CORES: Record<string, string> = {
  SOLICITACAO_DESENVOLVIMENTO: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
  OPORTUNIDADE: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50",
  PROPOSTA: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50",
  PRODUTO_CRU: "text-purple-600 bg-purple-50 dark:bg-purple-950/50",
  AMOSTRA: "text-amber-600 bg-amber-50 dark:bg-amber-950/50",
  REQUISICAO_CORTE: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
}

const TIPO_LABELS: Record<string, string> = {
  SOLICITACAO_DESENVOLVIMENTO: "Solic. Desenv.",
  OPORTUNIDADE: "Oportunidade",
  PROPOSTA: "Proposta",
  PRODUTO_CRU: "Produto",
  AMOSTRA: "Amostra",
  REQUISICAO_CORTE: "Req. Corte",
}

const TIPOS_COM_KANBAN = ["OPORTUNIDADE", "PROPOSTA"]

interface CadastroStatusProps {
  tipoInicial?: string
  mostrarFiltro?: boolean
  titulo?: string
  descricao?: string
}

export function CadastroStatus({
  tipoInicial = "",
  mostrarFiltro = true,
  titulo = "Status",
  descricao = "Gerencie os status disponíveis para cada módulo do sistema",
}: CadastroStatusProps) {
  const [lista, setLista] = useState<StatusCadastroItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    nome: "",
    rotulo: "",
    tipo: tipoInicial || "SOLICITACAO_DESENVOLVIMENTO",
    cor: "",
    ordem: 0,
    ativo: true,
    exibirKanban: true,
  })
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState(tipoInicial)
  const [gatilhoStatus, setGatilhoStatus] = useState<StatusCadastroItem | null>(null)

  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const podeEditar = role === "ADMIN" || role === "SUDO"

  useEffect(() => {
    setFiltroTipo(tipoInicial)
    setForm((prev) => ({ ...prev, tipo: tipoInicial || prev.tipo }))
  }, [tipoInicial])

  async function carregar() {
    setLoading(true)
    try {
      const url = filtroTipo ? `/api/admin/status?tipo=${filtroTipo}` : "/api/admin/status"
      const res = await fetch(url)
      const data = await res.json()
      setLista(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Erro ao carregar status")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [filtroTipo]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setForm({
      nome: "",
      rotulo: "",
      tipo: filtroTipo || "SOLICITACAO_DESENVOLVIMENTO",
      cor: "",
      ordem: 0,
      ativo: true,
      exibirKanban: true,
    })
    setEditId(null)
    setShowForm(false)
  }

  function editar(item: StatusCadastroItem) {
    setForm({
      nome: item.nome,
      rotulo: item.rotulo || "",
      tipo: item.tipo,
      cor: item.cor || "",
      ordem: item.ordem,
      ativo: item.ativo,
      exibirKanban: item.exibirKanban !== false,
    })
    setEditId(item.id)
    setShowForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório")
      return
    }
    setSaving(true)
    try {
      const method = editId ? "PUT" : "POST"
      const res = await fetch("/api/admin/status", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { ...form, id: editId } : form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar")
      }
      toast.success(editId ? "Status atualizado" : "Status criado")
      invalidarCacheStatuses()
      resetForm()
      carregar()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function excluir(id: number) {
    if (!confirm("Tem certeza que deseja excluir este status?")) return
    try {
      const res = await fetch("/api/admin/status", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Erro ao excluir")
      toast.success("Status excluído")
      invalidarCacheStatuses()
      carregar()
    } catch {
      toast.error("Erro ao excluir status")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">{titulo}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{descricao}</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="shrink-0"
          disabled={!podeEditar}
        >
          <Plus size={16} className="mr-1" /> Novo Status
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={salvar}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome (valor interno)</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="EX: PENDENTE"
              />
            </div>
            <div className="space-y-2">
              <Label>Rótulo (exibição)</Label>
              <Input
                value={form.rotulo}
                onChange={(e) => setForm({ ...form, rotulo: e.target.value })}
                placeholder="Ex: Pendente"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              >
                {TIPOS_STATUS.map((t: any) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cor (hex)</Label>
              <div className="flex gap-2">
                <Input
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  placeholder="#f59e0b"
                />
                {form.cor && (
                  <div
                    className="w-10 h-10 rounded border shrink-0"
                    style={{ backgroundColor: form.cor }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded"
                />
                Ativo
              </label>
            </div>
            {TIPOS_COM_KANBAN.includes(form.tipo) && (
              <div className="space-y-2 flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.exibirKanban}
                    onChange={(e) => setForm({ ...form, exibirKanban: e.target.checked })}
                    className="rounded"
                  />
                  Exibir no Kanban
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}
              {editId ? "Atualizar" : "Criar"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {mostrarFiltro && (
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Filtrar por tipo:</Label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm max-w-xs"
          >
            <option value="">Todos</option>
            {TIPOS_STATUS.map((t: any) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : lista.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Nenhum status encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Rótulo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Cor</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Ordem</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Ativo</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Kanban</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50"
                  >
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3">{item.rotulo || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_CORES[item.tipo] || ""}`}
                      >
                        {TIPO_LABELS[item.tipo] || item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.cor ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: item.cor }}
                          />
                          <span className="text-xs text-slate-500">{item.cor}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{item.ordem}</td>
                    <td className="px-4 py-3 text-center">
                      {item.ativo ? (
                        <Check size={16} className="text-green-500 inline" aria-label="Ativo" />
                      ) : (
                        <X size={16} className="text-red-400 inline" aria-label="Inativo" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {TIPOS_COM_KANBAN.includes(item.tipo) ? (
                        item.exibirKanban !== false ? (
                          <Check
                            size={16}
                            className="text-green-500 inline"
                            aria-label="Exibe no Kanban"
                          />
                        ) : (
                          <X
                            size={16}
                            className="text-red-400 inline"
                            aria-label="Não exibe no Kanban"
                          />
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {podeEditar && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setGatilhoStatus(item)}
                              title="Gatilhos"
                              aria-label={`Gatilhos do status ${item.rotulo || item.nome}`}
                            >
                              <Zap size={14} className="text-amber-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => editar(item)}
                              title="Editar"
                              aria-label={`Editar status ${item.rotulo || item.nome}`}
                            >
                              <Edit3 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => excluir(item.id)}
                              title="Excluir"
                              aria-label={`Excluir status ${item.rotulo || item.nome}`}
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StatusGatilhosDialog
        status={gatilhoStatus}
        open={gatilhoStatus !== null}
        onOpenChange={(open) => {
          if (!open) setGatilhoStatus(null)
        }}
      />
    </div>
  )
}
