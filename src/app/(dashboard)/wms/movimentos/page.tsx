"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getInfoContent } from "@/lib/info-content"

type Movimento = {
  id: number
  tipo: string
  estoqueId: number | null
  nroRolo: string | null
  nroPeca: string | null
  origem: string | null
  destino: string | null
  metros: string | null
  peso: string | null
  observacao: string | null
  createdAt: string
}

type PecaAlocada = { id: number; nroRolo: string; nroPeca: string; enderecoId: number }
type Endereco = { id: number; codigo: string; tipo: string; ativo: boolean }

export default function MovimentosPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const queryClient = useQueryClient()
  const [tipo, setTipo] = useState("TRANSFERENCIA")
  const [estoqueId, setEstoqueId] = useState("")
  const [enderecoDestinoId, setEnderecoDestinoId] = useState("")
  const [observacao, setObservacao] = useState("")

  const { data: movimentos, isLoading } = useQuery<Movimento[]>({
    queryKey: ["wms-movimentos"],
    queryFn: async () => {
      const res = await fetch("/api/wms/movimentos?limite=100")
      if (!res.ok) throw new Error("Falha ao carregar movimentos")
      return res.json()
    },
  })

  const { data: enderecos } = useQuery<Endereco[]>({
    queryKey: ["wms-enderecos"],
    queryFn: async () => {
      const res = await fetch("/api/wms/enderecos")
      if (!res.ok) throw new Error("Falha ao carregar endereços")
      return res.json()
    },
  })

  const { data: pecas } = useQuery<PecaAlocada[]>({
    queryKey: ["wms-estoque-alocado"],
    queryFn: async () => {
      const res = await fetch("/api/wms/estoque/alocado")
      if (!res.ok) throw new Error("Falha ao carregar peças alocadas")
      return res.json()
    },
  })

  const registrar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wms/movimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          estoqueId: estoqueId ? Number(estoqueId) : null,
          enderecoDestinoId:
            tipo === "TRANSFERENCIA" && enderecoDestinoId ? Number(enderecoDestinoId) : null,
          observacao: observacao || null,
        }),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao registrar movimento")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Movimento registrado")
      setEstoqueId("")
      setEnderecoDestinoId("")
      setObservacao("")
      queryClient.invalidateQueries({ queryKey: ["wms-movimentos"] })
      queryClient.invalidateQueries({ queryKey: ["wms-estoque-alocado"] })
      queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const ativos = (enderecos ?? []).filter((e) => e.ativo)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          Movimentos do Armazém
          {info && <InfoButton content={info} />}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Histórico de entradas, transferências, saídas e ajustes.
        </p>
      </div>

      <form
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          registrar.mutate()
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="TRANSFERENCIA">Transferência</option>
              <option value="SAIDA">Saída</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="peca">Peça alocada *</Label>
            <select
              id="peca"
              required
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={estoqueId}
              onChange={(e) => setEstoqueId(e.target.value)}
            >
              <option value="">Selecione</option>
              {(pecas ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  Rolo {p.nroRolo} / Peça {p.nroPeca}
                </option>
              ))}
            </select>
          </div>
          {tipo === "TRANSFERENCIA" && (
            <div className="space-y-1.5">
              <Label htmlFor="destino">Endereço de destino *</Label>
              <select
                id="destino"
                required
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={enderecoDestinoId}
                onChange={(e) => setEnderecoDestinoId(e.target.value)}
              >
                <option value="">Selecione</option>
                {ativos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo} ({e.tipo})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="observacao">Observação</Label>
            <Input
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={registrar.isPending || !estoqueId}>
            {registrar.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowLeftRight size={16} />
            )}
            Registrar
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : !movimentos?.length ? (
          <p className="p-8 text-center text-sm text-slate-500">Nenhum movimento registrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Peça</th>
                <th className="px-3 py-2 font-medium">Origem</th>
                <th className="px-3 py-2 font-medium">Destino</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {movimentos.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(m.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 font-medium">{m.tipo}</td>
                  <td className="px-3 py-2">
                    {m.nroRolo ? `Rolo ${m.nroRolo} / Peça ${m.nroPeca}` : "—"}
                  </td>
                  <td className="px-3 py-2">{m.origem ?? "—"}</td>
                  <td className="px-3 py-2">{m.destino ?? "—"}</td>
                  <td className="px-3 py-2">{m.metros ? Number(m.metros).toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{m.observacao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
