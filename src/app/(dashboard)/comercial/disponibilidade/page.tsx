"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, FileDown, FileText, RefreshCw, Search, TriangleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoButton } from "@/components/ui/info-button"
import { toast } from "sonner"
import { getInfoContent } from "@/lib/info-content"
import {
  FORMATAR,
  detalhePedidos,
  exportarCsvDisponibilidade,
  exportarPdfDisponibilidade,
  filtrarLinhas,
  ordenarLinhas,
  type ChaveOrdenacao,
  type Disponibilidade,
  type DisponibilidadeLinha,
  type DirecaoOrdenacao,
} from "@/lib/bi/disponibilidade"
import { DialogPedidos } from "./components/dialog-pedidos"

interface IntegracaoBi {
  id: number
  nome: string
  baseUrl: string
}

interface Filtros {
  produto: string
  cor: string
  representante: string
  soComFalta: boolean
  soChegando: boolean
}

const FILTROS_VAZIOS: Filtros = {
  produto: "",
  cor: "",
  representante: "",
  soComFalta: false,
  soChegando: false,
}

function Cartao({
  titulo,
  descricao,
  children,
  alerta,
}: {
  titulo: string
  descricao: string
  children: React.ReactNode
  alerta?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alerta
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">{titulo}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{descricao}</p>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {children}
      </div>
    </div>
  )
}

function Celula({ children, titulo }: { children: React.ReactNode; titulo?: string }) {
  return (
    <span role="status" aria-label={titulo} className="block">
      {children}
    </span>
  )
}

