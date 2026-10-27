"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Archive, Download, FileText, Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import { chavePedido, ordenarPorPosicao } from "@/lib/wms/kanban"
import {
  podeArquivarWms,
  podeMoverParaSituacao,
  podeReordenarKanban,
} from "@/lib/wms/permissoes"
import type {
  WmsPaginado,
  WmsPedido,
  WmsSituacaoPedido,
} from "@/lib/wms/tipos"
import {
  KanbanWms,
  Paginacao,
  VisualizacaoToggle,
} from "../components/kanban"
import { VoltarSeparacoes } from "../components/voltar-separacoes"

const PAGINA = 50

function corDaSituacao(situacao?: WmsSituacaoPedido | null): string {
  return situacao?.cor ?? "#94a3b8"
}

function nomeDaSituacao(
  pedido: WmsPedido,
  situacoes: WmsSituacaoPedido[]
): string {
  if (pedido.situacaoNome) return pedido.situacaoNome
  const encontrada = situacoes.find((s) => s.codigo === pedido.separacaoStatus)
  return encontrada?.nome ?? pedido.separacaoStatus ?? "Sem separação"
}

export default function PedidosPage() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? null
  const podeArquivar = podeArquivarWms(role)
  const info = getInfoContent(pathname)
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [status, setStatus] = useState("")
  const [offset, setOffset] = useState(0)
  const [modo, setModo] = useState<"lista" | "kanban">("kanban")

  const pedidosQuery = useQuery<WmsPaginado<WmsPedido>>({
    queryKey: ["wms-pedidos", buscaAplicada, status, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        busca: buscaAplicada,
        statusSeparacao: status,
        limite: String(PAGINA),
        offset: String(offset),
      })
      const res = await fetch(`/api/wms/pedidos?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar os pedidos")
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

  const itens = useMemo(() => pedidosQuery.data?.itens ?? [], [pedidosQuery.data])
  const situacoes = useMemo(
    () => situacoesQuery.data?.itens ?? [],
    [situacoesQuery.data]
  )
  const situacoesAtivas = useMemo(
    () => situacoes.filter((s) => s.ativo),
    [situacoes]
  )
  const situacaoPadrao = useMemo(
    () => situacoes.find((s) => s.codigo === "SEM_SEPARACAO"),
    [situacoes]
  )

  const codigosColunas = useMemo(
    () => situacoesAtivas.map((s) => s.codigo).join(","),
    [situacoesAtivas]
  )

  const ordemQuery = useQuery<Record<string, Record<string, number>>>({
    queryKey: ["wms-kanban-ordem", "PEDIDO", codigosColunas],
    queryFn: async () => {
      const params = new URLSearchParams({
        tipo: "PEDIDO",
        colunas: codigosColunas,
      })
      const res = await fetch(`/api/wms/kanban/ordem?${params.toString()}`)
      if (!res.ok) return {}
      return res.json()
    },
  })

  const posicoes = useMemo(() => ordemQuery.data ?? {}, [ordemQuery.data])

  const colunas = useMemo(() => {
    const comPedidos = new Set(itens.map((p) => p.situacaoId))
    return situacoesAtivas
      .filter((s) => s.ativo || comPedidos.has(s.id))
      .map((situacao) => {
        const posicao = posicoes[situacao.codigo] ?? {}
        const ordenados = ordenarPorPosicao(
          itens.filter(
            (pedido) =>
              (pedido.situacaoId ?? situacaoPadrao?.id ?? null) === situacao.id
          ),
          chavePedido,
          posicao
        )
        return {
          id: String(situacao.id),
          rotulo: situacao.nome,
          cor: situacao.cor,
          itens: ordenados,
        }
      })
  }, [itens, situacoesAtivas, situacaoPadrao, posicoes])

  const mover = useMutation<
    any,
    Error,
    { pedido: WmsPedido; situacao: WmsSituacaoPedido; cancelarOrdem?: boolean },
    { anteriores?: [readonly unknown[], WmsPaginado<WmsPedido> | undefined][] }
  >({
    mutationFn: async ({ pedido, situacao, cancelarOrdem }): Promise<any> => {
      const res = await fetch(
        `/api/wms/pedidos/${encodeURIComponent(pedido.empresa)}/${encodeURIComponent(
          pedido.pedido
        )}/situacao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            situacaoId: situacao.id,
            cancelar_ordem: cancelarOrdem ? true : undefined,
          }),
        }
      )
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        const detalhe = erro.detail ?? erro.error ?? ""
        if (res.status === 409 && detalhe === "ORDEN_ATIVA_CANCELAR" && !cancelarOrdem) {
          const confirmado = window.confirm(
            "Existe uma ordem de separação ativa. Deseja cancelar essa ordem e liberar as peças para serem separadas novamente?"
          )
          if (confirmado) {
            return mover.mutateAsync({ pedido, situacao, cancelarOrdem: true })
          }
        }
        throw new Error(erro.error ?? detalhe ?? "Falha ao mover o pedido")
      }
      return res.json()
    },
    onSuccess: (_dados, variaveis) => {
      toast.success(`Pedido movido para ${variaveis.situacao.nome}`)
      queryClient.invalidateQueries({ queryKey: ["wms-pedidos"] })
      queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["wms-separacoes"] })
      queryClient.invalidateQueries({ queryKey: ["wms-situacoes"] })
    },
    onMutate: async ({ pedido, situacao }) => {
      await queryClient.cancelQueries({ queryKey: ["wms-pedidos"] })
      const anteriores = queryClient.getQueriesData<WmsPaginado<WmsPedido>>({
        queryKey: ["wms-pedidos"],
      })
      queryClient.setQueriesData<WmsPaginado<WmsPedido>>(
        { queryKey: ["wms-pedidos"] },
        (atual) => {
          if (!atual) return atual
          return {
            ...atual,
            itens: atual.itens.map((item) =>
              item.empresa === pedido.empresa && item.pedido === pedido.pedido
                ? {
                    ...item,
                    situacaoId: situacao.id,
                    situacaoNome: situacao.nome,
                    situacaoCor: situacao.cor,
                    situacaoOrdem: situacao.ordem,
                    situacaoAcao: situacao.acao,
                    situacaoPerfis: situacao.perfis ?? [],
                    separacaoStatus: situacao.codigo,
                  }
                : item
            ),
          }
        }
      )
      return { anteriores }
    },
    onError: (erro: Error, _variaveis, contexto) => {
      contexto?.anteriores?.forEach(([chave, dados]) => {
        queryClient.setQueryData(chave, dados)
      })
      toast.error(erro.message)
    },
  })

  const reordenar = useMutation({
    mutationFn: async ({ coluna, ids }: { coluna: string; ids: string[] }) => {
      const res = await fetch("/api/wms/kanban/reordenar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "PEDIDO",
          coluna,
          itens: ids.map((chave, posicao) => ({ chave, posicao })),
        }),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao reordenar os pedidos")
      }
      return res.json()
    },
    onMutate: async ({ coluna, ids }) => {
      const queryKey = ["wms-kanban-ordem", "PEDIDO", codigosColunas]
      await queryClient.cancelQueries({ queryKey })
      const anterior = queryClient.getQueryData<
        Record<string, Record<string, number>>
      >(queryKey)
      queryClient.setQueryData<Record<string, Record<string, number>>>(
        queryKey,
        (atual = {}) => ({
          ...atual,
          [coluna]: Object.fromEntries(
            ids.map((chave, posicao) => [chave, posicao])
          ),
        })
      )
      return { anterior, queryKey }
    },
    onError: (
      erro: Error,
      _variaveis,
      contexto: { anterior?: Record<string, Record<string, number>>; queryKey: string[] } | undefined
    ) => {
      if (contexto?.anterior) {
        queryClient.setQueryData(contexto.queryKey, contexto.anterior)
      }
      toast.error(erro.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-kanban-ordem"] })
    },
  })

  function reordenarColuna(colunaId: string, ids: string[]) {
    const situacao = situacoes.find((s) => String(s.id) === colunaId)
    if (!situacao) return
    reordenar.mutate({ coluna: situacao.codigo, ids })
  }

  const arquivar = useMutation({
    mutationFn: async (pedido: WmsPedido) => {
      const res = await fetch(
        `/api/wms/pedidos/${encodeURIComponent(pedido.empresa)}/${encodeURIComponent(
          pedido.pedido
        )}/arquivar`,
        { method: "POST" }
      )
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao arquivar o pedido")
      }
      return res.json()
    },
    onSuccess: (_dados, pedido) => {
      toast.success(`Pedido ${pedido.pedido} arquivado`)
      queryClient.invalidateQueries({ queryKey: ["wms-pedidos"] })
      queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["wms-situacoes"] })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  function moverPedido(pedido: WmsPedido, situacaoId: string) {
    const situacao = situacoes.find((s) => String(s.id) === situacaoId)
    if (!situacao) return
    if ((pedido.situacaoId ?? situacaoPadrao?.id) === situacao.id) return
    mover.mutate({ pedido, situacao })
  }

  function podeMover(pedido: WmsPedido, destino: string): boolean {
    const situacao = situacoes.find((s) => String(s.id) === destino)
    if (!situacao || !situacao.ativo) return false
    if (mover.isPending) return false
    return podeMoverParaSituacao(role, situacao)
  }

  function destinosDoPedido(pedido: WmsPedido) {
    return situacoesAtivas.filter(
      (situacao) =>
        situacao.id !== pedido.situacaoId && podeMoverParaSituacao(role, situacao)
    )
  }

  function exportarCSV() {
    exportCSV(
      "wms-pedidos",
      ["Pedido", "Cliente", "Data", "Entrega", "Itens", "Saldo (m)", "Situação"],
      itens.map((p) => [
        p.pedido,
        p.clienteNome ?? p.clienteCodigo ?? "",
        p.dataPedido ?? "",
        p.dataEntrega ?? "",
        p.totalItens,
        p.saldoMetros.toFixed(2),
        nomeDaSituacao(p, situacoes),
      ])
    )
  }

  async function exportarPDF() {
    await exportPDFRelatorio({
      title: "WMS — Pedidos liberados",
      filename: "wms-pedidos",
      stats: {
        Pedidos: itens.length,
        "Saldo total (m)": itens.reduce((soma, p) => soma + p.saldoMetros, 0).toFixed(1),
      },
      tables: [
        {
          headers: [
            "Pedido",
            "Cliente",
            "Data",
            "Entrega",
            "Itens",
            "Saldo (m)",
            "Situação",
          ],
          rows: itens.map((p) => [
            p.pedido,
            p.clienteNome ?? p.clienteCodigo ?? "",
            p.dataPedido ?? "",
            p.dataEntrega ?? "",
            p.totalItens,
            p.saldoMetros.toFixed(2),
            nomeDaSituacao(p, situacoes),
          ]),
        },
      ],
    })
  }

  const carregando = pedidosQuery.isLoading || situacoesQuery.isLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <VoltarSeparacoes />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Pedidos para Separação
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Arraste os pedidos entre as colunas para liberar, iniciar, concluir ou cancelar a
            separação. As colunas vêm do cadastro de situações.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VisualizacaoToggle modo={modo} onChange={setModo} />
          <Link
            href="/wms/situacoes"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Situações
          </Link>
          <Link
            href="/wms/arquivados"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            <Archive size={14} /> Arquivados
          </Link>
          <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5">
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPDF} className="gap-1.5">
            <FileText size={14} /> PDF
          </Button>
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
            aria-label="Buscar pedidos"
          />
        </div>
        <select
          aria-label="Filtrar por situação"
          className="h-9 rounded-lg border border-input bg-background text-foreground px-2 text-sm"
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
        >
          <option value="">Todas as situações</option>
          {situacoesAtivas.map((situacao) => (
            <option key={situacao.id} value={situacao.codigo}>
              {situacao.nome}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {carregando ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Nenhum pedido liberado encontrado.
        </p>
      ) : modo === "kanban" ? (
        <KanbanWms
          colunas={colunas}
          chave={chavePedido}
          vazio="Nenhum pedido"
          onMover={moverPedido}
          podeMover={podeMover}
          onReordenar={reordenarColuna}
          podeReordenar={podeReordenarKanban(role)}
          prioridade
          renderCard={(pedido) => {
            const situacao = situacoes.find((s) => s.id === pedido.situacaoId)
            return (
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      #{pedido.pedido}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 break-words line-clamp-2">
                      {pedido.clienteNome ?? pedido.clienteCodigo ?? "-"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {pedido.saldoMetros.toFixed(1)} m
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                  <span>{pedido.totalItens} item(ns)</span>{pedido.artigos && (<><span>•</span><span className="truncate max-w-[140px]" title={pedido.artigos}>Artigos: {pedido.artigos}</span></>)}
                  <span>•</span>
                  <span>Entrega {pedido.dataEntrega ?? "-"}</span>
                </div>
                {pedido.separacaoId && (
                  <Link
                    href={`/wms/separacoes/${pedido.separacaoId}`}
                    className="inline-flex text-[10px] font-medium text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Abrir ordem #{pedido.separacaoId}
                  </Link>
                )}
                {situacao?.codigo === "CANCELADO" && podeArquivar && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      arquivar.mutate(pedido)
                    }}
                    disabled={arquivar.isPending}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Archive size={11} /> Arquivar
                  </button>
                )}
              </div>
            )
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Pedido</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Entrega</th>
                <th className="px-3 py-2 font-medium">Itens</th>
                <th className="px-3 py-2 font-medium">Saldo (m)</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 font-medium">Mover</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((pedido) => {
                const situacao = situacoes.find((s) => s.id === pedido.situacaoId)
                const destinos = destinosDoPedido(pedido)
                return (
                  <tr key={`${pedido.empresa}-${pedido.pedido}`}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                      {pedido.pedido}
                    </td>
                    <td className="px-3 py-2">
                      {pedido.clienteNome ?? pedido.clienteCodigo ?? "—"}
                    </td>
                    <td className="px-3 py-2">{pedido.dataPedido ?? "—"}</td>
                    <td className="px-3 py-2">{pedido.dataEntrega ?? "—"}</td>
                    <td className="px-3 py-2">{pedido.totalItens}</td>
                    <td className="px-3 py-2">{pedido.saldoMetros.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: corDaSituacao(situacao) }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: corDaSituacao(situacao) }}
                        />
                        {nomeDaSituacao(pedido, situacoes)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {destinos.length > 0 ? (
                        <select
                          aria-label={`Mover pedido ${pedido.pedido}`}
                          value=""
                          disabled={mover.isPending}
                          onChange={(e) => {
                            const destino = e.target.value
                            if (destino) moverPedido(pedido, destino)
                            e.target.value = ""
                          }}
                          className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-background text-foreground px-2 text-xs"
                        >
                          <option value="">Mover para…</option>
                          {destinos.map((destino) => (
                            <option key={destino.id} value={destino.id}>
                              {destino.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {pedido.separacaoId && (
                          <Link
                            href={`/wms/separacoes/${pedido.separacaoId}`}
                            className="text-blue-600 hover:underline"
                          >
                            Abrir ordem
                          </Link>
                        )}
                        {situacao?.codigo === "CANCELADO" && podeArquivar && (
                          <button
                            type="button"
                            onClick={() => arquivar.mutate(pedido)}
                            disabled={arquivar.isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                          >
                            <Archive size={12} /> Arquivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pedidosQuery.data && pedidosQuery.data.total > PAGINA && (
        <Paginacao
          total={pedidosQuery.data.total}
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
