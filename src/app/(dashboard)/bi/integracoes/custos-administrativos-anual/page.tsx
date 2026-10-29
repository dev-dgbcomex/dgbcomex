"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { FileText, RefreshCw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoButton } from "@/components/ui/info-button"
import BotaoImportarApi from "@/components/integracao/BotaoImportarApi"
import { getInfoContent } from "@/lib/info-content"
import { resolverIntegracaoBi } from "@/lib/bi/integracao-bi"
import {
  FORMATAR,
  type DetalheCustosAdministrativosAnual,
} from "@/lib/bi/custo-detalhe"
import { GraficoCustoMensal } from "./components/grafico-custo-mensal"
import { TabelaMeses } from "./components/tabela-meses"
import { exportarCsvAnual, itensFiltrados } from "./components/utils"
import { TabelaGruposCusto } from "../custos-administrativos/components/tabela-grupos-custo"
import { TabelaLancamentosCusto } from "../custos-administrativos/components/tabela-lancamentos-custo"

interface IntegracaoBi {
  id: number
  nome: string
  baseUrl: string
}

function Cartao({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">{titulo}</p>
      {descricao && <p className="mt-0.5 text-[10px] text-slate-400">{descricao}</p>}
      <div className="mt-1">{children}</div>
    </div>
  )
}

function ValorCartao({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <p
      role="status"
      aria-label={rotulo}
      className="text-2xl font-semibold text-slate-900 dark:text-slate-100"
    >
      {children}
    </p>
  )
}

export default function CustosAdministrativosAnualPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [aplicada, setAplicada] = useState(() => new Date().toISOString().slice(0, 10))
  const [busca, setBusca] = useState("")
  const [mes, setMes] = useState("")

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

  // A integração do card anual. O filtro precisa ser específico: a integração do card
  // mensal também tem "custos-administrativos" na baseUrl e apareceria antes na lista.
  const integracao = useMemo(
    () =>
      resolverIntegracaoBi(
        integracoes,
        "/bi/integracoes/custos-administrativos-anual",
        /custos-administrativos-anual/i
      ),
    [integracoes]
  )

  const { data: detalhe, isLoading, isFetching, error, refetch } =
    useQuery<DetalheCustosAdministrativosAnual>({
      queryKey: ["custos-administrativos-anual-detalhe", integracao?.id, aplicada],
      enabled: Boolean(integracao?.id),
      queryFn: async () => {
        const res = await fetch(
          `/api/integracao/${integracao!.id}/detalhe/custos-administrativos-anual-detalhe?data=${aplicada}`
        )
        if (!res.ok) {
          const corpo = await res.json().catch(() => null)
          throw new Error(
            corpo?.detail ?? corpo?.error ?? `Falha na API (${res.status})`
          )
        }
        return res.json()
      },
    })

  /** "Importar via API" aqui é reler os 12 meses fechados direto do ERP. */
  async function importarDaApi() {
    const resultado = await refetch()
    if (resultado.error) throw resultado.error
  }

  const itens = useMemo(
    () => (detalhe ? itensFiltrados(detalhe, busca, mes) : []),
    [detalhe, busca, mes]
  )
  const mesEmFoco = useMemo(
    () => detalhe?.meses.find((m) => m.mes === mes) ?? null,
    [detalhe, mes]
  )
  const totalRecorte = useMemo(
    () => itens.reduce((soma, i) => soma + i.valor, 0),
    [itens]
  )

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Custo administrativo — 12 meses
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Onde foram os {detalhe ? FORMATAR.valor(detalhe.administrativo.total) : "R$ 0,00"} de
            despesa administrativa dos 12 meses fechados
            {detalhe && ` (${detalhe.janela.rotulo})`}, mês a mês e linha a linha.
          </p>
        </div>
        {info && <InfoButton content={info} />}
      </header>

      <BotaoImportarApi tela="bi" integracao={integracao} aoImportar={importarDaApi} />

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="anual-referencia">Mês de referência</Label>
            <Input
              id="anual-referencia"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              A série vai do mês 12 meses atrás até o mês anterior.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="anual-mes">Filtrar por mês</Label>
            <select
              id="anual-mes"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">Todos os 12 meses</option>
              {detalhe?.meses.map((m) => (
                <option key={m.mes} value={m.mes}>
                  {m.rotulo} — {FORMATAR.valor(m.administrativo)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="anual-busca">Buscar nos lançamentos</Label>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
              <Input
                id="anual-busca"
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
                const hoje = new Date().toISOString().slice(0, 10)
                setData(hoje)
                setAplicada(hoje)
                setBusca("")
                setMes("")
              }}
            >
              <X /> Limpar
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error instanceof Error ? error.message : "Erro ao carregar"}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Carregando 12 meses do ERP…
        </div>
      )}

      {detalhe && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Cartao titulo="% do faturamento" descricao="Quanto de cada R$ 1 vendido vira administração">
              <ValorCartao rotulo="porcentagem do faturamento">
                {detalhe.faturamento.porcentagem === null
                  ? "—"
                  : FORMATAR.porcentagem(detalhe.faturamento.porcentagem)}
              </ValorCartao>
            </Cartao>
            <Cartao titulo="Custo administrativo total" descricao={`${detalhe.janela.meses} meses fechados`}>
              <ValorCartao rotulo="custo administrativo total">
                {FORMATAR.valor(detalhe.administrativo.total)}
              </ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {FORMATAR.numero(detalhe.administrativo.lancamentos)} lançamentos
              </p>
            </Cartao>
            <Cartao titulo="Custo administrativo médio mensal" descricao="Total ÷ 12">
              <ValorCartao rotulo="custo administrativo médio mensal">
                {FORMATAR.valor(detalhe.administrativo.media)}
              </ValorCartao>
            </Cartao>
            <Cartao titulo="Faturamento" descricao={`Total ${FORMATAR.valor(detalhe.faturamento.total)}`}>
              <ValorCartao rotulo="faturamento médio mensal">
                {FORMATAR.valor(detalhe.faturamento.media)}
              </ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">média mensal</p>
            </Cartao>
          </div>

          <GraficoCustoMensal meses={detalhe.meses} mesSelecionado={mes} />

          <TabelaMeses detalhe={detalhe} mesSelecionado={mes} onSelecionar={setMes} />

          <div className="grid gap-4 xl:grid-cols-2">
            <TabelaGruposCusto
              grupos={detalhe.por_departamento}
              chave="departamento_nome"
              titulo="Por departamento"
              descricao="Onde o rateio caiu"
              rotuloColuna="Departamento"
              total={detalhe.administrativo.total}
            />
            <TabelaGruposCusto
              grupos={detalhe.por_despesa}
              chave="despesa"
              titulo="Por tipo de despesa"
              descricao="O que consumiu o orçamento"
              rotuloColuna="Despesa"
              total={detalhe.administrativo.total}
            />
          </div>

          <TabelaGruposCusto
            grupos={detalhe.por_fornecedor}
            chave="razao_social"
            titulo="Por fornecedor"
            descricao="Quem foi pago no período"
            rotuloColuna="Fornecedor"
            total={detalhe.administrativo.total}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Lançamentos
              <span className="ml-2 font-normal text-slate-500">
                {mesEmFoco ? mesEmFoco.rotulo : `${detalhe.janela.meses} meses`} —{" "}
                {FORMATAR.valor(totalRecorte)}
              </span>
            </h2>
            <div className="flex gap-2">
              {mes && (
                <Button variant="outline" onClick={() => setMes("")}>
                  <X /> Ver os 12 meses
                </Button>
              )}
              <Button
                variant="outline"
                disabled={itens.length === 0}
                onClick={() => exportarCsvAnual(itens, detalhe.janela.rotulo, mesEmFoco)}
              >
                <FileText /> Exportar CSV
              </Button>
            </div>
          </div>

          <TabelaLancamentosCusto itens={detalhe.itens} busca={busca} mes={mes} />

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
