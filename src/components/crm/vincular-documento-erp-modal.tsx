"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Link2, Search, Receipt, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { FaturamentoErp, ListaErp, PedidoErp, TipoVinculoErp } from "@/lib/erp/tipos"

type Props = {
  open: boolean
  tipo: TipoVinculoErp
  oportunidadeId: number
  /** CNPJ da pessoa da oportunidade: usado para filtrar os documentos do ERP. */
  cnpjPessoa?: string | null
  onClose: () => void
  onVinculado: () => void
}

function formatarMoeda(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(valor || 0)
  )
}

export default function VincularDocumentoErpModal({
  open,
  tipo,
  oportunidadeId,
  cnpjPessoa,
  onClose,
  onVinculado,
}: Props) {
  const [busca, setBusca] = useState("")
  const [somentePessoa, setSomentePessoa] = useState(true)
  const [vinculando, setVinculando] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setBusca("")
      setVinculando(null)
    }
  }, [open])

  const cnpj = somentePessoa ? cnpjPessoa || "" : ""

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["erp-documentos", tipo, busca, cnpj],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (busca.trim()) params.set("busca", busca.trim())
      if (cnpj) params.set("cnpj", cnpj)
      params.set("porPagina", "30")
      const url =
        tipo === "PEDIDO"
          ? `/api/crm/erp/pedidos?${params.toString()}`
          : `/api/crm/erp/faturamentos?${params.toString()}`
      const res = await fetch(url)
      const corpo = await res.json().catch(() => null)
      if (!res.ok) throw new Error(corpo?.error || "Erro ao carregar documentos do ERP")
      return corpo as ListaErp<PedidoErp | FaturamentoErp>
    },
    enabled: open,
    retry: false,
  })

  const itens = data?.itens || []

  async function vincular(documento: PedidoErp | FaturamentoErp) {
    const chave =
      tipo === "PEDIDO"
        ? `${documento.empresa}/${documento.pedido}`
        : `${documento.empresa}/${(documento as FaturamentoErp).pedido}/${(documento as FaturamentoErp).nr_nota}`
    setVinculando(chave)
    try {
      const res = await fetch(`/api/crm/oportunidades/${oportunidadeId}/vinculos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          empresa: documento.empresa,
          pedido: tipo === "PEDIDO" ? documento.pedido : (documento as FaturamentoErp).pedido,
          nota: tipo === "FATURAMENTO" ? (documento as FaturamentoErp).nr_nota : undefined,
        }),
      })
      const corpo = await res.json().catch(() => null)
      if (!res.ok) throw new Error(corpo?.error || "Erro ao vincular documento do ERP")
      toast.success(
        tipo === "PEDIDO"
          ? `Pedido ${documento.pedido} vinculado`
          : `Faturamento ${(documento as FaturamentoErp).nr_nota} vinculado`
      )
      onVinculado()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular documento do ERP")
    } finally {
      setVinculando(null)
    }
  }

  const titulo = tipo === "PEDIDO" ? "Vincular pedido do ERP" : "Vincular faturamento do ERP"
  const Icone = tipo === "PEDIDO" ? ShoppingCart : Receipt

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icone size={18} className="text-emerald-600" />
            {titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={
                  tipo === "PEDIDO"
                    ? "Buscar pedido ou cliente no ERP..."
                    : "Buscar nota ou cliente no ERP..."
                }
                className="pl-9"
                aria-label="Buscar no ERP"
              />
            </div>
            {cnpjPessoa && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={somentePessoa}
                  onChange={(e) => setSomentePessoa(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Só desta pessoa ({cnpjPessoa})
              </label>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-red-500">
              {error instanceof Error ? error.message : "Erro ao carregar documentos do ERP"}
            </p>
          ) : itens.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nenhum documento encontrado no ERP com esses filtros.
            </p>
          ) : (
            <div className="max-h-[50vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((documento: any) => {
                const chave =
                  tipo === "PEDIDO"
                    ? `${documento.empresa}/${documento.pedido}`
                    : `${documento.empresa}/${documento.pedido}/${documento.nr_nota}`
                const numero = tipo === "PEDIDO" ? documento.pedido : documento.nr_nota
                const data = tipo === "PEDIDO" ? documento.data_pedido : documento.data_nota
                return (
                  <div
                    key={chave}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {tipo === "PEDIDO" ? `Pedido ${numero}` : `Nota ${numero}`}
                        {documento.cliente_nome ? (
                          <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                            {documento.cliente_nome}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {data ? new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR") : "—"} ·{" "}
                        {documento.total_itens ?? 0} item(ns) ·{" "}
                        {formatarMoeda(documento.valor_total)}
                        {documento.cliente_cnpj ? ` · ${documento.cliente_cnpj}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => vincular(documento)}
                      disabled={vinculando !== null}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 disabled:opacity-50 transition-colors"
                    >
                      {vinculando === chave ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Link2 size={13} />
                      )}
                      {vinculando === chave ? "Vinculando..." : "Vincular"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Fechar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
