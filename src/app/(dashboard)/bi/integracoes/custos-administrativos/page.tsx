"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoButton } from "@/components/ui/info-button"
import BotaoImportarApi from "@/components/integracao/BotaoImportarApi"
import { getInfoContent } from "@/lib/info-content"
import { resolverIntegracaoBi } from "@/lib/bi/integracao-bi"
import { TabelaGruposCusto } from "./components/tabela-grupos-custo"
import { TabelaLancamentosCusto } from "./components/tabela-lancamentos-custo"
import { exportarCsv, rotuloData, variacao } from "./components/utils"
import { FORMATAR, type DetalheCustosAdministrativos } from "@/lib/bi/custo-detalhe"

interface IntegracaoBi {
  id: number
  nome: string
  baseUrl: string
}

/** Hoje, ou o dia 1º se o dia for o fim do mês — a API só precisa do mês. */
function hojeAncorado(): string {
  const hoje = new Date()
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  const dia = hoje.getDate() === ultimoDia ? 1 : hoje.getDate()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
}

function Cartao({ titulo, children, descricao }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">{titulo}</p>
      {descricao && <p className="mt-0.5 text-[10px] text-slate-400">{descricao}</p>}
      <div className="mt-1">{children}</div>
    </div>
  )
}

/** Envolve o valor do cartão com um rótulo acessível, para o teste e para leitor de tela. */
function ValorCartao({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <p role="status" aria-label={rotulo} className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </p>
  )
}

