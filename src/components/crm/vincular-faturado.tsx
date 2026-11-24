"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Receipt, Search } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

type NotaFaturada = {
  empresa: string | null
  pedido: string | null
  nr_nota: string | null
  serie: string | null
  clienteCnpj: string | null
  clienteNome: string | null
  dataNota: string | null
  dataEmissao: string | null
  valorNota: number
  valorTotal: number
  pedidoOrigem: string | null
}

type PedidoErpPreview = {
  empresa: string | null
  pedido: string | null
  pedido_origem?: string | null
  valor_total: number
}

type PreviewVinculoFaturado = {
  notas: NotaFaturada[]
  pedidosErp: PedidoErpPreview[]
  valorPedido: number
  valorNota: number
  valorOportunidadeAntes: number
  valorOportunidadeDepois: number
  jaVinculado: boolean
  pedidosExistentes: Array<{
    id: number
    numero: string | null
    referenciaExterna: string | null
    oportunidadeId: number
  }>
  mensagem: string | null
}

interface VincularFaturadoProps {
  open: boolean
  onOpenChange: (aberto: boolean) => void
  oportunidadeId: number
  onClose: () => void
  onVinculado: () => void
}

function formatarMoeda(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(valor || 0)
  )
}

export default function VincularFaturado({
  open,
  onOpenChange,
  oportunidadeId,
  onClose,
  onVinculado,
}: VincularFaturadoProps) {
  const [codigo, setCodigo] = useState("")
  const [nrNotaSelecionada, setNrNotaSelecionada] = useState<string | null>(null)
  const [statusPedido, setStatusPedido] = useState<"FATURADO" | "PARCIAL" | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [preview, setPreview] = useState<PreviewVinculoFaturado | null>(null)

  async function buscar() {
    setCarregando(true)
    setPreview(null)
    try {
      const resposta = await fetch(
        `/api/crm/oportunidades/${oportunidadeId}/vincular-faturado`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigoPedido: codigo, aplicar: false }),
        }
      )
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível consultar faturados")
      setPreview(dados as PreviewVinculoFaturado)
      const primeira = dados.notas?.[0]
      setNrNotaSelecionada(primeira?.nr_nota ?? null)
      const sugerido = primeira
        ? primeira.valorTotal >= dados.valorPedido
          ? "FATURADO"
          : "PARCIAL"
        : null
      setStatusPedido(sugerido)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao buscar faturados do ERP")
    } finally {
      setCarregando(false)
    }
  }

  async function aplicar() {
    if (!preview?.notas?.length) return
    if (preview.notas.length > 1 && !nrNotaSelecionada) {
      toast.error("Informe o número da nota fiscal para vincular.")
      return
    }
    setAplicando(true)
    try {
      const resposta = await fetch(
        `/api/crm/oportunidades/${oportunidadeId}/vincular-faturado`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigoPedido: codigo,
            nrNota: nrNotaSelecionada,
            aplicar: true,
            statusPedido,
          }),
        }
      )
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível vincular o faturado")
      toast.success("Pedidos vinculados e faturamento processado com o ERP.")
      setPreview(null)
      setCodigo("")
      setNrNotaSelecionada(null)
      setStatusPedido(null)
      onVinculado()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular o faturado")
    } finally {
      setAplicando(false)
    }
  }

  const notas = preview?.notas ?? []
  const mensagem = preview?.mensagem ?? null
  const haConflito = Boolean(
    preview?.pedidosExistentes?.some((pedido) => pedido.oportunidadeId !== oportunidadeId)
  )
  const podeAplicar = Boolean(notas.length && !haConflito)

  const notaSelecionada =
    notas.find((n) => n.nr_nota === nrNotaSelecionada) ?? notas[0]

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        disabled={carregando || aplicando}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
        title="Vincular pedido já faturado no ERP"
        aria-label="Vincular pedido já faturado no ERP"
      >
        <Receipt size={14} />
        Vincular faturado
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={(aberto) => {
        onOpenChange(aberto)
        if (!aberto) onClose()
      }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                <DialogPrimitive.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Receipt size={16} className="text-emerald-600" />
                  Vincular faturado do ERP
                </DialogPrimitive.Title>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Informe o código do pedido de venda do ERP (ex. 00007046). O sistema busca as
                  notas faturadas desse pedido, vincula o pedido ao CRM e processa o faturamento
                  da nota selecionada.
                </p>
              </div>

              <div className="p-5">
                <div className="space-y-3">
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.trim())}
                      placeholder="Código do pedido (ex. 00007046)"
                      className="pl-9"
                      aria-label="Código do pedido no ERP"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={buscar}
                    disabled={carregando || aplicando || !codigo.trim()}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50"
                  >
                    {carregando ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    Buscar faturados
                  </button>

                  {mensagem && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{mensagem}</p>
                  )}

                  {notas.length === 0 && !mensagem && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Nenhum faturamento encontrado para este pedido.
                    </p>
                  )}

                  {notas.length > 0 && (
                    <>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Notas faturadas encontradas para o pedido {codigo || "-"}:
                      </p>
                      <div className="max-h-[40vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                        {notas.map((nota) => {
                          const selecionada = nota.nr_nota === nrNotaSelecionada
                          return (
                            <button
                              key={nota.nr_nota}
                              type="button"
                              onClick={() => {
                                setNrNotaSelecionada(nota.nr_nota ?? null)
                                const sugerido =
                                  nota.valorTotal >= (preview?.valorPedido ?? 0)
                                    ? "FATURADO"
                                    : "PARCIAL"
                                setStatusPedido(sugerido)
                              }}
                              className={`flex w-full items-center gap-2 p-3 text-left border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                                selecionada
                                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  Nota {nota.nr_nota}{nota.serie ? ` (série ${nota.serie})` : ""}
                                  {nota.clienteNome ? (
                                    <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                                      {nota.clienteNome}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {nota.dataNota ? new Date(`${nota.dataNota}T12:00:00`).toLocaleDateString("pt-BR") : "—"} ·
                                  pedido {nota.pedidoOrigem ?? nota.pedido} ·
                                  {formatarMoeda(nota.valorTotal)}
                                </p>
                              </div>
                              {selecionada ? (
                                <CheckCircle2 size={14} className="text-emerald-600" />
                              ) : (
                                <Receipt size={14} className="text-slate-400" />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Status do pedido no CRM:
                        </p>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="status-vincular-faturado"
                              value="FATURADO"
                              checked={statusPedido === "FATURADO"}
                              onChange={() => setStatusPedido("FATURADO")}
                              className="rounded-slate-700 focus:ring-slate-500"
                            />
                            Faturado
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="status-vincular-faturado"
                              value="PARCIAL"
                              checked={statusPedido === "PARCIAL"}
                              onChange={() => setStatusPedido("PARCIAL")}
                              className="ml-2 rounded-slate-700 focus:ring-slate-500"
                            />
                            Parcial
                          </label>
                        </div>
                      </div>

                      {preview?.pedidosErp && preview.pedidosErp.length > 0 && (
                        <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Pedidos do ERP que compõem esta nota:
                          </p>
                          <ul className="mt-2 space-y-1">
                            {preview.pedidosErp.map((pedido) => (
                              <li
                                key={pedido.pedido_origem ?? pedido.pedido ?? "-"}
                                className="flex justify-between gap-3 text-xs text-slate-600 dark:text-slate-400"
                              >
                                <span>Pedido {pedido.pedido_origem ?? pedido.pedido}</span>
                                <span>{formatarMoeda(pedido.valor_total)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Valor dos pedidos: {formatarMoeda(preview?.valorPedido)} · Valor da nota:{" "}
                        {formatarMoeda(notaSelecionada?.valorTotal)} · Oportunidade antes:{" "}
                        {formatarMoeda(preview?.valorOportunidadeAntes)} · depois:{" "}
                        {formatarMoeda(preview?.valorOportunidadeDepois)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-700">
                <DialogPrimitive.Close className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Fechar
                </DialogPrimitive.Close>
                {podeAplicar && (
                  <button
                    type="button"
                    onClick={aplicar}
                    disabled={aplicando || (!statusPedido && notas.length > 0)}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {aplicando ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Vincular pedido e faturamento
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
