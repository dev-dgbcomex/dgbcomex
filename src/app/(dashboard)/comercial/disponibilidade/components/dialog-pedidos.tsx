"use client"

import { useQuery } from "@tanstack/react-query"
import { FileDown, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  FORMATAR,
  exportarCsvPedidos,
  exportarPdfPedidos,
  type DetalhePedidos,
  type DisponibilidadeLinha,
} from "@/lib/bi/disponibilidade"

interface Props {
  integracaoId: number
  linha: DisponibilidadeLinha | null
  aoFechar: () => void
}

/**
 * Os pedidos que formam o prometido de uma produto/cor, com o **codigo do pedido** —
 * o que a tabela nao tinha. Abre por clique na celula de Pedidos (hover mostra so o
 * agregado por representante).
 */
export function DialogPedidos({ integracaoId, linha, aoFechar }: Props) {
  const chave = linha ? `${linha.produto}|${linha.cor}` : ""

  const { data, isLoading, error } = useQuery<DetalhePedidos>({
    queryKey: ["estoque-disponibilidade-pedidos", integracaoId, chave],
    enabled: Boolean(linha),
    queryFn: async () => {
      const params = new URLSearchParams({ produto: linha!.produto, cor: linha!.cor })
      const res = await fetch(
        `/api/integracao/${integracaoId}/detalhe/estoque-disponibilidade/pedidos?${params}`
      )
      const corpo = await res.json().catch(() => null)
      if (!res.ok) throw new Error(corpo?.detail || corpo?.error || `Falha na API (${res.status})`)
      return corpo as DetalhePedidos
    },
  })

  const titulo = linha ? `${linha.produto_desc || linha.produto} · ${linha.cor_desc || linha.cor}` : ""
  const nomeArquivo = `pedidos_${linha?.produto ?? ""}_${linha?.cor ?? ""}`

  async function gerarPdf() {
    if (!data?.pedidos.length) return
    try {
      await exportarPdfPedidos(data.pedidos, titulo)
    } catch {
      toast.error("Não foi gerar o PDF")
    }
  }

  return (
    <Dialog open={Boolean(linha)} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pedidos de {titulo}</DialogTitle>
          <DialogDescription>
            {data
              ? `${FORMATAR.inteiro(data.total)} pedidos em aberto · ${FORMATAR.metros(
                  data.saldo
                )} · ${FORMATAR.valor(data.valor)}`
              : "Carregando os pedidos da carteira…"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Buscando os pedidos…
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error instanceof Error ? error.message : "Erro ao carregar os pedidos"}
          </p>
        )}

        {data && data.pedidos.length === 0 && !isLoading && (
          <p className="py-8 text-center text-sm text-slate-500">
            Nenhum pedido em aberto nesta cor.
          </p>
        )}

        {data && data.pedidos.length > 0 && (
          <div className="max-h-[24rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  {["Pedido", "Cliente", "Representante", "Pedido em", "Entrega", "Saldo", "Valor", "Situação"].map(
                    (tituloColuna) => (
                      <th
                        key={tituloColuna}
                        className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase"
                      >
                        {tituloColuna}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.pedidos.map((pedido) => (
                  <tr key={`${pedido.pedido}-${pedido.cor}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {pedido.pedido}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                      {pedido.cliente_nome || pedido.cliente}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                      {pedido.vendedor_nome || pedido.vendedor}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {FORMATAR.data(pedido.data_pedido)}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {FORMATAR.data(pedido.data_entrega)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {FORMATAR.metros(pedido.saldo)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {FORMATAR.valor(pedido.valor)}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {pedido.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            disabled={!data?.pedidos.length}
            onClick={() => data && exportarCsvPedidos(data.pedidos, nomeArquivo)}
            className="gap-2"
          >
            <FileDown className="size-4" /> Exportar CSV
          </Button>
          <Button
            disabled={!data?.pedidos.length}
            onClick={gerarPdf}
            className="gap-2"
          >
            <FileText className="size-4" /> Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}