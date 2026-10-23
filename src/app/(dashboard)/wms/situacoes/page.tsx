"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InfoButton } from "@/components/ui/info-button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getInfoContent } from "@/lib/info-content"
import type {
  NovaSituacaoPedido,
  WmsPaginado,
  WmsSituacaoAcao,
  WmsSituacaoPedido,
} from "@/lib/wms/tipos"
import {
  WMS_PERFIS,
  WMS_PERFIS_ROTULOS,
  WMS_SITUACAO_ACOES,
  WMS_SITUACAO_ACOES_ROTULOS,
} from "@/lib/wms/tipos"

const COR_PADRAO = "#2563eb"

type Formulario = {
  nome: string
  cor: string
  ordem: string
  acao: WmsSituacaoAcao
  perfis: string[]
  ativo: boolean
}

const FORMULARIO_VAZIO: Formulario = {
  nome: "",
  cor: COR_PADRAO,
  ordem: "",
  acao: "NENHUMA",
  perfis: ["COMERCIAL"],
  ativo: true,
}

function formularioDe(situacao: WmsSituacaoPedido): Formulario {
  return {
    nome: situacao.nome,
    cor: situacao.cor,
    ordem: String(situacao.ordem),
    acao: situacao.acao,
    perfis: situacao.perfis,
    ativo: situacao.ativo,
  }
}

