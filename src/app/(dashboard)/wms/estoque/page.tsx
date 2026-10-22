"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getInfoContent } from "@/lib/info-content"

type Peca = {
  empresa: string | null
  nro_rolo: string
  nro_peca: string
  produto: string | null
  categoria: string | null
  cor: string | null
  desenho: string | null
  variante: string | null
  largura: string | null
  metros: number | null
  peso: number | null
  situacao: string | null
  lote_interno: string | null
  data_entrada: string | null
}

type Endereco = { id: number; codigo: string; tipo: string; ativo: boolean }

const PAGINA = 50

export default function EstoquePage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [offset, setOffset] = useState(0)
  const [destinos, setDestinos] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery<{ itens: Peca[]; total: number }>({
    queryKey: ["wms-estoque", buscaAplicada, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        busca: buscaAplicada,
        limite: String(PAGINA),
        offset: String(offset),
      })
      const res = await fetch(`/api/wms/estoque?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar o estoque")
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

  const ativos = (enderecos ?? []).filter((e) => e.ativo)

  const alocar = useMutation({
    mutationFn: async ({ peca, enderecoId }: { peca: Peca; enderecoId: number }) => {
      const res = await fetch("/api/wms/movimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ENTRADA",
          enderecoDestinoId: enderecoId,
          peca: {
            empresa: peca.empresa,
            nroRolo: peca.nro_rolo,
            nroPeca: peca.nro_peca,
            produto: peca.produto,
            categoria: peca.categoria,
            cor: peca.cor,
            desenho: peca.desenho,
            variante: peca.variante,
            largura: peca.largura,
            metros: peca.metros,
            peso: peca.peso,
            situacao: peca.situacao,
            loteInterno: peca.lote_interno,
            dataEntrada: peca.data_entrada,
          },
        }),
      })
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}))
        throw new Error(erro.error ?? "Falha ao alocar peça")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Peça alocada")
      queryClient.invalidateQueries({ queryKey: ["wms-estoque"] })
      queryClient.invalidateQueries({ queryKey: ["wms-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["wms-movimentos"] })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / PAGINA)) : 1

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          Estoque em Aberto
          {info && <InfoButton content={info} />}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Peças sem baixa no ERP. Selecione um endereço e aloque no armazém.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setOffset(0)
          setBuscaAplicada(busca.trim())
        }}
      >
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-2.5 top-2 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por rolo, produto, cor ou lote"
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : !data?.itens.length ? (
          <p className="p-8 text-center text-sm text-slate-500">Nenhuma peça em aberto encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Rolo</th>
                <th className="px-3 py-2 font-medium">Peça</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Cor</th>
                <th className="px-3 py-2 font-medium">Largura</th>
                <th className="px-3 py-2 font-medium">Metros</th>
                <th className="px-3 py-2 font-medium">Lote</th>
                <th className="px-3 py-2 font-medium">Endereço</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.itens.map((p) => {
                const chave = `${p.empresa}-${p.nro_rolo}-${p.nro_peca}`
                const destino = destinos[chave] ?? ""
                return (
                  <tr key={chave}>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-50">{p.nro_rolo}</td>
                    <td className="px-3 py-2">{p.nro_peca}</td>
                    <td className="px-3 py-2">{p.produto ?? "—"}</td>
                    <td className="px-3 py-2">{p.cor ?? "—"}</td>
                    <td className="px-3 py-2">{p.largura ?? "—"}</td>
                    <td className="px-3 py-2">{p.metros != null ? p.metros.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{p.lote_interno ?? "—"}</td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Endereço de destino do rolo ${p.nro_rolo}`}
                        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                        value={destino}
                        onChange={(e) =>
                          setDestinos((atual) => ({ ...atual, [chave]: e.target.value }))
                        }
                      >
                        <option value="">Selecione</option>
                        {ativos.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.codigo} ({e.tipo})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        disabled={!destino || alocar.isPending}
                        onClick={() => alocar.mutate({ peca: p, enderecoId: Number(destino) })}
                      >
                        Alocar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > PAGINA && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {data.total.toLocaleString("pt-BR")} peças — página {Math.floor(offset / PAGINA) + 1} de{" "}
            {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGINA))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGINA >= data.total}
              onClick={() => setOffset((o) => o + PAGINA)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
