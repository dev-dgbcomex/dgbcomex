"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter, usePathname } from "next/navigation"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { SelectUf } from "@/components/crm/select-uf"
import { SelectCidade } from "@/components/crm/select-cidade"
import { SelectSegmento } from "@/components/crm/select-segmento"
import Link from "next/link"
import {
  ArrowLeft,
  Save,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { formatarDocumento } from "@/lib/documento"
import type { ConsultaCnpjData } from "@/app/(dashboard)/comercial/crm/leads/types"

export default function NovoClientePage() {
  const router = useRouter()
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    razaoSocial: "",
    email: "",
    emailNf: "",
    telefone: "",
    celular: "",
    contato: "",
    segmento: "",
    endereco: "",
    cidade: "",
    uf: "",
    idIntegracao: "",
  })
  const [saving, setSaving] = useState(false)
  const [consulting, setConsulting] = useState(false)
  const [consulted, setConsulted] = useState(false)
  const [apiData, setApiData] = useState<ConsultaCnpjData | null>(null)
  const [estadoId, setEstadoId] = useState<number | null>(null)
  const { data: estados = [] } = useQuery<{ id: number; uf: string }[]>({
    queryKey: ["crm-estados"],
    queryFn: async () => {
      const res = await fetch("/api/crm/estados")
      if (!res.ok) return []
      return res.json()
    },
  })

  useEffect(() => {
    if (form.uf) {
      const found = estados.find((e) => e.uf === form.uf)
      setEstadoId(found ? found.id : null)
    } else {
      setEstadoId(null)
    }
  }, [form.uf, estados])

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleConsultarCnpj() {
    const digits = (form.cnpj || "").replace(/\D/g, "")
    if (digits.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos")
      return
    }
    setConsulting(true)
    setConsulted(false)
    setApiData(null)
    try {
      const res = await fetch(`/api/crm/consulta-cnpj?cnpj=${digits}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro na consulta")
      }
      const result = await res.json()
      const api: ConsultaCnpjData | undefined = result.apiData
      if (!api) {
        setConsulted(true)
        toast.error("CNPJ não encontrado na Receita Federal")
        return
      }
      setApiData(api)
      setConsulted(true)
      setForm((prev) => ({
        ...prev,
        cnpj: formatarDocumento(digits, "CNPJ") ?? digits,
        nome: api.nome_fantasia || prev.nome,
        razaoSocial: api.razao_social || prev.razaoSocial,
        segmento:
          api.cnaes?.find((c) => c.is_principal)?.descricao ||
          api.cnae_principal_descricao ||
          prev.segmento,
        endereco:
          [api.logradouro, api.numero, api.complemento, api.bairro].filter(Boolean).join(", ") ||
          prev.endereco,
        cidade: api.municipio || prev.cidade,
        uf: api.uf || prev.uf,
        telefone:
          prev.telefone ||
          (api.telefones?.[0] ? `${api.telefones[0].ddd}${api.telefones[0].numero}` : ""),
      }))
      toast.success("Dados preenchidos automaticamente")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao consultar CNPJ")
    } finally {
      setConsulting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error("Nome fantasia é obrigatório")
      return
    }
    if (!form.cnpj.trim()) {
      toast.error("CNPJ é obrigatório")
      return
    }
    if (form.cnpj.replace(/\D/g, "").length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao cadastrar")
      }

      toast.success("Cliente cadastrado com sucesso!")
      const data = await res.json()
      router.push(`/comercial/clientes/${data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar cliente")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/comercial/clientes"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Novo Cliente{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500">Cadastre um novo cliente no sistema</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Fantasia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              CNPJ <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setField("cnpj", formatarDocumento(e.target.value, "CNPJ") ?? "")}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleConsultarCnpj())
                }

                placeholder="00.000.000/0000-00"
                className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
              <button
                type="button"
                onClick={handleConsultarCnpj}
                disabled={consulting}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:hover:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 rounded-lg transition-colors disabled:opacity-50"
              >
                {consulting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                <span className="hidden sm:inline">Consultar</span>
              </button>
            </div>
          </div>
          {consulted && !apiData && (
            <div className="sm:col-span-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                CNPJ não encontrado na Receita Federal. Preencha os dados manualmente.
              </p>
            </div>
          )}
          {apiData && (
            <div className="sm:col-span-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3 flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  {apiData.razao_social}
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                  {apiData.nome_fantasia} — {apiData.situacao_cadastral}
                </p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Razão Social
            </label>
            <input
              type="text"
              value={form.razaoSocial}
              onChange={(e) => setField("razaoSocial", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Segmento
            </label>
            <SelectSegmento value={form.segmento} onChange={(v) => setField("segmento", v)} />
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Contato
            </h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome do Contato
            </label>
            <input
              type="text"
              value={form.contato}
              onChange={(e) => setField("contato", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Telefone
            </label>
            <input
              type="text"
              value={form.telefone}
              onChange={(e) => setField("telefone", e.target.value)}
              placeholder="(00) 0000-0000"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Celular
            </label>
            <input
              type="text"
              value={form.celular}
              onChange={(e) => setField("celular", e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="contato@exemplo.com"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              E-mail para NF-e
            </label>
            <input
              type="email"
              value={form.emailNf}
              onChange={(e) => setField("emailNf", e.target.value)}
              placeholder="nf@exemplo.com"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Endereço
            </h3>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Endereço
            </label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setField("endereco", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              UF
            </label>
            <SelectUf value={form.uf} onChange={(v) => setField("uf", v)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cidade
            </label>
            <SelectCidade
              value={form.cidade}
              onChange={(v) => setField("cidade", v)}
              estadoId={estadoId}
            />
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Integração
            </h3>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              ID Integração (ERP/WMS/CRM/OUTROS)
            </label>
            <input
              type="text"
              value={form.idIntegracao}
              onChange={(e) => setField("idIntegracao", e.target.value)}
              placeholder="Código do sistema externo"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/comercial/clientes"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  )
}