export default function SituacoesPage() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const role = (session?.user?.role ?? "").toUpperCase()
  const podeAdministrar = role === "ADMIN" || role === "SUDO"
  const info = getInfoContent(pathname)
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<WmsSituacaoPedido | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VAZIO)

  const { data, isLoading } = useQuery<WmsPaginado<WmsSituacaoPedido>>({
    queryKey: ["wms-situacoes", "cadastro"],
    queryFn: async () => {
      const res = await fetch("/api/wms/situacoes")
      if (!res.ok) throw new Error("Falha ao carregar as situações")
      return res.json()
    },
  })

  const situacoes = useMemo(() => data?.itens ?? [], [data])

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["wms-situacoes"] })
    queryClient.invalidateQueries({ queryKey: ["wms-pedidos"] })
  }

  const salvar = useMutation({
    mutationFn: async (dados: Formulario) => {
      const corpo: NovaSituacaoPedido = {
        nome: dados.nome.trim(),
        cor: dados.cor,
        acao: dados.acao,
        perfis: dados.perfis,
        ativo: dados.ativo,
      }
      const ordem = Number(dados.ordem)
      if (Number.isInteger(ordem) && ordem >= 0) corpo.ordem = ordem
      const res = await fetch(
        editando ? `/api/wms/situacoes/${editando.id}` : "/api/wms/situacoes",
        {
          method: editando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        }
      )
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao salvar a situação")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(editando ? "Situação atualizada" : "Situação criada")
      setAberto(false)
      setEditando(null)
      setFormulario(FORMULARIO_VAZIO)
      invalidar()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const excluir = useMutation({
    mutationFn: async (situacao: WmsSituacaoPedido) => {
      const res = await fetch(`/api/wms/situacoes/${situacao.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao excluir a situação")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Situação excluída")
      invalidar()
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  function abrirNova() {
    setEditando(null)
    setFormulario({
      ...FORMULARIO_VAZIO,
      ordem: String((situacoes.at(-1)?.ordem ?? 0) + 1),
    })
    setAberto(true)
  }

  function abrirEdicao(situacao: WmsSituacaoPedido) {
    setEditando(situacao)
    setFormulario(formularioDe(situacao))
    setAberto(true)
  }

  function copiarSituacao(situacao: WmsSituacaoPedido) {
    setEditando(null)
    setFormulario({
      nome: `Cópia de ${situacao.nome}`,
      cor: situacao.cor,
      ordem: String((situacoes.at(-1)?.ordem ?? situacao.ordem) + 1),
      acao: situacao.acao,
      perfis: [...situacao.perfis],
      ativo: situacao.ativo,
    })
    setAberto(true)
  }

  function alternarPerfil(perfil: string) {
    setFormulario((atual) => ({
      ...atual,
      perfis: atual.perfis.includes(perfil)
        ? atual.perfis.filter((p) => p !== perfil)
        : [...atual.perfis, perfil],
    }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Situações do Pedido
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cada situação ativa é uma coluna do kanban de Pedidos. A ação define o que acontece
            ao mover o pedido para a coluna.
          </p>
        </div>
        {podeAdministrar && (
          <Button onClick={abrirNova} className="gap-1.5">
            <Plus size={16} /> Nova situação
          </Button>
        )}
      </div>

      {!podeAdministrar && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Somente administradores podem criar ou alterar situações.
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : situacoes.length === 0 ? (
        <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Nenhuma situação cadastrada.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Ordem</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Ação</th>
                <th className="px-3 py-2 font-medium">Perfis</th>
                <th className="px-3 py-2 font-medium">Pedidos</th>
                <th className="px-3 py-2 font-medium">Ativa</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {situacoes.map((situacao) => (
                <tr key={situacao.id}>
                  <td className="px-3 py-2 text-slate-500">{situacao.ordem}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-slate-50">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: situacao.cor }}
                      />
                      {situacao.nome}
                      {situacao.sistema && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          sistema
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">
                    {situacao.codigo}
                  </td>
                  <td className="px-3 py-2">
                    {WMS_SITUACAO_ACOES_ROTULOS[situacao.acao] ?? situacao.acao}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {situacao.perfis.length
                      ? situacao.perfis
                          .map(
                            (perfil) =>
                              WMS_PERFIS_ROTULOS[
                                perfil as keyof typeof WMS_PERFIS_ROTULOS
                              ] ?? perfil
                          )
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{situacao.pedidos ?? 0}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        situacao.ativo
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {situacao.ativo ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Copiar ${situacao.nome}`}
                        disabled={!podeAdministrar}
                        onClick={() => copiarSituacao(situacao)}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${situacao.nome}`}
                        disabled={!podeAdministrar}
                        onClick={() => abrirEdicao(situacao)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Excluir ${situacao.nome}`}
                        disabled={
                          !podeAdministrar ||
                          situacao.sistema ||
                          Boolean(situacao.pedidos && situacao.pedidos > 0)
                        }
                        onClick={() => excluir.mutate(situacao)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar situação" : "Nova situação"}</DialogTitle>
          </DialogHeader>
          <form
            id="form-situacao"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!formulario.nome.trim()) {
                toast.error("Informe o nome da situação")
                return
              }
              salvar.mutate(formulario)
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Nome</span>
                <Input
                  value={formulario.nome}
                  onChange={(event) =>
                    setFormulario((atual) => ({ ...atual, nome: event.target.value }))
                  }
                  placeholder="Ex.: Aguardando conferência"
                  required
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Cor</span>
                <input
                  type="color"
                  aria-label="Cor da situação"
                  value={formulario.cor}
                  onChange={(event) =>
                    setFormulario((atual) => ({ ...atual, cor: event.target.value }))
                  }
                  className="h-9 w-14 cursor-pointer rounded-lg border border-input bg-transparent"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Ordem</span>
                <Input
                  type="number"
                  min={0}
                  value={formulario.ordem}
                  onChange={(event) =>
                    setFormulario((atual) => ({ ...atual, ordem: event.target.value }))
                  }
                  placeholder="Automática"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Ação ao mover</span>
                <select
                  value={formulario.acao}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      acao: event.target.value as WmsSituacaoAcao,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  {WMS_SITUACAO_ACOES.map((acao) => (
                    <option key={acao} value={acao}>
                      {WMS_SITUACAO_ACOES_ROTULOS[acao]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Perfis que podem mover</legend>
              <div className="flex flex-wrap gap-4">
                {WMS_PERFIS.map((perfil) => (
                  <label key={perfil} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formulario.perfis.includes(perfil)}
                      onChange={() => alternarPerfil(perfil)}
                    />
                    {WMS_PERFIS_ROTULOS[perfil]}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                ADMIN e SUDO sempre podem mover. O perfil EXPEDICAO precisa existir no cadastro
                de perfis.
              </p>
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formulario.ativo}
                onChange={(event) =>
                  setFormulario((atual) => ({ ...atual, ativo: event.target.checked }))
                }
              />
              Ativa (aparece como coluna no kanban)
            </label>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-situacao" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : editando ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
