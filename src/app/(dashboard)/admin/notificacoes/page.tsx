"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Save, Bell, ArrowLeft, ShieldCheck, Send } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"

interface Regra {
  tipo: string
  roles: string[]
}

const TIPO_REGRA_GLOBAL = "TODOS"

const ALL_ROLES = [
  "COMERCIAL",
  "CRM",
  "DESENVOLVIMENTO",
  "ADMIN",
  "SUDO",
  "QUALIDADE",
  "TECELAGEM",
  "BENEFICIAMENTO",
  "PCP",
]

const TIPO_LABEL: Record<string, string> = {
  SOLICITACAO_CRIADA: "Solicitação Criada",
  SOLICITACAO_APROVADA: "Solicitação Aprovada",
  SOLICITACAO_REPROVADA: "Solicitação Reprovada",
  SOLICITACAO_ATUALIZADA: "Solicitação Atualizada",
  PRODUTO_CRU_CRIADO: "Produto Criado",
  PRODUTO_CRU_ATUALIZADO: "Produto Atualizado",
  PRODUTO_CRU_EXCLUIDO: "Produto Excluído",
  AMOSTRA_CRIADA: "Amostra Criada",
  AMOSTRA_APROVADA: "Amostra Aprovada",
  AMOSTRA_REPROVADA: "Amostra Reprovada",
  AMOSTRA_ATUALIZADA: "Amostra Atualizada",
  AMOSTRA_EXCLUIDA: "Amostra Excluída",
  ACABAMENTO_CRIADO: "Acabamento Criado",
  ACABAMENTO_EXCLUIDO: "Acabamento Excluído",
  REQUISICAO_CORTE: "Requisição de Corte",
  REQUISICAO_CORTE_STATUS: "Requisição de Corte — Status Alterado",
  LEAD_CRIADO: "Lead Criado",
  LEAD_ATUALIZADO: "Lead Atualizado",
  OPORTUNIDADE_CRIADA: "Oportunidade Criada",
  OPORTUNIDADE_ATUALIZADA: "Oportunidade Atualizada",
  OPORTUNIDADE_STATUS: "Oportunidade — Status Alterado",
  PESSOA_CRIADA: "Pessoa Criada",
  PESSOA_ATUALIZADA: "Pessoa Atualizada",
  CONTATO_CRIADO: "Contato Criado",
  CONTATO_ATUALIZADO: "Contato Atualizado",
  TAREFA_CRIADA: "Tarefa Criada",
  TAREFA_ATUALIZADA: "Tarefa Atualizada",
  VISITA_CRIADA: "Visita Criada",
  VISITA_ATUALIZADA: "Visita Atualizada",
  PROPOSTA_CRIADA: "Proposta Criada",
  PROPOSTA_ATUALIZADA: "Proposta Atualizada",
  CAMPANHA_CRIADA: "Campanha Criada",
  CAMPANHA_ATUALIZADA: "Campanha Atualizada",
  EQUIPE_CRIADA: "Equipe Criada",
  EQUIPE_ATUALIZADA: "Equipe Atualizada",
  REGIAO_CRIADA: "Região Criada",
  REGIAO_ATUALIZADA: "Região Atualizada",
  ATIVIDADE_COMERCIAL: "Atividade Comercial (outras contas)",
}