export default function CustosAdministrativosDetalhePage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [data, setData] = useState(hojeAncorado)
  const [aplicada, setAplicada] = useState(hojeAncorado)
  const [busca, setBusca] = useState("")
  const [anteriorAberto, setAnteriorAberto] = useState(false)

  const { data: integracoes } = useQuery<IntegracaoBi[]>({
    queryKey: ["bi-integracao-listar"],
    queryFn: async () => {
      const res = await fetch("/api/integracao/listar?tela=bi")
      if (!res.ok) throw new Error("Falha ao listar integrações")
      const corpo = await res.json()
      return Array.isArray(corpo) ? corpo : (corpo.integracoes ?? [])
    },
    staleTime: 600000,
  })

  // Mesma integração que serve o card de custos administrativos: a baseUrl já aponta
  // para `custos-administrativos-mensal`, então o detalhe é a mesma origem. A busca
  // é pelo nome exato — o regex solto pegava "Custos Administrativos Anual", que vem
  // antes na lista e é outro endpoint.
  const integracao = useMemo(
    () =>
      resolverIntegracaoBi(
        integracoes,
        "/bi/integracoes/custos-administrativos",
        /custos-administrativos-mensal/i
      ),
    [integracoes]
  )

  const { data: detalhe, isLoading, isFetching, error, refetch } =
    useQuery<DetalheCustosAdministrativos>({
      queryKey: ["custos-administrativos-detalhe", integracao?.id, aplicada],
      enabled: Boolean(integracao?.id),
      queryFn: async () => {
        const res = await fetch(
          `/api/integracao/${integracao!.id}/detalhe/custos-administrativos-detalhe?data=${aplicada}`
        )
        if (!res.ok) {
          const corpo = await res.json().catch(() => null)
          throw new Error(corpo?.detail ?? corpo?.error ?? `Falha na API (${res.status})`)
        }
        return res.json()
      },
    })

  /** "Importar via API" aqui é reler o mês direto do ERP. */
  async function importarDaApi() {
    const resultado = await refetch()
    if (resultado.error) throw resultado.error
  }

  const atual = detalhe?.mes_atual
  const anterior = detalhe?.mes_anterior
  const varMes = useMemo(
    () => (atual && anterior ? variacao(atual.total, anterior.total) : null),
    [atual, anterior]
  )

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Custos Administrativos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lançamentos de contas pagas dos departamentos {detalhe?.departamentos.join(" e ") ?? "1.1.1.1 e 1.1.1.2"},
            comparando o mês selecionado com o anterior.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {info && <InfoButton content={info} />}
          <BotaoImportarApi tela="bi" integracao={integracao} aoImportar={importarDaApi} />
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="custo-mes">Mês de referência</Label>
            <Input
              id="custo-mes"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="custo-busca">Buscar nos lançamentos</Label>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
              <Input
                id="custo-busca"
                className="pl-8"
                placeholder="fornecedor, documento, despesa..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => setAplicada(data)} disabled={isFetching}>
              <RefreshCw className={isFetching ? "animate-spin" : ""} />
              Aplicar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setData(hojeAncorado())
                setAplicada(hojeAncorado())
                setBusca("")
              }}
            >
              <X /> Limpar
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          O mês corrente vai de 1º até o dia selecionado, igual ao card. Enquanto não houver
          baixa de contas pagas no mês, o total aparece R$ 0,00 — não é erro de carga.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error instanceof Error ? error.message : "Erro ao carregar"}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Carregando lançamentos do ERP…
        </div>
      )}

      {detalhe && atual && anterior && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Cartao titulo="Mês selecionado" descricao={atual.periodo}>
              <ValorCartao rotulo="total do mês selecionado">{FORMATAR.valor(atual.total)}</ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {FORMATAR.numero(atual.lancamentos)} lançamentos
              </p>
            </Cartao>
            <Cartao titulo="Mês anterior" descricao={anterior.periodo}>
              <ValorCartao rotulo="total do mês anterior">{FORMATAR.valor(anterior.total)}</ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {FORMATAR.numero(anterior.lancamentos)} lançamentos
              </p>
            </Cartao>
            <Cartao titulo="Variação" descricao="Mês selecionado contra o anterior">
              {varMes && varMes.diferenca !== 0 ? (
                <>
                  <ValorCartao rotulo="variação contra o mês anterior">
                    <span
                      className={
                        varMes.subiu
                          ? "flex items-center gap-1 text-red-600 dark:text-red-400"
                          : "flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {varMes.subiu ? (
                        <ArrowUpRight className="size-5" />
                      ) : (
                        <ArrowDownRight className="size-5" />
                      )}
                      {FORMATAR.valor(Math.abs(varMes.diferenca))}
                    </span>
                  </ValorCartao>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {varMes.porcentagem === null
                      ? "—"
                      : `${varMes.subiu ? "+" : "-"}${FORMATAR.porcentagem(varMes.porcentagem)}`}{" "}
                    {varMes.subiu ? "a mais" : "a menos"}
                  </p>
                </>
              ) : (
                <ValorCartao rotulo="variação contra o mês anterior">Estável</ValorCartao>
              )}
            </Cartao>
            <Cartao titulo="Departamentos" descricao="Considerados no cálculo">
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {detalhe.departamentos.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {detalhe.departamentos.join(" · ")}
              </p>
            </Cartao>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Composição de {atual.rotulo}
              <span className="ml-2 font-normal text-slate-500">
                {rotuloData(atual.inicio)} a {rotuloData(atual.fim)}
              </span>
            </h2>
            <Button
              variant="outline"
              disabled={atual.itens.length === 0}
              onClick={() => exportarCsv(atual, atual.mes)}
            >
              <FileText /> Exportar CSV
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TabelaGruposCusto
              grupos={atual.por_departamento}
              chave="departamento_nome"
              titulo="Por departamento"
              descricao="Onde o custo está concentrado"
              rotuloColuna="Departamento"
              total={atual.total}
            />
            <TabelaGruposCusto
              grupos={atual.por_despesa}
              chave="despesa"
              titulo="Por tipo de despesa"
              descricao="O que está sendo pago"
              rotuloColuna="Despesa"
              total={atual.total}
            />
          </div>

          <TabelaGruposCusto
            grupos={atual.por_fornecedor}
            chave="razao_social"
            titulo="Por fornecedor"
            descricao="Quem foi pago"
            rotuloColuna="Fornecedor"
            total={atual.total}
          />

          <TabelaLancamentosCusto itens={atual.itens} busca={busca} />

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <h2 className="p-0">
              <button
                type="button"
                aria-expanded={anteriorAberto}
                onClick={() => setAnteriorAberto((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Lançamentos de {anterior.rotulo} ({FORMATAR.valor(anterior.total)})
                <ChevronDown
                  className={`size-4 transition-transform ${anteriorAberto ? "rotate-180" : ""}`}
                />
              </button>
            </h2>
            {/* Renderizado só quando aberto: o mês anterior tem tantos lançamentos quanto
                o mês corrente e não é preciso paginar essa tabela escondida. */}
            {anteriorAberto && (
              <div className="flex flex-col gap-4 px-4 pb-4">
                <TabelaGruposCusto
                  grupos={anterior.por_departamento}
                  chave="departamento_nome"
                  titulo="Por departamento"
                  descricao={anterior.periodo}
                  rotuloColuna="Departamento"
                  total={anterior.total}
                />
                <TabelaLancamentosCusto itens={anterior.itens} busca={busca} />
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <Button onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "animate-spin" : ""} /> Recarregar do ERP
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
