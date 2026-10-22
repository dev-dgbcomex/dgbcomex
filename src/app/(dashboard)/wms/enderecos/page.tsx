"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getInfoContent } from "@/lib/info-content"

type Endereco = {
  id: number
  codigo: string
  tipo: string
  zona: string | null
  rua: string | null
  predio: string | null
  nivel: string | null
  apto: string | null
  capacidade: string | null
  ativo: boolean
  observacoes: string | null
}

const TIPOS = ["PULMAO", "PICKING", "EXPEDICAO", "AVARIA"]

const vazio = {
  codigo: "",
  tipo: "PULMAO",
  zona: "",
  rua: "",
  predio: "",
  nivel: "",
  apto: "",
  capacidade: "",
  observacoes: "",
}

export default function EnderecosPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const queryClient = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState(vazio)

  const { data, isLoading } = useQuery<Endereco[]>({
    queryKey: ["wms-enderecos"],
    queryFn: async () => {
      const res = await fetch("/api/wms/enderecos")
      if (!res.ok) throw new Error("Falha ao carregar endereços")
      return res.json()
    },
  })

  const criar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wms/enderecos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacidade: form.capacidade ? Number(form.capacidade) : null,
        }),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao criar endereço")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Endereço criado")
      setForm(vazio)
      setAberto(false)
      queryClient.invalidateQueries({ queryKey: ["wms-enderecos"] })
      queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  function campo(nome: keyof typeof vazio, valor: string) {
    setForm((atual) => ({ ...atual, [nome]: valor }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Endereços do Armazém
            {info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Posições físicas disponíveis para alocação de peças.
          </p>
        </div>
        <Button onClick={() => setAberto((v) => !v)}>
          <Plus size={16} />
          {aberto ? "Fechar" : "Novo endereço"}
        </Button>
      </div>

      {aberto && (
        <form
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            criar.mutate()
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                required
                value={form.codigo}
                onChange={(e) => campo("codigo", e.target.value)}
                placeholder="A-01-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.tipo}
                onChange={(e) => campo("tipo", e.target.value)}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zona">Zona</Label>
              <Input id="zona" value={form.zona} onChange={(e) => campo("zona", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rua">Rua</Label>
              <Input id="rua" value={form.rua} onChange={(e) => campo("rua", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="predio">Prédio</Label>
              <Input id="predio" value={form.predio} onChange={(e) => campo("predio", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nivel">Nível</Label>
              <Input id="nivel" value={form.nivel} onChange={(e) => campo("nivel", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apto">Apto</Label>
              <Input id="apto" value={form.apto} onChange={(e) => campo("apto", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacidade">Capacidade (m)</Label>
              <Input
                id="capacidade"
                type="number"
                step="0.01"
                value={form.capacidade}
                onChange={(e) => campo("capacidade", e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending && <Loader2 size={16} className="animate-spin" />}
              Criar
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : !data?.length ? (
          <p className="p-8 text-center text-sm text-slate-500">Nenhum endereço cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Localização</th>
                <th className="px-4 py-2 font-medium">Capacidade</th>
                <th className="px-4 py-2 font-medium">Ativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-50">{e.codigo}</td>
                  <td className="px-4 py-2">{e.tipo}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {[e.zona, e.rua, e.predio, e.nivel, e.apto].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-2">{e.capacidade ? `${Number(e.capacidade).toFixed(2)} m` : "—"}</td>
                  <td className="px-4 py-2">{e.ativo ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
