"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, EyeOff, Loader2, Save, ShieldCheck } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import {
  ROLES_CAMPO_VISIBILIDADE,
  chaveRegra,
  roleEhAdministrativa,
  type CadastroVisibilidadeCatalogo,
} from "@/lib/campos-visiveis/catalogo"

interface RespostaCamposVisiveis {
  catalogo: CadastroVisibilidadeCatalogo[]
  regras: Record<string, string[]>
}

export default function CamposVisiveisAdminPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [cadastroSelecionado, setCadastroSelecionado] = useState("")
  const [regras, setRegras] = useState<Record<string, string[]>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    data,
    isLoading,
    isError,
  } = useQuery<RespostaCamposVisiveis>({
    queryKey: ["admin-campos-visiveis"],
    queryFn: async () => {
      const res = await fetch("/api/admin/campos-visiveis")
      if (!res.ok) throw new Error("Erro ao carregar regras")
      return res.json()
    },
  })

  useEffect(() => {
    if (!data) return
    setRegras(data.regras ?? {})
    setCadastroSelecionado((atual) => atual || data.catalogo[0]?.cadastro || "")
  }, [data])

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar regras de visibilidade")
  }, [isError])

  const cadastro = data?.catalogo.find((item) => item.cadastro === cadastroSelecionado)
  const campos = cadastro?.campos ?? []

  function toggleRole(campo: string, role: string) {
    const chave = chaveRegra(cadastroSelecionado, campo)
    setRegras((anterior) => {
      const atuais = anterior[chave] ?? []
      return {
        ...anterior,
        [chave]: atuais.includes(role) ? atuais.filter((item) => item !== role) : [...atuais, role],
      }
    })
    setDirty(true)
  }

  async function salvar() {
    if (!cadastro) return
    setSaving(true)
    try {
      for (const campo of cadastro.campos) {
        const chave = chaveRegra(cadastro.cadastro, campo.campo)
        const res = await fetch("/api/admin/campos-visiveis", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cadastro: cadastro.cadastro,
            campo: campo.campo,
            rolesOcultos: regras[chave] ?? [],
          }),
        })
        if (!res.ok) throw new Error(`Erro ao salvar ${campo.rotulo}`)
      }
      toast.success("Regras de visibilidade salvas!")
      setDirty(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
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
          aria-label="Voltar para Configurações"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <EyeOff className="text-blue-600" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Campos Visíveis{info && <InfoButton content={info} />}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Selecione em quais cadastros cada campo deve ficar oculto por perfil
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
            size={20}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Regras por perfil
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Marque <strong>Oculto</strong> para impedir que o perfil veja o campo na tela e na API.
              ADMIN e SUDO sempre enxergam todos os campos.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label
          htmlFor="cadastro-visibilidade"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Cadastro
        </label>
        <select
          id="cadastro-visibilidade"
          value={cadastroSelecionado}
          onChange={(event) => {
            setCadastroSelecionado(event.target.value)
            setDirty(false)
          }}
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
        >
          {(data?.catalogo ?? []).map((item) => (
            <option key={item.cadastro} value={item.cadastro}>
              {item.rotulo}
            </option>
          ))}
        </select>
        {cadastro && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{cadastro.descricao}</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <th
                scope="col"
                className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300 min-w-[220px]"
              >
                Campo
              </th>
              {ROLES_CAMPO_VISIBILIDADE.map((role) => (
                <th
                  key={role}
                  scope="col"
                  className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300 text-xs"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campos.map((campo) => {
              const chave = chaveRegra(cadastroSelecionado, campo.campo)
              return (
                <tr
                  key={campo.campo}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <td className="p-3">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {campo.rotulo}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {campo.descricao}
                    </div>
                  </td>
                  {ROLES_CAMPO_VISIBILIDADE.map((role) => {
                    const administrativo = roleEhAdministrativa(role)
                    return (
                      <td key={role} className="p-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Ocultar ${campo.rotulo} para ${role}`}
                          title={
                            administrativo
                              ? "ADMIN e SUDO sempre enxergam todos os campos"
                              : `Ocultar ${campo.rotulo} para ${role}`
                          }
                          checked={(regras[chave] ?? []).includes(role)}
                          disabled={administrativo}
                          onChange={() => toggleRole(campo.campo, role)}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={salvar}
          disabled={!dirty || saving || !cadastro}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? "Salvando..." : "Salvar Regras"}
        </button>
      </div>
    </div>
  )
}
