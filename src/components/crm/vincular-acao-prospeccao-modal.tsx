"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Link as LinkIcon, Plus } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SelectComBusca, type OpcaoSelectBusca } from "@/components/ui/select-com-busca"
import { QuickCreateCliente } from "./quick-create-cliente"
import { QuickCreateLead } from "./quick-create-lead"

type TipoVinculo = "CLIENTE" | "PESSOA" | ""
type ClienteOpcao = { id: number; nome?: string | null }
type PessoaOpcao = { id: number; razaoSocial?: string | null; nomeFantasia?: string | null }
type CorpoVinculo = {
  clienteId?: number
  empresaId?: number | null
  nomeAvulso: string | null
}

type Props = {
  acaoId: number
  open: boolean
  onClose: () => void
  onLinked: () => void
}

export default function VincularAcaoProspeccaoModal({ acaoId, open, onClose, onLinked }: Props) {
  const [tipo, setTipo] = useState<TipoVinculo>("")
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [createOpenPessoa, setCreateOpenPessoa] = useState(false)

  useEffect(() => {
    if (!open) {
      setTipo("")
      setSelectedId("")
      setCreateOpen(false)
      setCreateOpenPessoa(false)
    }
  }, [open])

  const {
    data: lista = [],
    isLoading: loadingList,
    isError,
  } = useQuery<Array<ClienteOpcao | PessoaOpcao>>({
    queryKey: ["vincular-acao-prospeccao-lista", tipo],
    queryFn: async () => {
      const url = tipo === "CLIENTE" ? "/api/clientes" : "/api/crm/leads"
      const res = await fetch(url)
      const data: unknown = await res.json()
      return Array.isArray(data) ? (data as Array<ClienteOpcao | PessoaOpcao>) : []
    },
    enabled: !!tipo,
  })

  useEffect(() => {
    if (tipo) setSelectedId("")
  }, [tipo])

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar lista")
  }, [isError])

  async function linkAcao(body: CorpoVinculo, successMsg: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/acoes-prospeccao/${acaoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err: unknown = await res.json()
        const message =
          typeof err === "object" && err !== null && "error" in err
            ? String((err as { error: unknown }).error)
            : "Erro ao vincular"
        throw new Error(message)
      }
      toast.success(successMsg)
      onLinked()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!selectedId) {
      toast.error(`Selecione um${tipo === "CLIENTE" ? " cliente" : "a pessoa"}`)
      return
    }
    const body: CorpoVinculo = { nomeAvulso: null }
    if (tipo === "CLIENTE") {
      body.clienteId = parseInt(selectedId, 10)
      body.empresaId = null
    } else {
      body.empresaId = parseInt(selectedId, 10)
      body.clienteId = undefined
    }
    await linkAcao(body, "Ação de Prospecção vinculada com sucesso!")
  }

  async function handleClienteCreated(id: number, nome: string) {
    await linkAcao(
      { clienteId: id, empresaId: null, nomeAvulso: null },
      `Cliente "${nome}" criado e vinculado à ação de prospecção!`
    )
  }

  async function handlePessoaCreated(id: number, razaoSocial: string) {
    await linkAcao(
      { empresaId: id, clienteId: undefined, nomeAvulso: null },
      `Pessoa "${razaoSocial}" criada e vinculada à ação de prospecção!`
    )
  }

  const opcoesVinculo: OpcaoSelectBusca[] = lista.map((item) => ({
    value: String(item.id),
    label:
      tipo === "CLIENTE"
        ? (item as ClienteOpcao).nome || "Cliente"
        : (item as PessoaOpcao).razaoSocial ||
          (item as PessoaOpcao).nomeFantasia ||
          "Pessoa",
  }))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon size={18} className="text-orange-500" />
            Vincular Ação de Prospecção Avulsa
          </DialogTitle>
        </DialogHeader>

        {!tipo ? (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTipo("CLIENTE")}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
            >
              <span className="text-sm font-semibold text-emerald-600">Cliente</span>
              <span className="text-xs text-slate-500 text-center">
                Vincular a um cliente existente
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTipo("PESSOA")}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
            >
              <span className="text-sm font-semibold text-blue-600">Lead</span>
              <span className="text-xs text-slate-500 text-center">
                Vincular a uma lead (negócio)
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {tipo === "CLIENTE" ? "Selecione o Cliente" : "Selecione a Lead"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTipo("")
                  setSelectedId("")
                }}
                className="text-xs text-slate-500 hover:underline"
              >
                Trocar
              </button>
            </div>

            {loadingList ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : (
              <SelectComBusca
                id="vincular-acao-entidade"
                valor={selectedId}
                onChange={setSelectedId}
                opcoes={opcoesVinculo}
                ariaLabel={tipo === "CLIENTE" ? "Selecione o Cliente" : "Selecione a Lead"}
                placeholderBusca={
                  tipo === "CLIENTE"
                    ? "Digite o nome do cliente..."
                    : "Digite o nome da lead..."
                }
              />
            )}

            {tipo === "CLIENTE" && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">ou crie um novo</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                >
                  <Plus size={14} />
                  Criar novo cliente
                </button>
                <QuickCreateCliente
                  open={createOpen}
                  onOpenChange={setCreateOpen}
                  onCreated={handleClienteCreated}
                />
              </div>
            )}

            {tipo === "PESSOA" && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">ou crie um novo</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpenPessoa(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                >
                  <Plus size={14} />
                  Criar nova lead
                </button>
                <QuickCreateLead
                  open={createOpenPessoa}
                  onOpenChange={setCreateOpenPessoa}
                  onCreated={handlePessoaCreated}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || !selectedId}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                {loading ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
