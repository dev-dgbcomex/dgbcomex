"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Search } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { toast } from "sonner"

type Candidato = {
  pedidoId: number
  numero: string | null
  referenciaExterna: string | null
  oportunidadeId: number
  oportunidadeTitulo: string | null
  leadId: number | null
  leadNome: string | null
  jaConvertida: boolean
  nota: string | null
  dataNota: string | null
}

interface VerificarPedidosFaturadosProps {
  pedidoId?: number
  oportunidadeId?: number
  label?: string
  className?: string
  title?: string
  iconeApenas?: boolean
  onConvertido?: () => void
}

export function VerificarPedidosFaturados({
  pedidoId,
  oportunidadeId,
  label = "Verificar pedidos faturados",
  className,
  title,
  iconeApenas,
  onConvertido,
}: VerificarPedidosFaturadosProps) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [convertendo, setConvertendo] = useState(false)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [sincronizacao, setSincronizacao] = useState<{
    verificados: number
    atualizados: number
    falhas: number
  } | null>(null)

  async function verificar() {
    setCarregando(true)
    try {
      const resposta = await fetch("/api/crm/pedidos-venda/verificar-faturados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId, oportunidadeId }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível consultar os pedidos")
      setCandidatos(dados.candidatos || [])
      setSincronizacao(dados.sincronizacao || null)
      setAberto(true)
      if (!dados.candidatos?.length) {
        toast.info("Nenhum pedido faturado encontrado para os itens selecionados.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao verificar pedidos faturados")
    } finally {
      setCarregando(false)
    }
  }

  async function converter() {
    const ids = candidatos.filter((c) => !c.jaConvertida).map((c) => c.pedidoId)
    if (ids.length === 0) return
    setConvertendo(true)
    try {
      const resposta = await fetch("/api/crm/pedidos-venda/converter-faturados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoIds: ids }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível converter as leads")
      toast.success(`${dados.convertidas} lead(s) convertida(s) em cliente.`)
      if (dados.falhas) toast.error(`${dados.falhas} conversão(ões) falharam.`)
      setAberto(false)
      onConvertido?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao converter leads")
    } finally {
      setConvertendo(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={verificar}
        disabled={carregando}
        className={className}
        title={title || label}
        aria-label={title || label}
      >
        {carregando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {!iconeApenas && label}
      </button>

      <DialogPrimitive.Root open={aberto} onOpenChange={setAberto}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                <DialogPrimitive.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Pedidos faturados no ERP
                </DialogPrimitive.Title>
                {sincronizacao && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Espelho atualizado: {sincronizacao.verificados} verificado(s),{" "}
                    {sincronizacao.atualizados} atualizado(s), {sincronizacao.falhas} falha(s).
                  </p>
                )}
              </div>

              <div className="p-5">
                {candidatos.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nenhum pedido faturado encontrado.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-700">
                        <th className="py-2 pr-3">Pedido</th>
                        <th className="py-2 pr-3">Oportunidade</th>
                        <th className="py-2 pr-3">Lead</th>
                        <th className="py-2 pr-3">Nota</th>
                        <th className="py-2">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatos.map((c) => (
                        <tr key={c.pedidoId} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">
                            {c.numero || c.referenciaExterna}
                          </td>
                          <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                            {c.oportunidadeTitulo || `#${c.oportunidadeId}`}
                          </td>
                          <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                            {c.leadNome || "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                            {c.nota || "—"} {c.dataNota ? `(${c.dataNota})` : ""}
                          </td>
                          <td className="py-2">
                            {c.jaConvertida ? (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                Já convertida
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                Aguardando conversão
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-700">
                <DialogPrimitive.Close className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Fechar
                </DialogPrimitive.Close>
                {candidatos.some((c) => !c.jaConvertida) && (
                  <button
                    type="button"
                    onClick={converter}
                    disabled={convertendo}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {convertendo ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Converter leads em clientes
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
