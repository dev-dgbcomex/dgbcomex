"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Search } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { toast } from "sonner"

type PedidoPrevio = {
  pedidoId: number
  numero: string | null
  referenciaExterna: string | null
  empresa: string | null
  oportunidadeId: number
  oportunidadeTitulo: string | null
  leadId: number | null
  leadNome: string | null
  jaConvertida: boolean
  valorAntes: number
  valorDepois: number
  nota: { numero: string | null; dataNota: string | null; valorTotal: number } | null
  statusSugerido: "FATURADO" | "PARCIAL" | null
  semNota: boolean
}

type PreviewResultado = {
  pedidos: PedidoPrevio[]
  mensagem: string | null
  sincronizacao: { verificados: number; atualizados: number; falhas: number }
}

interface VerificarPedidosFaturadosProps {
  pedidoId?: number
  pedidoIds?: number[]
  oportunidadeId?: number
  label?: string
  className?: string
  title?: string
  iconeApenas?: boolean
  onConvertido?: () => void
}

export function VerificarPedidosFaturados({
  pedidoId,
  pedidoIds,
  oportunidadeId,
  label = "Verificar pedidos faturados",
  className,
  title,
  iconeApenas,
  onConvertido,
}: VerificarPedidosFaturadosProps) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [preview, setPreview] = useState<PreviewResultado | null>(null)
  const [statusPorPedido, setStatusPorPedido] = useState<Record<number, "FATURADO" | "PARCIAL">>({})

  const statusEscolhidoPorPedido = (pedido: PedidoPrevio) =>
    statusPorPedido[pedido.pedidoId] ?? pedido.statusSugerido ?? "PARCIAL"

  async function verificar() {
    setCarregando(true)
    setPreview(null)
    setStatusPorPedido({})
    try {
      const ids = pedidoIds
      ? pedidoIds
      : pedidoId
        ? [pedidoId]
        : undefined
      const resposta = await fetch("/api/crm/pedidos-venda/verificar-faturados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoIds: ids, oportunidadeId }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível consultar os pedidos")
      setPreview(dados as PreviewResultado)
      setAberto(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao verificar pedidos faturados")
    } finally {
      setCarregando(false)
    }
  }

  async function aplicar() {
    if (!preview?.pedidos?.length) return
    setAplicando(true)
    try {
      const resposta = await fetch("/api/crm/pedidos-venda/aplicar-faturados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoIds: preview.pedidos.map((p) => p.pedidoId),
          oportunidadeId,
          aplicar: true,
          statusPorPedido: Object.fromEntries(
            (preview?.pedidos ?? [])
              .filter((p) => p.statusSugerido)
              .map((p) => [p.pedidoId, statusEscolhidoPorPedido(p)])
          ),
        }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível aplicar a verificação")
      toast.success("Pedido(s) verificado(s) e valor sincronizado com o ERP.")
      setAberto(false)
      setPreview(null)
      onConvertido?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar a verificação")
    } finally {
      setAplicando(false)
    }
  }

  const pedidosPreview = preview?.pedidos ?? []
  const mensagemPreview = preview?.mensagem ?? null
  const sincronizacaoPreview = preview?.sincronizacao
  const podeAplicar = Boolean(pedidosPreview.length && !mensagemPreview)

  return (
    <>
      <button
        type="button"
        onClick={verificar}
        disabled={carregando || aplicando}
        className={className}
        title={title || label}
        aria-label={title || label}
      >
        {carregando || aplicando ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Search size={14} />
        )}
        {!iconeApenas && label}
      </button>

      <DialogPrimitive.Root open={aberto} onOpenChange={setAberto}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                <DialogPrimitive.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Verificar pedido faturado no ERP
                </DialogPrimitive.Title>
                {sincronizacaoPreview && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Espelho atualizado: {sincronizacaoPreview.verificados} verificado(s),{" "}
                    {sincronizacaoPreview.atualizados} atualizado(s),{" "}
                    {sincronizacaoPreview.falhas} falha(s).
                  </p>
                )}
              </div>

              <div className="p-5">
                {mensagemPreview ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {mensagemPreview}
                  </p>
                ) : pedidosPreview.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nenhum pedido vinculado encontrado.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      Confirme os valores do pedido do ERP antes de aplicar.
                    </p>
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-700">
                          <th className="py-2 pr-3">Pedido</th>
                          <th className="py-2 pr-3">Oportunidade</th>
                          <th className="py-2 pr-3 text-right">Valor antes</th>
                          <th className="py-2 pr-3 text-right">Valor depois</th>
                          <th className="py-2 pr-3 text-right">Nota fiscal</th>
                          <th className="py-2 pr-3 text-right">Diferença</th>
                          <th className="py-2">Status pedido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pedidosPreview.map((p) => {
                          const diferenca = p.nota ? p.valorDepois - p.nota.valorTotal : null
                          return (
                            <tr key={p.pedidoId} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">
                                {p.numero || p.referenciaExterna}
                              </td>
                              <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                                {p.oportunidadeTitulo || `#${p.oportunidadeId}`}
                              </td>
                              <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-400">
                                {p.valorAntes.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </td>
                              <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-400">
                                {p.valorDepois.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </td>
                              <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                                {p.nota ? `${p.nota.numero}${p.nota.dataNota ? ` (${p.nota.dataNota})` : ""} · ${p.nota.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "—"}
                              </td>
                              <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-400">
                                {diferenca != null ? diferenca.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                              </td>
                              <td className="py-2">
                                {p.semNota ? (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    Sem nota de faturamento no ERP
                                  </span>
                                ) : p.statusSugerido ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`status-${p.pedidoId}-faturado`}
                                      type="radio"
                                      name={`status-${p.pedidoId}`}
                                      value="FATURADO"
                                      checked={statusEscolhidoPorPedido(p) === "FATURADO"}
                                      onChange={() =>
                                        setStatusPorPedido((atual) => ({
                                          ...atual,
                                          [p.pedidoId]: "FATURADO",
                                        }))
                                      }
                                      className="rounded-slate-700 focus:ring-slate-500"
                                    />
                                    <label
                                      htmlFor={`status-${p.pedidoId}-faturado`}
                                      className="text-xs text-slate-600 dark:text-slate-400"
                                    >
                                      Faturado
                                    </label>
                                    <input
                                      id={`status-${p.pedidoId}-parcial`}
                                      type="radio"
                                      name={`status-${p.pedidoId}`}
                                      value="PARCIAL"
                                      checked={statusEscolhidoPorPedido(p) === "PARCIAL"}
                                      onChange={() =>
                                        setStatusPorPedido((atual) => ({
                                          ...atual,
                                          [p.pedidoId]: "PARCIAL",
                                        }))
                                      }
                                      className="ml-2 rounded-slate-700 focus:ring-slate-500"
                                    />
                                    <label
                                      htmlFor={`status-${p.pedidoId}-parcial`}
                                      className="text-xs text-slate-600 dark:text-slate-400"
                                    >
                                      Parcial
                                    </label>
                                    <span className="ml-2 text-[10px] text-slate-400">
                                      Sugestão: {p.statusSugerido}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {pedidosPreview.some((p) => !p.semNota) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        O faturamento da nota será vinculado ao pedido e à oportunidade para
                        documentar a diferença de valores.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-700">
                <DialogPrimitive.Close className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Fechar
                </DialogPrimitive.Close>
                {podeAplicar && (
                  <button
                    type="button"
                    onClick={aplicar}
                    disabled={aplicando}
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
                        Aplicar verificação
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
