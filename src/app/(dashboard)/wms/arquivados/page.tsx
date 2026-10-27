"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Archive, Download, FileText, Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import { podeArquivarWms } from "@/lib/wms/permissoes"
import type {
  WmsPaginado,
  WmsPedido,
  WmsSeparacao,
  WmsSituacaoPedido,
} from "@/lib/wms/tipos"
import { Paginacao } from "../components/kanban"
import { VoltarSeparacoes } from "../components/voltar-separacoes"

const PAGINA = 50
const ABAS = [
  { id: "pedidos", rotulo: "Pedidos" },
  { id: "separacoes", rotulo: "Separações" },
] as const

type Aba = (typeof ABAS)[number]["id"]

function formatarData(valor?: string | null): string {
  if (!valor) return "—"
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export default function ArquivadosPage() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? null
  const podeAcao = podeArquivarWms(role)
  const info = getInfoContent(pathname)
  const [aba, setAba] = useState<Aba>("pedidos")
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [offset, setOffset] = useState(0)

  const lista = useQuery<WmsPaginado<WmsPedido> | WmsPaginado<WmsSeparacao>>({
    queryKey: ["wms-arquivados", aba, buscaAplicada, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        busca: buscaAplicada,
        limite: String(PAGINA),
        offset: String(offset),
      })
      if (aba === "pedidos") {
        params.set("arquivados", "true")
      } else {
        params.set("arquivadas", "true")
      }
      const rota = aba === "pedidos" ? "/api/wms/pedidos" : "/api/wms/separacoes"
      const res = await fetch(`${rota}?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar os arquivados")
      return res.json()
    },
  })

  const situacoesQuery = useQuery<WmsPaginado<WmsSituacaoPedido>>({
    queryKey: ["wms-situacoes", "todas"],
    queryFn: async () => {
      const res = await fetch("/api/wms/situacoes")
      if (!res.ok) throw new Error("Falha ao carregar as situações")
      return res.json()
    },
  })

  const pedidos = useMemo(
    () => (aba === "pedidos" ? (lista.data?.itens as WmsPedido[] | undefined) ?? [] : []),
    [aba, lista.data]
  )
  const separacoes = useMemo(
    () =>
      aba === "separacoes" ? (lista.data?.itens as WmsSeparacao[] | undefined) ?? [] : [],
    [aba, lista.data]
  )
  const situacoesAtivas = useMemo(
    () =>
      (situacoesQuery.data?.itens ?? []).filter(
        (situacao) => situacao.ativo && situacao.codigo !== "CANCELADO"
      ),
    [situacoesQuery.data]
  )

  function invalidarTudo() {
    queryClient.invalidateQueries({ queryKey: ["wms-arquivados"] })
    queryClient.invalidateQueries({ queryKey: ["wms-pedidos"] })
    queryClient.invalidateQueries({ queryKey: ["wms-separacoes"] })
    queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["wms-situacoes"] })
  }

  const moverPedido = useMutation({
    mutationFn: async ({
      pedido,
      situacao,
    }: {
      pedido: WmsPedido
      situacao: WmsSituacaoPedido
    }) => {
      const res = await fetch(
        `/api/wms/pedidos/${encodeURIComponent(pedido.empresa)}/${encodeURIComponent(
          pedido.pedido
        )}/situacao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ situacaoId: situacao.id }),
        }
      )
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao devolver o pedido à produção")
      }
      return res.json()
    },
    onSuccess: (_dados, { pedido, situacao }) => {
      toast.success(`Pedido ${pedido.pedido} devolvido para ${situacao.nome}`)
      invalidarTudo()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const desarquivarPedido = useMutation({
    mutationFn: async (pedido: WmsPedido) => {
      const res = await fetch(
        `/api/wms/pedidos/${encodeURIComponent(pedido.empresa)}/${encodeURIComponent(
          pedido.pedido
        )}/desarquivar`,
        { method: "POST" }
      )
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao desarquivar o pedido")
      }
      return res.json()
    },
    onSuccess: (_dados, pedido) => {
      toast.success(`Pedido ${pedido.pedido} desarquivado`)
      invalidarTudo()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const reabrirSeparacao = useMutation({
    mutationFn: async ({ ordem, status }: { ordem: WmsSeparacao; status: string }) => {
      const res = await fetch(`/api/wms/separacoes/${ordem.id}/reabrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao reabrir a ordem")
      }
      return res.json()
    },
    onSuccess: (_dados, { ordem, status }) => {
      toast.success(
        `Ordem #${ordem.id} reaberta como ${status === "EM_SEPARACAO" ? "Em separação" : "Liberado"}`
      )
      invalidarTudo()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const desarquivarSeparacao = useMutation({
    mutationFn: async (ordem: WmsSeparacao) => {
      const res = await fetch(`/api/wms/separacoes/${ordem.id}/desarquivar`, {
        method: "POST",
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao desarquivar a ordem")
      }
      return res.json()
    },
    onSuccess: (_dados, ordem) => {
      toast.success(`Ordem #${ordem.id} desarquivada`)
      invalidarTudo()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  function exportarCSV() {
    if (aba === "pedidos") {
      exportCSV(
        "wms-pedidos-arquivados",
        ["Pedido", "Cliente", "Entrega", "Itens", "Saldo (m)", "Arquivado em"],
        pedidos.map((pedido) => [
          pedido.pedido,
          pedido.clienteNome ?? pedido.clienteCodigo ?? "",
          pedido.dataEntrega ?? "",
          pedido.totalItens,
          pedido.saldoMetros.toFixed(2),
          formatarData(pedido.arquivadoEm),
        ])
      )
      return
    }
    exportCSV(
      "wms-separacoes-arquivadas",
      ["Ordem", "Pedido", "Cliente", "Peças", "Metros", "Arquivada em"],
      separacoes.map((ordem) => [
        ordem.id,
        ordem.pedido,
        ordem.clienteNome ?? ordem.clienteCodigo ?? "",
        ordem.totalPecas,
        ordem.totalMetros.toFixed(2),
        formatarData(ordem.arquivadaEm),
      ])
    )
  }

  async function exportarPDF() {
    if (aba === "pedidos") {
      await exportPDFRelatorio({
        title: "WMS — Pedidos arquivados",
        filename: "wms-pedidos-arquivados",
        stats: {
          Pedidos: pedidos.length,
          "Saldo total (m)": pedidos
            .reduce((soma, pedido) => soma + pedido.saldoMetros, 0)
            .toFixed(1),
        },
        tables: [
          {
            headers: ["Pedido", "Cliente", "Entrega", "Itens", "Saldo (m)", "Arquivado em"],
            rows: pedidos.map((pedido) => [
              pedido.pedido,
              pedido.clienteNome ?? pedido.clienteCodigo ?? "",
              pedido.dataEntrega ?? "",
              pedido.totalItens,
              pedido.saldoMetros.toFixed(2),
              formatarData(pedido.arquivadoEm),
            ]),
          },
        ],
      })
      return
    }
    await exportPDFRelatorio({
      title: "WMS — Ordens de separação arquivadas",
      filename: "wms-separacoes-arquivadas",
      stats: {
        Ordens: separacoes.length,
        Peças: separacoes.reduce((soma, ordem) => soma + ordem.totalPecas, 0),
        "Metros separados": separacoes
          .reduce((soma, ordem) => soma + ordem.totalMetros, 0)
          .toFixed(1),
      },
      tables: [
        {
          headers: ["Ordem", "Pedido", "Cliente", "Peças", "Metros", "Arquivada em"],
          rows: separacoes.map((ordem) => [
            ordem.id,
            ordem.pedido,
            ordem.clienteNome ?? ordem.clienteCodigo ?? "",
            ordem.totalPecas,
            ordem.totalMetros.toFixed(2),
            formatarData(ordem.arquivadaEm),
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <VoltarSeparacoes />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Arquivados
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pedidos e ordens cancelados que saíram do kanban. Consulte, imprima o relatório,
            devolva pedidos à produção ou reabra ordens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPDF} className="gap-1.5">
            <FileText size={14} /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Tipo de arquivado"
          className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm"
        >
          {ABAS.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              role="tab"
              aria-selected={aba === opcao.id}
              onClick={() => {
                setAba(opcao.id)
                setOffset(0)
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                aba === opcao.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setOffset(0)
          setBuscaAplicada(busca.trim())
        }}
      >
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search size={16} className="absolute left-2.5 top-2 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pedido, cliente ou razão social"
            className="pl-8"
            aria-label="Buscar arquivados"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {lista.isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : aba === "pedidos" ? (
        pedidos.length === 0 ? (
          <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
            Nenhum pedido arquivado encontrado.
          </p>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium">Pedido</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Entrega</th>
                  <th className="px-3 py-2 font-medium">Itens</th>
                  <th className="px-3 py-2 font-medium">Saldo (m)</th>
                  <th className="px-3 py-2 font-medium">Arquivado em</th>
                  <th className="px-3 py-2 font-medium">Devolver para</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pedidos.map((pedido) => (
                  <tr key={`${pedido.empresa}-${pedido.pedido}`}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                      {pedido.pedido}
                    </td>
                    <td className="px-3 py-2">
                      {pedido.clienteNome ?? pedido.clienteCodigo ?? "—"}
                    </td>
                    <td className="px-3 py-2">{pedido.dataEntrega ?? "—"}</td>
                    <td className="px-3 py-2">{pedido.totalItens}</td>
                    <td className="px-3 py-2">{pedido.saldoMetros.toFixed(2)}</td>
                    <td className="px-3 py-2">{formatarData(pedido.arquivadoEm)}</td>
                    <td className="px-3 py-2">
                      {podeAcao ? (
                        <select
                          aria-label={`Devolver pedido ${pedido.pedido} para produção`}
                          value=""
                          disabled={moverPedido.isPending}
                          onChange={(e) => {
                            const situacao = situacoesAtivas.find(
                              (item) => String(item.id) === e.target.value
                            )
                            if (situacao) moverPedido.mutate({ pedido, situacao })
                            e.target.value = ""
                          }}
                          className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-background text-foreground px-2 text-xs"
                        >
                          <option value="">Voltar para…</option>
                          {situacoesAtivas.map((situacao) => (
                            <option key={situacao.id} value={situacao.id}>
                              {situacao.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {podeAcao && (
                        <button
                          type="button"
                          onClick={() => desarquivarPedido.mutate(pedido)}
                          disabled={desarquivarPedido.isPending}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                        >
                          <Archive size={12} /> Desarquivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : separacoes.length === 0 ? (
        <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Nenhuma ordem arquivada encontrada.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Ordem</th>
                <th className="px-3 py-2 font-medium">Pedido</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Peças</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium">Arquivada em</th>
                <th className="px-3 py-2 font-medium">Reabrir como</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {separacoes.map((ordem) => (
                <tr key={ordem.id}>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                    #{ordem.id}
                  </td>
                  <td className="px-3 py-2">{ordem.pedido}</td>
                  <td className="px-3 py-2">
                    {ordem.clienteNome ?? ordem.clienteCodigo ?? "—"}
                  </td>
                  <td className="px-3 py-2">{ordem.totalPecas}</td>
                  <td className="px-3 py-2">{ordem.totalMetros.toFixed(2)}</td>
                  <td className="px-3 py-2">{formatarData(ordem.arquivadaEm)}</td>
                  <td className="px-3 py-2">
                    {podeAcao ? (
                      <select
                        aria-label={`Reabrir ordem ${ordem.id}`}
                        value=""
                        disabled={reabrirSeparacao.isPending}
                        onChange={(e) => {
                          const status = e.target.value
                          if (status) reabrirSeparacao.mutate({ ordem, status })
                          e.target.value = ""
                        }}
                        className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-background text-foreground px-2 text-xs"
                      >
                        <option value="">Reabrir como…</option>
                        <option value="LIBERADO">Liberado</option>
                        <option value="EM_SEPARACAO">Em separação</option>
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {podeAcao && (
                      <button
                        type="button"
                        onClick={() => desarquivarSeparacao.mutate(ordem)}
                        disabled={desarquivarSeparacao.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                      >
                        <Archive size={12} /> Desarquivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista.data && lista.data.total > PAGINA && (
        <Paginacao
          total={lista.data.total}
          pagina={Math.floor(offset / PAGINA) + 1}
          porPagina={PAGINA}
          onAnterior={() => setOffset((o) => Math.max(0, o - PAGINA))}
          onProxima={() => setOffset((o) => o + PAGINA)}
        />
      )}

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <VoltarSeparacoes />
      </div>
    </div>
  )
}