/** Uma linha: os tres numeros e os dois liquidos. Clicar abre quem prometeu. */
function LinhaDisponibilidade({
  linha,
  aberto,
  aoAlternar,
  aoAbrirPedidos,
}: {
  linha: DisponibilidadeLinha
  aberto: boolean
  aoAlternar: () => void
  aoAbrirPedidos: () => void
}) {
  return (
    <>
      <tr className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={aoAlternar}
            aria-expanded={aberto}
            className="flex items-center gap-1 text-left"
          >
            {aberto ? (
              <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
            )}
            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
              {linha.produto_desc || linha.produto}
            </span>
          </button>
        </td>
        <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
          {linha.cor_desc || linha.cor}
        </td>
        <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
          {FORMATAR.metros(linha.estoque_metros)}
          <span className="block text-[10px] text-slate-400">
            {FORMATAR.inteiro(linha.estoque_pecas)} peças · {FORMATAR.inteiro(linha.estoque_rolos)} rolos
          </span>
        </td>
        <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
          {linha.caminho_metros > 0 ? FORMATAR.metros(linha.caminho_metros) : "—"}
          {linha.primeira_chegada && (
            <span className="block text-[10px] text-slate-400">
              chega {FORMATAR.data(linha.primeira_chegada)}
              {linha.pedidos_compra > 1 ? ` · ${linha.pedidos_compra} compras` : ""}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
          {FORMATAR.metros(linha.prometido_metros)}
          <span className="block text-[10px] text-slate-400">{FORMATAR.valor(linha.prometido_valor)}</span>
        </td>
{/*
          Só o número na tabela. Passar o mouse mostra o agregado por representante
          (title nativo, sem JavaScript); clicar abre o modal com os pedidos linha a
          linha, código por código. O aria-label garante o mesmo conteúdo no leitor
          de tela.
        */}
        <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
          <span
            title={detalhePedidos(linha).join("\n")}
            aria-label={`${linha.pedidos_venda} pedidos: ${detalhePedidos(linha).join("; ")}`}
            className="cursor-help text-slate-400"
          >
            {FORMATAR.inteiro(linha.pedidos_venda)}
          </span>
        </td>
        <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
          {FORMATAR.metros(linha.livre_metros)}
        </td>
        <td
          className={`px-3 py-2 text-right text-xs font-semibold whitespace-nowrap ${
            linha.cobertura_metros < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {FORMATAR.metros(linha.cobertura_metros)}
        </td>
      </tr>
      {aberto && (
        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
          <td colSpan={8} className="px-3 py-3">
            {linha.por_representante.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum pedido em aberto para esta cor.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {linha.por_representante.map((rep) => (
                  <span
                    key={rep.vendedor}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <strong>{rep.vendedor_nome || rep.vendedor}</strong> · {FORMATAR.metros(rep.saldo)} ·{" "}
                    {FORMATAR.valor(rep.valor)} · {rep.pedidos} pedidos
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={aoAbrirPedidos} className="gap-2">
                Ver os {FORMATAR.inteiro(linha.pedidos_venda)} pedidos
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/** Os cabeçalhos que ordenam. `produto`/`cor` são texto; o resto, número. */
const COLUNAS: { chave: ChaveOrdenacao; titulo: string; numero?: boolean }[] = [
  { chave: "produto", titulo: "Produto" },
  { chave: "cor", titulo: "Cor" },
  { chave: "estoque", titulo: "Estoque", numero: true },
  { chave: "caminho", titulo: "A caminho", numero: true },
  { chave: "prometido", titulo: "Prometido", numero: true },
  { chave: "pedidos", titulo: "Pedidos", numero: true },
  { chave: "livre", titulo: "Livre", numero: true },
  { chave: "cobertura", titulo: "Depois da compra", numero: true },
]

export default function DisponibilidadeComercialPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_VAZIOS)
  const [busca, setBusca] = useState("")
  const [aberta, setAberta] = useState<string | null>(null)
  /** Cor cujos pedidos estao no modal. */
  const [pedidosDaLinha, setPedidosDaLinha] = useState<DisponibilidadeLinha | null>(null)
  // A fila que o comercial abre a tela para ver e a de falta: e assim que comeca.
  const [ordem, setOrdem] = useState<{ chave: ChaveOrdenacao; direcao: DirecaoOrdenacao }>({
    chave: "falta",
    direcao: "desc",
  })

  const { data: integracoes } = useQuery<IntegracaoBi[]>({
    queryKey: ["integracao-listar", "comercial"],
    queryFn: async () => {
      const res = await fetch("/api/integracao/listar?tela=comercial")
      if (!res.ok) throw new Error("Falha ao listar integrações")
      const corpo = await res.json()
      return Array.isArray(corpo) ? corpo : (corpo.integracoes ?? [])
    },
    staleTime: 600000,
  })

  // O proxy usa a `baseUrl` so pela origem, entao o que identifica a integração da tela
  // e o caminho: `/estoque-disponibilidade`.
  const integracao = useMemo(
    () => integracoes?.find((i) => /estoque-disponibilidade/i.test(i.baseUrl)),
    [integracoes]
  )

  const consulta = useMemo(() => {
    const p = new URLSearchParams()
    if (aplicados.produto.trim()) p.set("produto", aplicados.produto.trim())
    if (aplicados.cor.trim()) p.set("cor", aplicados.cor.trim())
    if (aplicados.representante.trim()) p.set("representante", aplicados.representante.trim())
    if (aplicados.soComFalta) p.set("so_com_falta", "true")
    if (aplicados.soChegando) p.set("so_chegando", "true")
    return p.toString()
  }, [aplicados])

  const { data, isLoading, isFetching, error, refetch } = useQuery<Disponibilidade>({
    queryKey: ["estoque-disponibilidade", integracao?.id, consulta],
    enabled: Boolean(integracao?.id),
    queryFn: async () => {
      const res = await fetch(
        `/api/integracao/${integracao!.id}/detalhe/estoque-disponibilidade${consulta ? `?${consulta}` : ""}`
      )
      const corpo = await res.json().catch(() => null)
      if (!res.ok) throw new Error(corpo?.detail || corpo?.error || `Falha na API (${res.status})`)
      return corpo as Disponibilidade
    },
  })

  const filtradas = useMemo(() => (data ? filtrarLinhas(data.linhas, busca) : []), [data, busca])
  const linhas = useMemo(
    () => ordenarLinhas(filtradas, ordem.chave, ordem.direcao),
    [filtradas, ordem]
  )

  const resumo = data?.resumo

  /** Clicar no cabeçalho ordena; clicar de novo inverte a direção. */
  const ordenarPor = (chave: ChaveOrdenacao) =>
    setOrdem((atual) =>
      atual.chave === chave
        ? { chave, direcao: atual.direcao === "asc" ? "desc" : "asc" }
        : { chave, direcao: chave === "produto" || chave === "cor" ? "asc" : "desc" }
    )

  async function gerarPdfRelatorio() {
    if (!resumo) return
    try {
      await exportarPdfDisponibilidade(
        linhas,
        `Disponibilidade ${new Date().toLocaleDateString("pt-BR")}`,
        resumo
      )
    } catch {
      toast.error("Não foi gerar o PDF")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Disponibilidade
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            O que tem em estoque, o que está chegando e o que já foi prometido, por produto e cor.
            Clique numa linha para ver quem prometeu.
          </p>
        </div>
        {info && <InfoButton content={info} />}
      </header>

      {resumo && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Cartao
            titulo="Cores com falta"
            descricao="prometido acima do estoque"
            alerta={resumo.com_falta > 0}
          >
            <Celula titulo="cores com falta">{FORMATAR.inteiro(resumo.com_falta)}</Celula>
            <span className="text-xs text-slate-500">
              de {FORMATAR.inteiro(resumo.produtos_cor)} produto/cor
            </span>
          </Cartao>
          <Cartao titulo="Estoque" descricao="peças em aberto no ERP">
            {FORMATAR.metros(resumo.total_estoque)}
          </Cartao>
          <Cartao titulo="A caminho" descricao="compras com entrega futura">
            {FORMATAR.metros(resumo.total_caminho)}
          </Cartao>
          <Cartao titulo="Falta hoje" descricao="prometido acima do estoque, antes da compra">
            <Celula titulo="falta total">{FORMATAR.metros(resumo.total_falta)}</Celula>
          </Cartao>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="dp-produto">Produto</Label>
            <Input
              id="dp-produto"
              placeholder="000014 ou VELUDO"
              value={filtros.produto}
              onChange={(e) => setFiltros((atual) => ({ ...atual, produto: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dp-cor">Cor</Label>
            <Input
              id="dp-cor"
              placeholder="00005"
              value={filtros.cor}
              onChange={(e) => setFiltros((atual) => ({ ...atual, cor: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dp-rep">Representante</Label>
            <Input
              id="dp-rep"
              placeholder="058"
              value={filtros.representante}
              onChange={(e) => setFiltros((atual) => ({ ...atual, representante: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={() => setAplicados(filtros)}
              disabled={isFetching || !integracao}
              className="gap-2"
            >
              <RefreshCw className={isFetching ? "animate-spin" : ""} />
              Aplicar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFiltros(FILTROS_VAZIOS)
                setAplicados(FILTROS_VAZIOS)
                setBusca("")
              }}
              className="gap-2"
            >
              <X /> Limpar
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex flex-1 items-center gap-2">
            <Label htmlFor="dp-busca" className="shrink-0">
              Buscar
            </Label>
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
              <Input
                id="dp-busca"
                className="pl-8"
                placeholder="produto ou cor"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={filtros.soComFalta}
              onChange={(e) =>
                setFiltros((atual) => ({ ...atual, soComFalta: e.target.checked }))
              }
            />
            Só o que falta
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={filtros.soChegando}
              onChange={(e) =>
                setFiltros((atual) => ({ ...atual, soChegando: e.target.checked }))
              }
            />
            Só o que está chegando
          </label>
          <Button
            variant="outline"
            disabled={!linhas.length}
            onClick={() =>
              exportarCsvDisponibilidade(
                linhas,
                `disponibilidade_${new Date().toISOString().slice(0, 10)}`
              )
            }
            className="gap-2"
          >
            <FileDown /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            disabled={!linhas.length || !resumo}
            onClick={gerarPdfRelatorio}
            className="gap-2"
          >
            <FileText /> Relatório em PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error instanceof Error ? error.message : "Erro ao carregar"}
        </div>
      )}

      {isLoading && integracao && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Lendo estoque, compras em trânsito e carteira…
        </div>
      )}

      {!integracao && !isLoading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Integração de disponibilidade não encontrada.</strong> Cadastre em Admin →
          Integrações com a URL da api-microdata (<code>/estoque-disponibilidade</code>) ou rode{" "}
          <code>node scripts/adicionar-integracao-disponibilidade.js</code>.
        </div>
      )}

      {linhas.length > 0 && (
        <section
          aria-label="Disponibilidade por produto e cor"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  {COLUNAS.map(({ chave, titulo, numero }) => {
                    const ativa = ordem.chave === chave
                    return (
                      <th
                        key={chave}
                        aria-sort={
                          ativa ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none"
                        }
                        className={`px-3 py-2 text-xs font-medium tracking-wider uppercase ${
                          numero ? "text-right" : "text-left"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => ordenarPor(chave)}
                          className={`flex w-full cursor-pointer items-center gap-1 ${
                            numero ? "justify-end" : ""
                          } ${ativa ? "text-slate-900 dark:text-slate-100" : "text-slate-500"}`}
                        >
                          {titulo}
                          <span aria-hidden="true" className="text-[10px]">
                            {ativa ? (ordem.direcao === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => {
                  const chave = `${linha.produto}|${linha.cor}`
                  return (
                    <LinhaDisponibilidade
                      key={chave}
                      linha={linha}
                      aberto={aberta === chave}
                      aoAlternar={() => setAberta(aberta === chave ? null : chave)}
                      aoAbrirPedidos={() => setPedidosDaLinha(linha)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <strong className="font-medium text-slate-600 dark:text-slate-300">Livre</strong> é o
            que sobra do estoque depois do que já foi prometido: negativo quando a carteira
            pediu mais do que existe.{" "}
            <strong className="font-medium text-slate-600 dark:text-slate-300">
              Depois da compra
            </strong>{" "}
            soma o que está chegando — se continua negativo, é porque não há compra em trânsito
            cobrindo o que falta.
          </p>
        </section>
      )}

      {data && linhas.length === 0 && !isFetching && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <TriangleAlert className="size-6 text-amber-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {busca ? "Nenhum produto ou cor encontrado." : "Nenhum produto ou cor no recorte."}
          </p>
        </div>
      )}

      {integracao && (
        <DialogPedidos
          integracaoId={integracao.id}
          linha={pedidosDaLinha}
          aoFechar={() => setPedidosDaLinha(null)}
        />
      )}
    </div>
  )
}