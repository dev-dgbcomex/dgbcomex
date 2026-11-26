"use client"

import { useState, useEffect } from "react"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { useRouter, usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { ArrowLeft, Save, Building2, User, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { QuickCreateLead } from "@/components/crm/quick-create-lead"
import { QuickCreateCliente } from "@/components/crm/quick-create-cliente"
import { QuickCreateVisitante } from "@/components/crm/quick-create-visitante"
import { SelectCliente } from "@/components/crm/select-cliente"
import { SelectComBusca, type OpcaoSelectBusca } from "@/components/ui/select-com-busca"
import { useStatuses, statusAtivos } from "@/hooks/use-statuses"
import { TipoEntidadeSelector } from "@/app/(dashboard)/comercial/crm/visitas/novo/components/tipo-entidade-selector"
import { validarCamposObrigatoriosOportunidade } from "@/lib/crm/validacao-oportunidade"
import type { EmpresaResumo, LeadResumo, UsuarioResumo, OportunidadeForm } from "../types"

type TipoEntidade = "CLIENTE" | "PESSOA" | "AVULSO"

export default function NovaOportunidadePage() {
  const router = useRouter()
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const queryClient = useQueryClient()
  const { statuses } = useStatuses("OPORTUNIDADE")
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([])
  const [leads, setLeads] = useState<LeadResumo[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([])
  const [saving, setSaving] = useState(false)
  const [tipoEntidade, setTipoEntidade] = useState<TipoEntidade | "">("")
  const [form, setForm] = useState<OportunidadeForm>({
    titulo: "",
    descricao: "",
    valorEstimado: "",
    empresaId: "",
    clienteId: "",
    leadId: "",
    responsavelId: "",
    dataFechamentoPrevista: "",
    probabilidade: "0",
    status: "",
  })

  function setField(field: keyof OportunidadeForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function loadEmpresas() {
    try {
      const res = await fetch("/api/crm/leads")
      const data = await res.json()
      if (Array.isArray(data)) setEmpresas(data)
    } catch {}
  }

  async function loadLeads() {
    try {
      const res = await fetch("/api/crm/visitantes")
      const data = await res.json()
      if (Array.isArray(data)) setLeads(data)
    } catch {}
  }

  function handleEmpresaCreated(id: number) {
    loadEmpresas()
    setField("empresaId", String(id))
  }

  function handleClienteCreated(id: number) {
    queryClient.invalidateQueries({ queryKey: ["clientes"] })
    setField("clienteId", String(id))
  }

  function handleLeadCreated(id: number) {
    loadLeads()
    setField("leadId", String(id))
  }

  function handleTrocar() {
    setTipoEntidade("")
    setField("empresaId", "")
    setField("clienteId", "")
  }

  useEffect(() => {
    async function load() {
      const [empresasRes, leadsRes, usuariosRes] = await Promise.allSettled([
        fetch("/api/crm/leads").then((r) => r.json()),
        fetch("/api/crm/visitantes").then((r) => r.json()),
        fetch("/api/usuarios/ativos?role=COMERCIAL,ADMIN,SUDO").then((r) => r.json()),
      ])
      if (empresasRes.status === "fulfilled" && Array.isArray(empresasRes.value))
        setEmpresas(empresasRes.value)
      if (leadsRes.status === "fulfilled" && Array.isArray(leadsRes.value)) setLeads(leadsRes.value)
      if (usuariosRes.status === "fulfilled" && Array.isArray(usuariosRes.value))
        setUsuarios(usuariosRes.value)
    }
    load()
  }, [])

  useEffect(() => {
    const disponiveis = statusAtivos(statuses)
    if (disponiveis.length > 0 && !form.status) {
      setField("status", disponiveis[0].nome)
    }
  }, [statuses])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast.error("Título é obrigatório")
      return
    }
    if (tipoEntidade === "PESSOA" && !form.empresaId) {
      toast.error("Selecione uma lead")
      return
    }
    if (tipoEntidade === "CLIENTE" && !form.clienteId) {
      toast.error("Selecione um cliente")
      return
    }

    const validacaoCriacao = validarCamposObrigatoriosOportunidade({
      status: form.status,
      valorEstimado: form.valorEstimado,
      probabilidade: form.probabilidade,
    })

    if (!validacaoCriacao.valido) {
      toast.error(validacaoCriacao.mensagem)
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/crm/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          valorEstimado: form.valorEstimado ? form.valorEstimado : null,
          empresaId: form.empresaId ? parseInt(form.empresaId) : null,
          clienteId: form.clienteId ? parseInt(form.clienteId) : null,
          leadId: form.leadId ? parseInt(form.leadId) : null,
          responsavelId: form.responsavelId ? parseInt(form.responsavelId) : null,
          dataFechamentoPrevista: form.dataFechamentoPrevista || null,
          probabilidade: form.probabilidade ? parseInt(form.probabilidade) : 0,
          status: form.status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao criar oportunidade")
      }
      toast.success("Oportunidade criada com sucesso")
      router.push("/comercial/crm/oportunidades")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar oportunidade")
    } finally {
      setSaving(false)
    }
  }

  const entidadeIcone =
    tipoEntidade === "CLIENTE" ? (
      <Building2 size={18} className="text-emerald-600" />
    ) : tipoEntidade === "AVULSO" ? (
      <User size={18} className="text-orange-600" />
    ) : (
      <UserCheck size={18} className="text-blue-600" />
    )

  const entidadeLabel =
    tipoEntidade === "CLIENTE"
      ? "Oportunidade de Cliente"
      : tipoEntidade === "AVULSO"
        ? "Oportunidade Avulsa"
        : "Oportunidade de Lead (Negócio)"

  const opcoesEmpresas: OpcaoSelectBusca[] = (empresas ?? []).map((empresa) => ({
    value: String(empresa.id),
    label: empresa.razaoSocial || empresa.nomeFantasia || `Lead ${empresa.id}`,
  }))
  const opcoesLeads: OpcaoSelectBusca[] = (leads ?? []).map((lead) => ({
    value: String(lead.id),
    label: lead.nome || `Lead ${lead.id}`,
  }))

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/comercial/crm/oportunidades"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Nova Oportunidade{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500">Cadastrar nova oportunidade de venda</p>
        </div>
      </div>

      {!tipoEntidade && (
        <TipoEntidadeSelector
          onSelect={(tipo) => setTipoEntidade(tipo === "AVULSA" ? "AVULSO" : tipo)}
          title="A quem pertence esta oportunidade?"
          description="Selecione o tipo de cliente para iniciar a oportunidade."
          labels={{
            clienteDesc: "Vincular a uma empresa cliente",
            leadDesc: "Vincular a uma lead (negócio)",
            avulsa: "Avulso",
            avulsaDesc: "Sem vínculo obrigatório (pode vincular)",
          }}
        />
      )}

      {tipoEntidade && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setField("titulo", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Venda de malha 100% algodão"
                required
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entidadeIcone}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {entidadeLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTrocar}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
              >
                Trocar
              </button>
            </div>
            {tipoEntidade === "AVULSO" && (
              <div className="sm:col-span-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
                Oportunidade sem vínculo obrigatório. Opcionalmente vincule a uma lead ou cliente.
              </div>
            )}
            {tipoEntidade === "AVULSO" ? (
              <>
                <div>
                  <label
                    htmlFor="oportunidade-empresa-avulsa"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Lead (Negócio)
                    <QuickCreateLead onCreated={handleEmpresaCreated} />
                  </label>
                  <SelectComBusca
                    id="oportunidade-empresa-avulsa"
                    valor={form.empresaId}
                    onChange={(valor) => setField("empresaId", valor)}
                    opcoes={opcoesEmpresas}
                    ariaLabel="Lead (Negócio)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente
                    <QuickCreateCliente onCreated={handleClienteCreated} />
                  </label>
                  <SelectCliente
                    value={form.clienteId}
                    onChange={(value) => setField("clienteId", value)}
                  />
                </div>
              </>
            ) : tipoEntidade === "CLIENTE" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cliente *
                  <QuickCreateCliente onCreated={handleClienteCreated} />
                </label>
                <SelectCliente
                  value={form.clienteId}
                  onChange={(value) => setField("clienteId", value)}
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="oportunidade-empresa"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Lead (Negócio) *
                  <QuickCreateLead onCreated={handleEmpresaCreated} />
                </label>
                <SelectComBusca
                  id="oportunidade-empresa"
                  valor={form.empresaId}
                  onChange={(valor) => setField("empresaId", valor)}
                  opcoes={opcoesEmpresas}
                  ariaLabel="Lead (Negócio)"
                  required
                />
              </div>
            )}
            <div>
              <label
                htmlFor="oportunidade-lead"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Lead
                <QuickCreateVisitante onCreated={handleLeadCreated} />
              </label>
              <SelectComBusca
                id="oportunidade-lead"
                valor={form.leadId}
                onChange={(valor) => setField("leadId", valor)}
                opcoes={opcoesLeads}
                ariaLabel="Lead"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Título
              </label>
              <select
                value={form.responsavelId}
                onChange={(e) => setField("responsavelId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor Estimado
              </label>
              <input
                type="number"
                step="0.01"
                value={form.valorEstimado}
                onChange={(e) => setField("valorEstimado", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Previsão de Fechamento
              </label>
              <input
                type="date"
                value={form.dataFechamentoPrevista}
                onChange={(e) => setField("dataFechamentoPrevista", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Probabilidade (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.probabilidade}
                onChange={(e) => setField("probabilidade", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusAtivos(statuses).map((s) => (
                  <option key={s.id} value={s.nome}>
                    {s.rotulo || s.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Título
              </label>
              <textarea
                value={form.descricao}
                onChange={(e) => setField("descricao", e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detalhes da oportunidade..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/comercial/crm/oportunidades"
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
      )}
    </div>
  )
}