export default function NotificacoesAdminPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [regras, setRegras] = useState<Regra[]>([])
  const [rolesGlobais, setRolesGlobais] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [dirty, setDirty] = useState(false)

  const {
    data: regrasData,
    isLoading: loading,
    isError,
  } = useQuery<{ regras: Regra[]; regrasGlobais?: Regra }>({
    queryKey: ["admin-notificacao-regras"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notificacao-regras")
      if (!res.ok) throw new Error("Erro HTTP")
      return res.json()
    },
  })

  useEffect(() => {
    if (regrasData) setRegras(regrasData.regras ?? [])
  }, [regrasData])

  useEffect(() => {
    if (regrasData?.regrasGlobais) setRolesGlobais(regrasData.regrasGlobais.roles ?? [])
  }, [regrasData])

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar regras de notificação")
  }, [isError])

  function toggleRole(tipo: string, role: string) {
    setRegras((prev) =>
      prev.map((r: any) => {
        if (r.tipo !== tipo) return r
        const next = r.roles.includes(role)
          ? r.roles.filter((x: any) => x !== role)
          : [...r.roles, role]
        return { ...r, roles: next }
      })
    )
    setDirty(true)
  }

  function selectAll(tipo: string, checked: boolean) {
    setRegras((prev) =>
      prev.map((r: any) => {
        if (r.tipo !== tipo) return r
        return { ...r, roles: checked ? [...ALL_ROLES] : [] }
      })
    )
    setDirty(true)
  }

  function toggleRoleGlobal(role: string) {
    setRolesGlobais((prev) =>
      prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]
    )
    setDirty(true)
  }

  async function salvar() {
    setSaving(true)
    try {
      const resGlobal = await fetch("/api/admin/notificacao-regras", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: TIPO_REGRA_GLOBAL, roles: rolesGlobais }),
      })
      if (!resGlobal.ok) throw new Error("Erro ao salvar a regra global")

      for (const regra of regras) {
        const res = await fetch("/api/admin/notificacao-regras", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: regra.tipo, roles: regra.roles }),
        })
        if (!res.ok) throw new Error(`Erro ao salvar regra ${regra.tipo}`)
      }
      toast.success("Regras de notificação salvas!")
      setDirty(false)
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function enviarTesteAdmins() {
    setSending(true)
    try {
      const res = await fetch("/api/admin/notificacao-regras/enviar-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erro ao enviar notificação")
      if (data.erroEmail) {
        toast.error(`Notificação criada, mas o e-mail falhou: ${data.erroEmail}`)
      } else {
        toast.success(
          `Notificação enviada para ${data.usuariosNotificados} administrador(es) — ${data.emailsEnviados} e-mail(s)`
        )
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar notificação")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/configuracoes"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Bell className="text-blue-600" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Notificações por Tipo{info && <InfoButton content={info} />}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Selecione quais perfis recebem notificação para cada tipo de evento
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" size={20} />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Perfis que recebem todas as notificações
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Os perfis marcados aqui recebem <strong>todas</strong> as notificações do sistema —
                inclusive as que não têm regra por tipo — no sino do cabeçalho e por e-mail. Por
                padrão: ADMIN e SUDO.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ALL_ROLES.map((role: any) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={rolesGlobais.includes(role)}
                    onChange={() => toggleRoleGlobal(role)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {role}
                </label>
              ))}
            </div>
            <button
              onClick={enviarTesteAdmins}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              {sending ? "Enviando..." : "Enviar teste para os administradores"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300 min-w-[180px]">
                Tipo de Notificação
              </th>
              {ALL_ROLES.map((role: any) => (
                <th
                  key={role}
                  className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300 text-xs"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regras.map((regra: any) => (
              <tr
                key={regra.tipo}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <span>{TIPO_LABEL[regra.tipo] || regra.tipo}</span>
                    <input
                      type="checkbox"
                      checked={regra.roles.length === ALL_ROLES.length}
                      onChange={(e) => selectAll(regra.tipo, e.target.checked)}
                      title="Marcar/desmarcar todas"
                      className="h-3.5 w-3.5 accent-blue-600 ml-2"
                    />
                  </div>
                </td>
                {ALL_ROLES.map((role: any) => (
                  <td key={role} className="p-2 text-center">
                    <label className="flex items-center justify-center w-8 h-8 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mx-auto">
                      <input
                        type="checkbox"
                        checked={regra.roles.includes(role)}
                        onChange={() => toggleRole(regra.tipo, role)}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={salvar}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? "Salvando..." : "Salvar Regras"}
        </button>
      </div>
    </div>
  )
}
