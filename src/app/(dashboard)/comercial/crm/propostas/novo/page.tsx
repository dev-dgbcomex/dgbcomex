"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { Suspense, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Loader2, ArrowLeft, Building2, User, UserCheck } from "lucide-react"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import Link from "next/link"
import { QuickCreateLead } from "@/components/crm/quick-create-lead"
import { QuickCreateCliente } from "@/components/crm/quick-create-cliente"
import { QuickCreateOportunidade } from "@/components/crm/quick-create-oportunidade"
import { SelectCliente } from "@/components/crm/select-cliente"
import { SelectComBusca, type OpcaoSelectBusca } from "@/components/ui/select-com-busca"
import { TipoEntidadeSelector } from "@/app/(dashboard)/comercial/crm/visitas/novo/components/tipo-entidade-selector"
import type { Proposta, PropostaCreate } from "../types"
import type { EmpresaResumo, Oportunidade } from "../../oportunidades/types"

async function fetchEmpresas() {
  const res = await fetch("/api/crm/leads")
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json() as Promise<EmpresaResumo[]>
}

async function fetchOportunidades() {
  const res = await fetch("/api/crm/oportunidades")
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json() as Promise<Oportunidade[]>
}

type TipoEntidade = "CLIENTE" | "PESSOA" | "AVULSO"

function NovaPropostaContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const info = getInfoContent(pathname)
  const queryClient = useQueryClient()
  const [tipoEntidade, setTipoEntidade] = useState<TipoEntidade | "">("")
  const [titulo, setTitulo] = useState("")
  const [empresaId, setEmpresaId] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [oportunidadeId, setOportunidadeId] = useState("")
  const [valor, setValor] = useState("")
  const [descricao, setDescricao] = useState("")
  const [condicoesPagamento, setCondicoesPagamento] = useState("")
  const [prazoEntrega, setPrazoEntrega] = useState("")
  const [arquivoUrl, setArquivoUrl] = useState("")

  useEffect(() => {
    const opId = searchParams.get("oportunidadeId")
    if (!opId) return
    setOportunidadeId(opId)
  }, [searchParams])

  const { data: empresas } = useQuery<EmpresaResumo[]>({
    queryKey: ["crm-pessoas"],
    queryFn: fetchEmpresas,
  })
  const { data: oportunidades } = useQuery<Oportunidade[]>({
    queryKey: ["crm-oportunidades"],
    queryFn: fetchOportunidades,
  })

  useEffect(() => {
    if (!oportunidadeId || !Array.isArray(oportunidades)) return
    const opId = Number(oportunidadeId)
    const op = oportunidades.find((o) => Number(o.id) === opId)
    if (!op) return
    if (op.empresaId) {
      setTipoEntidade("PESSOA")
      setEmpresaId(String(op.empresaId))
    } else if (op.clienteId) {
      setTipoEntidade("CLIENTE")
      setClienteId(String(op.clienteId))
    }
  }, [oportunidadeId, oportunidades])

  function handleEmpresaCreated(id: number) {
    queryClient.invalidateQueries({ queryKey: ["crm-pessoas"] })
    setEmpresaId(String(id))
  }

  function handleClienteCreated(id: number) {
    queryClient.invalidateQueries({ queryKey: ["clientes"] })
    setClienteId(String(id))
  }

  function handleOportunidadeCreated(id: number) {
    queryClient.invalidateQueries({ queryKey: ["crm-oportunidades"] })
    setOportunidadeId(String(id))
  }

  function handleTrocar() {
    setTipoEntidade("")
    setEmpresaId("")
    setClienteId("")
  }

  const mutation = useMutation({
    mutationFn: async (body: PropostaCreate) => {
      const res = await fetch("/api/crm/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Falha ao criar proposta")
      return res.json() as Promise<Proposta>
    },
    onSuccess: (data) => {
      router.push(`/comercial/crm/propostas/${data.id}`)
    },
  })

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
      ? "Proposta para Cliente"
      : tipoEntidade === "AVULSO"
        ? "Proposta Avulsa"
        : "Proposta para Pessoa (Negócio)"

  const opcoesEmpresas: OpcaoSelectBusca[] = (empresas || []).map((empresa) => ({
    value: String(empresa.id),
    label: empresa.razaoSocial || empresa.nomeFantasia || `Lead ${empresa.id}`,
  }))
  const opcoesOportunidades: OpcaoSelectBusca[] = (oportunidades || []).map((oportunidade) => ({
    value: String(oportunidade.id),
    label: oportunidade.titulo,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/comercial/crm/propostas"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Nova Proposta{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Preencha os dados da proposta comercial
          </p>
        </div>
      </div>

      {!tipoEntidade && (
        <TipoEntidadeSelector
          onSelect={(tipo) => setTipoEntidade(tipo === "AVULSA" ? "AVULSO" : tipo)}
          title="Para quem é esta proposta?"
          description="Selecione o tipo de cliente para iniciar a proposta."
          labels={{
            clienteDesc: "Vincular a uma empresa cliente",
            leadDesc: "Vincular a uma lead (negócio)",
            avulsa: "Avulso",
            avulsaDesc: "Sem vínculo obrigatório (pode vincular)",
          }}
        />
      )}

      {tipoEntidade && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Proposta Comercial - Tecido X"
            />
          </div>

          <div className="flex items-center justify-between">
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
            <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
              Proposta sem vínculo obrigatório. Opcionalmente vincule a uma pessoa ou cliente.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {tipoEntidade === "AVULSO" ? (
              <>
                <div>
                  <label
                    htmlFor="proposta-empresa-avulsa"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Pessoa (Negócio)
                    <QuickCreateLead onCreated={handleEmpresaCreated} />
                  </label>
                  <SelectComBusca
                    id="proposta-empresa-avulsa"
                    valor={empresaId}
                    onChange={setEmpresaId}
                    opcoes={opcoesEmpresas}
                    ariaLabel="Pessoa (Negócio)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente
                    <QuickCreateCliente onCreated={handleClienteCreated} />
                  </label>
                  <SelectCliente value={clienteId} onChange={setClienteId} />
                </div>
              </>
            ) : tipoEntidade === "CLIENTE" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cliente *
                  <QuickCreateCliente onCreated={handleClienteCreated} />
                </label>
                <SelectCliente value={clienteId} onChange={setClienteId} />
              </div>
            ) : (
              <div>
              <label
                htmlFor="proposta-empresa"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Pessoa (Negócio) *
                <QuickCreateLead onCreated={handleEmpresaCreated} />
              </label>
              <SelectComBusca
                id="proposta-empresa"
                valor={empresaId}
                onChange={setEmpresaId}
                opcoes={opcoesEmpresas}
                ariaLabel="Pessoa (Negócio)"
                required
              />
              </div>
            )}
            <div>
              <label
                htmlFor="proposta-oportunidade"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Oportunidade
                <QuickCreateOportunidade
                  empresaId={empresaId}
                  onCreated={handleOportunidadeCreated}
                />
              </label>
              <SelectComBusca
                id="proposta-oportunidade"
                valor={oportunidadeId}
                onChange={setOportunidadeId}
                opcoes={opcoesOportunidades}
                vazio="Nenhuma"
                ariaLabel="Oportunidade"
                placeholderBusca="Digite o título da oportunidade..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prazo de Entrega
              </label>
              <input
                type="text"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 30 dias"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Condições de Pagamento
            </label>
            <input
              type="text"
              value={condicoesPagamento}
              onChange={(e) => setCondicoesPagamento(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 30/60/90 dias"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Título
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detalhes da proposta..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Link do Arquivo (PDF)
            </label>
            <input
              type="url"
              value={arquivoUrl}
              onChange={(e) => setArquivoUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
            <p className="text-[10px] text-slate-400 mt-1">
              URL do PDF hospedado (Blob storage futuramente)
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link
              href="/comercial/crm/propostas"
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={() =>
                mutation.mutate({
                  titulo,
                  empresaId: empresaId ? parseInt(empresaId) : null,
                  clienteId: clienteId ? parseInt(clienteId) : null,
                  oportunidadeId: oportunidadeId ? parseInt(oportunidadeId) : null,
                  valor: valor ? parseFloat(valor) : null,
                  descricao,
                  condicoesPagamento,
                  prazoEntrega,
                  arquivoUrl: arquivoUrl || null,
                })
              }
              disabled={
                !titulo ||
                (tipoEntidade === "PESSOA"
                  ? !empresaId
                  : tipoEntidade === "CLIENTE"
                    ? !clienteId
                    : false) ||
                mutation.isPending
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Criar Proposta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NovaPropostaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NovaPropostaContent />
    </Suspense>
  )
}
