"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { acoesParaTipo, acaoPorValor } from "@/lib/crm/status-acoes"

export interface StatusGatilhoStatus {
  id: number
  nome: string
  rotulo: string
  tipo: string
}

interface AcaoCadastrada {
  id: number
  statusId: number
  acao: string
  parametros: Record<string, any> | null
  ativo: boolean | null
}

interface StatusGatilhosDialogProps {
  status: StatusGatilhoStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StatusGatilhosDialog({ status, open, onOpenChange }: StatusGatilhosDialogProps) {
  const [lista, setLista] = useState<AcaoCadastrada[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [novaAcao, setNovaAcao] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [parametros, setParametros] = useState<Record<string, string>>({})

  const disponiveis = status ? acoesParaTipo(status.tipo) : []

  async function carregar() {
    if (!status) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/status/acoes?statusId=${status.id}`)
      const data = await res.json()
      setLista(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Erro ao carregar gatilhos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && status) {
      setEditId(null)
      setParametros({})
      setNovaAcao("")
      carregar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status?.id])

  async function adicionar() {
    if (!status || !novaAcao) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/status/acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: status.id, acao: novaAcao, parametros: {} }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao adicionar gatilho")
      }
      toast.success("Gatilho adicionado")
      setNovaAcao("")
      carregar()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function salvarParametros(item: AcaoCadastrada) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/status/acoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, parametros }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar gatilho")
      }
      toast.success("Gatilho atualizado")
      setEditId(null)
      setParametros({})
      carregar()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function alternar(item: AcaoCadastrada) {
    try {
      const res = await fetch("/api/admin/status/acoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ativo: item.ativo === false }),
      })
      if (!res.ok) throw new Error()
      toast.success(item.ativo === false ? "Gatilho ativado" : "Gatilho desativado")
      carregar()
    } catch {
      toast.error("Erro ao alterar gatilho")
    }
  }

  async function excluir(id: number) {
    if (!confirm("Tem certeza que deseja excluir este gatilho?")) return
    try {
      const res = await fetch("/api/admin/status/acoes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      toast.success("Gatilho excluído")
      carregar()
    } catch {
      toast.error("Erro ao excluir gatilho")
    }
  }

  function iniciarEdicao(item: AcaoCadastrada) {
    const definicao = acaoPorValor(item.acao)
    const valores: Record<string, string> = {}
    for (const campo of definicao?.campos || []) {
      valores[campo.nome] = String((item.parametros || {})[campo.nome] ?? "")
    }
    setParametros(valores)
    setEditId(item.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gatilhos do status</DialogTitle>
          <DialogDescription>
            Ações executadas automaticamente quando um registro entra no status{" "}
            <strong>{status?.rotulo || status?.nome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : lista.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Nenhum gatilho cadastrado para este status.
            </p>
          ) : (
            lista.map((item) => {
              const definicao = acaoPorValor(item.acao)
              const emEdicao = editId === item.id
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Zap size={13} className="text-amber-500" />
                        {definicao?.label || item.acao}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {definicao?.desc || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => alternar(item)}
                        aria-label={
                          item.ativo === false
                            ? `Ativar gatilho ${definicao?.label || item.acao}`
                            : `Desativar gatilho ${definicao?.label || item.acao}`
                        }
                      >
                        {item.ativo === false ? "Ativar" : "Desativar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => excluir(item.id)}
                        aria-label={`Excluir gatilho ${definicao?.label || item.acao}`}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {definicao && definicao.campos.length > 0 && (
                    <div className="space-y-2">
                      {definicao.campos.map((campo) => (
                        <div key={campo.nome} className="space-y-1">
                          <Label className="text-xs">{campo.label}</Label>
                          <Input
                            value={
                              emEdicao
                                ? parametros[campo.nome] || ""
                                : String((item.parametros || {})[campo.nome] ?? "")
                            }
                            placeholder={campo.placeholder}
                            disabled={!emEdicao}
                            onChange={(e) =>
                              setParametros((prev) => ({ ...prev, [campo.nome]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                      <div className="flex gap-2">
                        {emEdicao ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => salvarParametros(item)}
                              disabled={saving}
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditId(null)
                                setParametros({})
                              }}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => iniciarEdicao(item)}>
                            Editar parâmetros
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nova-acao-status">Adicionar gatilho</Label>
          <div className="flex gap-2">
            <select
              id="nova-acao-status"
              value={novaAcao}
              onChange={(e) => setNovaAcao(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Selecione uma ação</option>
              {disponiveis.map((acao) => (
                <option key={acao.value} value={acao.value}>
                  {acao.label}
                </option>
              ))}
            </select>
            <Button onClick={adicionar} disabled={!novaAcao || saving} className="gap-1">
              <Plus size={14} />
              Adicionar
            </Button>
          </div>
          {disponiveis.length === 0 && (
            <p className="text-xs text-slate-400">
              Não há ações disponíveis para status do tipo {status?.tipo}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
