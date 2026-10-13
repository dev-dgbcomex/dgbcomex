"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { FileText, RefreshCw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { FORMATAR, type DetalheContasPagas } from "@/lib/bi/contas-pagas-detalhe"
import { GraficoPagamentosMensais } from "./components/grafico-pagamentos"
import {
  TabelaPagamentos,
  exportarCsvContasPagas,
  filtrarPagamentos,
} from "./components/tabela-pagamentos"
import { TabelaGruposCusto } from "../custos-administrativos/components/tabela-grupos-custo"

interface IntegracaoBi {
  id: number
  nome: string
  baseUrl: string
}

/** Hoje. O mês corrente entra zerado enquanto não houver baixa — como no card. */
const hoje = () => new Date().toISOString().slice(0, 10)

/** "setembro" -> "Setembro", "set/2026" -> "Set/2026". */
const maiuscula = (rotulo: string) => rotulo.charAt(0).toUpperCase() + rotulo.slice(1)

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

export default function ContasPagasDetalhePage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [data, setData] = useState(hoje)
  const [aplicada, setAplicada] = useState(hoje)
  const [busca, setBusca] = useState("")
  /** Só quem clica escolhe o mês; a referência automática pode recuar sozinha. */
  const [escolhido, setEscolhido] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

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

  // `/contas-pagas/` não casa com as integrações "programado" (`contas-a-pagar`).
  const integracao = useMemo(
    () => integracoes?.find((i) => /contas-pagas/i.test(i.baseUrl)),
    [integracoes]
  )

  const { data: detalhe, isLoading, isFetching, error, refetch } =
    useQuery<DetalheContasPagas>({
      queryKey: ["contas-pagas-detalhe", integracao?.id, aplicada],
      enabled: Boolean(integracao?.id),
      queryFn: async () => {
        const res = await fetch(
          `/api/integracao/${integracao!.id}/detalhe/contas-pagas-detalhe?data=${aplicada}`
        )
        if (!res.ok) {
          const corpo = await res.json().catch(() => null)
          throw new Error(corpo?.detail ?? corpo?.error ?? `Falha na API (${res.status})`)
        }
        return res.json()
      },
    })

  const itens = useMemo(
    () => (detalhe ? filtrarPagamentos(detalhe.mes.itens, busca) : []),
    [detalhe, busca]
  )

  /**
   * O mês de referência nasce vazio quase sempre: em 13/10 ainda não houve baixa de
   * outubro, então a tela cairia numa lista sem nada. Quando isso acontece e ninguém
   * escolheu o mês, ela recua para o último mês fechado com baixa e diz qual é.
   * Quem clica num mês vazio no gráfico continua vendo o mês vazio — a escolha manda.
   */
  useEffect(() => {
    if (!detalhe || escolhido || detalhe.mes.lancamentos > 0) return
    const anterior = [...detalhe.meses]
      .reverse()
      .find((m) => m.lancamentos > 0 && m.mes < detalhe.referencia.mes)
    if (!anterior) return
    setData(`${anterior.mes}-01`)
    setAplicada(`${anterior.mes}-01`)
    setAviso(
      `${maiuscula(detalhe.referencia.rotulo)} ainda não tem nenhuma baixa. ` +
        `Mostrando ${maiuscula(anterior.rotulo)}, o último mês com pagamento ` +
        `(${FORMATAR.numero(anterior.lancamentos)} baixas).`
    )
  }, [detalhe, escolhido])

  /** Trocar o mês pela barra do gráfico ou pelo seletor: mesmo caminho de dados. */
  const irParaMes = (mes: string) => {
    setEscolhido(true)
    setAviso(null)
    setData(`${mes}-01`)
    setAplicada(`${mes}-01`)
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Contas Pagas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cada baixa de conta a pagar que compõe o card, do mês de{" "}
            {detalhe?.referencia.rotulo ?? "referência"}.
          </p>
        </div>
        {info && <InfoButton content={info} />}
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="cp-mes">Mês de referência</Label>
            <Input
              id="cp-mes"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cp-busca">Buscar nos pagamentos</Label>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
              <Input
                id="cp-busca"
                className="pl-8"
                placeholder="fornecedor, documento, banco..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={() => {
                setEscolhido(true)
                setAviso(null)
                setAplicada(data)
              }}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? "animate-spin" : ""} />
              Aplicar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEscolhido(false)
                setAviso(null)
                setData(hoje())
                setAplicada(hoje())
                setBusca("")
              }}
            >
              <X /> Limpar
            </Button>
          </div>
          <p className="self-end text-xs text-slate-500 dark:text-slate-400">
            O valor usa a <strong>data da baixa</strong>, não a de vencimento.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error instanceof Error ? error.message : "Erro ao carregar"}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Carregando baixas do ERP…
        </div>
      )}

      {detalhe && (
        <>
          {aviso && (
            <p
              aria-live="polite"
              className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
            >
              {aviso}{" "}
              <span className="text-sky-700 dark:text-sky-300">
                Clique em um mês no gráfico para ver os detalhes.
              </span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Cartao titulo="Mês atual" descricao={detalhe.mes.periodo}>
              <ValorCartao rotulo="total do mês atual">
                {FORMATAR.valor(detalhe.mes.total)}
              </ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {FORMATAR.numero(detalhe.mes.lancamentos)} baixas
              </p>
            </Cartao>
            <Cartao titulo="Mês anterior" descricao={detalhe.mes_anterior.periodo}>
              <ValorCartao rotulo="total do mês anterior">
                {FORMATAR.valor(detalhe.mes_anterior.total)}
              </ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {FORMATAR.numero(detalhe.mes_anterior.lancamentos)} baixas
              </p>
            </Cartao>
            <Cartao titulo="Ano atual" descricao={detalhe.ano_atual.periodo}>
              <ValorCartao rotulo="total do ano atual">
                {FORMATAR.valor(detalhe.ano_atual.total)}
              </ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {FORMATAR.numero(detalhe.ano_atual.lancamentos)} baixas
              </p>
            </Cartao>
            <Cartao titulo="Ano anterior" descricao={detalhe.ano_anterior.periodo}>
              <ValorCartao rotulo="total do ano anterior">
                {FORMATAR.valor(detalhe.ano_anterior.total)}
              </ValorCartao>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {FORMATAR.numero(detalhe.ano_anterior.lancamentos)} baixas
              </p>
            </Cartao>
          </div>

          <GraficoPagamentosMensais
            meses={detalhe.meses}
            mesSelecionado={detalhe.referencia.mes}
            onSelecionar={irParaMes}
          />

          {detalhe.mes.lancamentos === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <strong>Sem baixas em {detalhe.referencia.rotulo}.</strong> Não é erro de carga: o
              valor considera a data da baixa, e nenhuma conta foi paga com baixa dentro deste mês
              ainda. Use as barras acima para pular para um mês fechado.
            </div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                <TabelaGruposCusto
                  grupos={detalhe.mes.por_fornecedor}
                  chave="razao_social"
                  titulo="Por fornecedor"
                  descricao="Quem recebeu"
                  rotuloColuna="Fornecedor"
                  total={detalhe.mes.total}
                />
                <TabelaGruposCusto
                  grupos={detalhe.mes.por_banco}
                  chave="banco"
                  titulo="Por banco"
                  descricao="De onde saiu o dinheiro"
                  rotuloColuna="Banco"
                  total={detalhe.mes.total}
                />
              </div>

              <TabelaGruposCusto
                grupos={detalhe.mes.por_empresa}
                chave="empresa"
                titulo="Por empresa"
                descricao="Qual empresa pagou"
                rotuloColuna="Empresa"
                total={detalhe.mes.total}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Baixas de {detalhe.referencia.rotulo}
                  <span className="ml-2 font-normal text-slate-500">
                    {FORMATAR.valor(detalhe.mes.total)}
                  </span>
                </h2>
                <Button
                  variant="outline"
                  disabled={itens.length === 0}
                  onClick={() => exportarCsvContasPagas(itens, detalhe.referencia.mes)}
                >
                  <FileText /> Exportar CSV
                </Button>
              </div>

              <TabelaPagamentos itens={detalhe.mes.itens} busca={busca} />
            </>
          )}

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
