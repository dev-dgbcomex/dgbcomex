"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, usePathname } from "next/navigation"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import Link from "next/link"
import { ArrowLeft, Save, Trash2, Building2, Loader2, Clock, MessageSquare, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { SelectSegmento } from "@/components/crm/select-segmento"
import { OportunidadesCard } from "@/components/crm/oportunidades-card"
import { ContatosVinculadosCard } from "@/components/crm/contatos-vinculados-card"
import { RepresentantesVinculadosCard } from "@/components/crm/representantes-vinculados-card"
import { AcoesProspeccaoCard } from "@/components/crm/acoes-prospeccao-card"
import { VisitasCard } from "@/components/crm/visitas-card"
import { TimelineIaChat } from "@/components/crm/timeline-ia-chat"
import CrmTimeline from "@/components/crm/crm-timeline"
import CrmWhatsapp from "@/components/crm/crm-whatsapp"
import ResumoIACard from "@/components/crm/resumo-ia-card"
import { HistoricoConversaoCard } from "./components/historico-conversao-card"
import type { HistoricoPromocao } from "@/lib/crm/historico-promocao"
import type { Cliente, VinculoRepresentante, RepresentanteResumo } from "../types"
import type { Contato } from "../../crm/contatos/types"
import { formatarDocumento } from "@/lib/documento"
import { statusAtivos, useStatuses } from "@/hooks/use-statuses"

async function fetchRepresentantes(query: string): Promise<RepresentanteResumo[]> {
  const res = await fetch(`/api/representantes?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error("Falha ao buscar")
  return res.json() as Promise<RepresentanteResumo[]>
}

async function fetchVinculos(clienteId: string): Promise<VinculoRepresentante[]> {
  const res = await fetch(`/api/clientes/${clienteId}/representantes`)
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json() as Promise<VinculoRepresentante[]>
}

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [id, setId] = useState<string>("")

  const queryClient = useQueryClient()
  const { statuses: statusCliente } = useStatuses("CLIENTE")

  const { data: vinculos = [], isLoading: loadingVinculos } = useQuery<VinculoRepresentante[]>({
    queryKey: ["cliente-representantes", id],
    queryFn: () => fetchVinculos(id),
    enabled: !!id,
  })

  const [searchRep, setSearchRep] = useState("")
  const [repResults, setRepResults] = useState<RepresentanteResumo[]>([])
  const [searchingRep, setSearchingRep] = useState(false)
  const [repToRemove, setRepToRemove] = useState<VinculoRepresentante | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [contatos, setContatos] = useState<Contato[]>([])
  const [loadingContatos, setLoadingContatos] = useState(false)
  const [orfaos, setOrfaos] = useState<Contato[]>([])
  const [atualizandoCNPJ, setAtualizandoCNPJ] = useState(false)

  const [historico, setHistorico] = useState<HistoricoPromocao | null>(null)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [resumoAbertoId, setResumoAbertoId] = useState<number | null>(null)

  useEffect(() => {
    async function loadCliente() {
      const { id: clientId } = await params
      setId(clientId)
      try {
        const res = await fetch(`/api/clientes/${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setCliente(data)
        } else {
          toast.error("Cliente não encontrado")
          router.push("/comercial/clientes")
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadCliente()
  }, [params, router])

  useEffect(() => {
    if (!id) return
    let ativo = true
    setLoadingContatos(true)
    Promise.all([
      fetch(`/api/crm/contatos?clienteId=${id}`).then((r) => r.json()),
      fetch("/api/crm/contatos?orfao=true").then((r) => r.json()),
    ])
      .then(([cts, orf]) => {
        if (!ativo) return
        if (Array.isArray(cts)) setContatos(cts)
        if (Array.isArray(orf)) setOrfaos(orf)
      })
      .catch(() => toast.error("Erro ao carregar contatos"))
      .finally(() => setLoadingContatos(false))
    return () => {
      ativo = false
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    let ativo = true
    setLoadingHistorico(true)
    fetch(`/api/clientes/${id}/historico`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!ativo) return
        setHistorico(data?.historico ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) setLoadingHistorico(false)
      })
    return () => {
      ativo = false
    }
  }, [id])

  async function adicionarContato() {
    const nome = prompt("Nome do novo contato:")
    if (!nome) return
    try {
      const res = await fetch("/api/crm/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, clienteId: id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Erro ao criar contato")
      }
      const novo = (await res.json()) as Contato
      setContatos((prev) => [...prev, novo])
      toast.success("Contato adicionado e vinculado ao cliente")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar contato")
    }
  }

  async function vincularContato(contatoId: number) {
    try {
      const res = await fetch(`/api/crm/contatos/${contatoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Erro ao vincular")
      }
      const atualizado = (await res.json()) as Contato
      setContatos((prev) => [...prev, atualizado])
      setOrfaos((prev) => prev.filter((c) => c.id !== contatoId))
      toast.success("Contato vinculado ao cliente")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular contato")
    }
  }

  async function removerContato(contatoId: number) {
    try {
      const res = await fetch(`/api/crm/contatos/${contatoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: null, clienteId: null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Erro ao desvincular")
      }
      const atualizado = (await res.json()) as Contato
      setContatos((prev) => prev.filter((c) => c.id !== contatoId))
      setOrfaos((prev) => [...prev, atualizado])
      toast.success("Contato desvinculado do cliente")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desvincular contato")
    }
  }

  async function searchRepresentantes(query: string) {
    setSearchRep(query)
    if (query.length < 2) {
      setRepResults([])
      return
    }
    setSearchingRep(true)
    try {
      const data = await fetchRepresentantes(query)
      const existentes = new Set(vinculos.map((v) => v.representanteId))
      setRepResults(data.filter((r) => !existentes.has(r.id)))
    } catch {
      setRepResults([])
    } finally {
      setSearchingRep(false)
    }
  }

  async function addRepresentante(representanteId: number) {
    try {
      const res = await fetch(`/api/clientes/${id}/representantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representanteId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao adicionar")
      }
      queryClient.invalidateQueries({ queryKey: ["cliente-representantes", id] })
      setSearchRep("")
      setRepResults([])
      toast.success("Representante vinculado ao cliente")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar")
    }
  }

  async function removeRepresentante(vinculo: { id: number }) {
    try {
      await fetch(`/api/clientes/${id}/representantes?vinculoId=${vinculo.id}`, {
        method: "DELETE",
      })
      queryClient.invalidateQueries({ queryKey: ["cliente-representantes", id] })
      toast.success("Representante removido do cliente")
    } catch {
      toast.error("Erro ao remover")
    }
    setRepToRemove(null)
  }

  async function atualizarDadosCNPJ() {
    if (!cliente) return
    const cnpjLimpo = (cliente.cnpj || "").replace(/\D/g, "")
    if (cnpjLimpo.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos")
      return
    }
    setAtualizandoCNPJ(true)
    try {
      const res = await fetch(`/api/crm/consulta-cnpj?cnpj=${cnpjLimpo}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao consultar CNPJ")
      }
      const data = await res.json()
      const api = data.apiData
      if (!api) {
        toast.error("CNPJ não encontrado na Receita Federal")
        return
      }

      const endereco = [
        api.logradouro,
        api.numero,
        api.bairro,
        api.complemento,
      ]
        .filter(Boolean)
        .join(", ")

      setCliente((prev) => {
        if (!prev) return null
        return {
          ...prev,
          nome: api.nome_fantasia || prev.nome,
          razaoSocial: api.razao_social || prev.razaoSocial,
          endereco: endereco || prev.endereco,
          cidade: api.municipio || prev.cidade,
          uf: api.uf || prev.uf,
        }
      })

      toast.success("Cliente atualizado com dados da Receita Federal")
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar dados do CNPJ")
    } finally {
      setAtualizandoCNPJ(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!cliente) return
    if (cliente.cnpj.replace(/\D/g, "").length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cliente),
      })

      if (res.ok) {
        toast.success("Cliente atualizado com sucesso!")
        router.push("/comercial/clientes")
      } else {
        const err = await res.json()
        throw new Error(err.error || "Erro ao atualizar")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar cliente")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof Cliente, value: string) => {
    const novoValor = field === "cnpj" ? (formatarDocumento(value, "CNPJ") ?? "") : value
    setCliente((prev) => (prev ? { ...prev, [field]: novoValor } : null))
  }

  const handleCheckboxChange = (field: keyof Cliente, checked: boolean) => {
    setCliente((prev) => (prev ? { ...prev, [field]: checked } : null))
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Erro ao excluir")
      }
      toast.success("Cliente excluído com sucesso!")
      router.push("/comercial/clientes")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir cliente")
    } finally {
      setDeleteLoading(false)
      setShowDelete(false)
    }
  }

  const statusClienteOpcoes = statusCliente.length
    ? statusAtivos(statusCliente)
    : [
        { nome: "ATIVO", rotulo: "Ativo" },
        { nome: "INATIVO", rotulo: "Inativo" },
      ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!cliente) return null

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="mb-6">
        <Link
          href="/comercial/clientes"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para Clientes
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Editar Cliente{info && <InfoButton content={info} />}
            </h1>
            <p className="text-sm text-slate-500">{cliente.nome}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nome / Fantasia *
              </label>
              <input
                type="text"
                value={cliente.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                CNPJ *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cliente.cnpj}
                  onChange={(e) => handleChange("cnpj", e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={atualizarDadosCNPJ}
                  disabled={atualizandoCNPJ || !cliente?.cnpj}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  title="Atualizar dados do CNPJ via Receita Federal"
                >
                  {atualizandoCNPJ ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Razão Social
              </label>
              <input
                type="text"
                value={cliente.razaoSocial || ""}
                onChange={(e) => handleChange("razaoSocial", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Segmento
              </label>
              <SelectSegmento
                value={cliente.segmento || ""}
                onChange={(v) => handleChange("segmento", v)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="status-cliente"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Status
              </label>
              <select
                id="status-cliente"
                value={cliente.status || "ATIVO"}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {statusClienteOpcoes.map((item) => (
                  <option key={item.nome} value={item.nome}>
                    {item.rotulo || item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={cliente.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                E-mail p/ Nota Fiscal
              </label>
              <input
                type="email"
                value={cliente.emailNf || ""}
                onChange={(e) => handleChange("emailNf", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Telefone
              </label>
              <input
                type="text"
                value={cliente.telefone || ""}
                onChange={(e) => handleChange("telefone", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Celular
              </label>
              <input
                type="text"
                value={cliente.celular || ""}
                onChange={(e) => handleChange("celular", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Contato
              </label>
              <input
                type="text"
                value={cliente.contato || ""}
                onChange={(e) => handleChange("contato", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Cidade
              </label>
              <input
                type="text"
                value={cliente.cidade || ""}
                onChange={(e) => handleChange("cidade", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">UF</label>
              <input
                type="text"
                value={cliente.uf || ""}
                onChange={(e) => handleChange("uf", e.target.value)}
                maxLength={2}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm uppercase"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Endereço
              </label>
              <input
                type="text"
                value={cliente.endereco || ""}
                onChange={(e) => handleChange("endereco", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ID Integração (ERP/WMS/CRM/OUTROS)
              </label>
              <input
                type="text"
                value={cliente.idIntegracao || ""}
                onChange={(e) => handleChange("idIntegracao", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                placeholder="Código do sistema externo"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
            <HistoricoConversaoCard historico={historico} carregando={loadingHistorico} />
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} />
              Excluir Cliente
            </button>
            <div className="flex gap-2">
              <Link
                href="/comercial/clientes"
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Building2 size={18} className="text-blue-500" />
            Relacionamentos do CRM
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tudo o que foi feito com este cliente — inclusive o negócio herdado das pessoas do CRM
            que viraram este cliente.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ContatosVinculadosCard
            contatos={contatos}
            orfaos={orfaos}
            carregando={loadingContatos}
            onAdd={adicionarContato}
            onVincular={vincularContato}
            onRemover={removerContato}
          />
          <RepresentantesVinculadosCard
            vinculos={vinculos}
            resultados={repResults}
            carregando={loadingVinculos}
            buscando={searchingRep}
            busca={searchRep}
            onBuscar={searchRepresentantes}
            onVincular={addRepresentante}
            onRemover={removeRepresentante}
          />
          <ResumoIACard
            tipo="cliente"
            id={id}
            nomeEntidade={cliente.nome}
            abertoId={resumoAbertoId}
            onAbertoIdChange={setResumoAbertoId}
          />
          <OportunidadesCard clienteId={id} />
          <AcoesProspeccaoCard clienteId={id} />
          <VisitasCard clienteId={id} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
              <Clock size={16} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Timeline</h2>
            </div>
            <CrmTimeline clienteId={id} onAbrirResumo={setResumoAbertoId} />
            <TimelineIaChat tipo="cliente" id={id} />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
              <MessageSquare size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">WhatsApp</h2>
            </div>
            <CrmWhatsapp clienteId={id} />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!repToRemove}
        title="Remover representante"
        message={`Deseja remover ${repToRemove?.nome} deste cliente?`}
        variant="danger"
        confirmLabel="Remover"
        onConfirm={() => repToRemove && removeRepresentante(repToRemove)}
        onCancel={() => setRepToRemove(null)}
      />
      <ConfirmModal
        open={showDelete}
        title="Excluir cliente?"
        message={`Tem certeza que deseja excluir "${cliente.nome}"? Os vínculos de representantes serão removidos e os registros de CRM (pessoas, contatos, oportunidades, propostas, visitas) ficarão sem cliente vinculado. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
