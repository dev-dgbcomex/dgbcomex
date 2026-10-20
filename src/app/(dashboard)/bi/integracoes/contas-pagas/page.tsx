"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  CheckCheck,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoButton } from "@/components/ui/info-button"
import type { OpcaoFiltro } from "@/components/ui/filtro-combo"
import { KpiCard } from "@/components/ui/kpi-card"
import { getInfoContent } from "@/lib/info-content"
import {
  FILTROS_VAZIOS,
  FORMATAR,
  agruparPorFornecedor,
  filtrarPorFiltros,
  type DetalheContasPagas,
  type FiltrosContasPagas,
  type PagamentoConta,
} from "@/lib/bi/contas-pagas-detalhe"
import { ContasPagasCard } from "./components/contas-pagas-card"
import { ContasPagasCharts } from "./components/contas-pagas-charts"
import { ContasPagasToolbar, type OpcoesDoRecorte } from "./components/contas-pagas-toolbar"
import { exportarCsvContasPagas } from "./components/contas-pagas-csv"
import {
  ORIENTACAO_LABEL,
  gerarPdfConsolidado,
  type OrientacaoPdf,
} from "./components/contas-pagas-pdf"

interface IntegracaoBi {
  id: number
  nome: string
  baseUrl: string
}

/** Hoje. O mês corrente entra zerado enquanto não houver baixa — como no card. */
const hoje = () => new Date().toISOString().slice(0, 10)

/**
 * O 1º dia do mês três meses atrás. É a data inicial com que a tela nasce: dá
 * contexto (um trimestre) sem trazer anos de baixa, e sempre no dia 1º para o
 * recorte fechar meses inteiros. A data final é hoje.
 */
function inicioPadrao(): string {
  const agora = new Date()
  const mes = new Date(agora.getFullYear(), agora.getMonth() - 3, 1)
  const ano = mes.getFullYear()
  const mm = String(mes.getMonth() + 1).padStart(2, "0")
  return `${ano}-${mm}-01`
}

/** Quantos cards aparecem de uma vez. O "Carregar mais" empurra o limite. */
const BLOCO_CARDS = 40

/**
 * Só as datas e o mês vão para a API; o resto dos filtros é local (130 linhas na
 * tela). Sem mês escolhido ("Todos"), `data` não vai: a API ancora os 4 cards fixos
 * em hoje e devolve a lista do intervalo inteiro.
 */
function parametrosDaApi(
  mes: string,
  aplicados: Pick<FiltrosContasPagas, "dataInicio" | "dataFim">
): string {
  const query = new URLSearchParams()
  if (mes) query.set("data", `${mes}-01`)
  if (aplicados.dataInicio) query.set("data_inicio", aplicados.dataInicio)
  if (aplicados.dataFim) query.set("data_fim", aplicados.dataFim)
  return query.toString()
}

export default function ContasPagasDetalhePage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  /**
   * O mês escolhido no seletor. `""` é "Todos": a lista e os grupos são o período
   * inteiro das datas, e os 4 cards fixos continuam ancorados em hoje.
   */
  const [mes, setMes] = useState("")
  const [filtros, setFiltros] = useState<FiltrosContasPagas>(FILTROS_VAZIOS)
  const [aplicados, setAplicados] = useState(FILTROS_VAZIOS)
  const [busca, setBusca] = useState("")
  /** As datas só nascem depois da primeira resposta, para a tela não abrir vazia. */
  const [datasSemeadas, setDatasSemeadas] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [limite, setLimite] = useState(BLOCO_CARDS)
  const [orientacaoPdf, setOrientacaoPdf] = useState<OrientacaoPdf>("portrait")
  const [gerandoPdf, setGerandoPdf] = useState(false)

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

  const parametros = parametrosDaApi(mes, aplicados)

  const { data: detalhe, isLoading, isFetching, error, refetch } =
    useQuery<DetalheContasPagas>({
      queryKey: ["contas-pagas-detalhe", integracao?.id, parametros],
      enabled: Boolean(integracao?.id),
      queryFn: async () => {
        const res = await fetch(
          `/api/integracao/${integracao!.id}/detalhe/contas-pagas-detalhe?${parametros}`
        )
        if (!res.ok) {
          const corpo = await res.json().catch(() => null)
          throw new Error(corpo?.detail ?? corpo?.error ?? `Falha na API (${res.status})`)
        }
        return res.json()
      },
    })

  /**
   * As baixas do recorte, já filtradas. Quem filtra por fornecedor/banco/empresa/
   * departamento na toolbar não vai ao ERP: são 130 linhas na tela, e ir ao ERP a
   * cada tecla tornaria a busca lenta e a API um Gargamel. As datas vão, e é o
   * filtro que muda o volume de verdade.
   */
  const itens = useMemo(
    () => (detalhe ? filtrarPorFiltros(detalhe.mes.itens, aplicados, busca) : []),
    [detalhe, aplicados, busca]
  )
  const grupos = useMemo(() => agruparPorFornecedor(itens), [itens])
  const gruposVisiveis = grupos.slice(0, limite)
  const total = useMemo(() => itens.reduce((soma, item) => soma + item.valor, 0), [itens])

  /**
   * Os grupos do recorte filtrado, refeitos aqui em vez de vir da API: com filtro
   * local, os `por_*` da resposta são do recorte inteiro e ficariam mentindo.
   */
  const gruposDe = useMemo(
    () => (chave: "razao_social" | "banco" | "empresa" | "departamento") => {
      const mapa = new Map<string, { lancamentos: number; valor: number }>()
      for (const item of itens) {
        const rotulo = String(item[chave] || "—")
        const atual = mapa.get(rotulo) ?? { lancamentos: 0, valor: 0 }
        atual.lancamentos += 1
        atual.valor += item.valor
        mapa.set(rotulo, atual)
      }
      return [...mapa.entries()]
        .map(([rotulo, dados]) => ({ [chave]: rotulo, ...dados }))
        .sort((a, b) => b.valor - a.valor)
    },
    [itens]
  )

  const porFornecedor = useMemo(() => gruposDe("razao_social"), [gruposDe])
  const porBanco = useMemo(() => gruposDe("banco"), [gruposDe])
  const porEmpresa = useMemo(() => gruposDe("empresa"), [gruposDe])
  const porDepartamento = useMemo(() => gruposDe("departamento"), [gruposDe])

  /**
   * As opções dos dropdowns vêm do relatório inteiro, não do recorte já filtrado.
   * Filtrar por um fornecedor esvaziaria a lista de bancos — e a pessoa que quer
   * combinar "um fornecedor" com "o banco dele" ficaria sem como escolher o banco.
   */
  const opcoes = useMemo<OpcoesDoRecorte>(() => {
    const carregar = (
      chave: "razao_social" | "banco" | "empresa" | "departamento",
      rotuloDe: (item: PagamentoConta) => { rotulo: string; codigo?: string }
    ): OpcaoFiltro[] => {
      const mapa = new Map<string, OpcaoFiltro>()
      for (const item of detalhe?.mes.itens ?? []) {
        const { rotulo, codigo } = rotuloDe(item)
        const atual = mapa.get(rotulo) ?? { rotulo, codigo, ocorrencias: 0, valor: 0 }
        atual.ocorrencias += 1
        atual.valor += item.valor
        mapa.set(rotulo, atual)
      }
      return [...mapa.values()].sort(
        (a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, "pt-BR")
      )
    }

    return {
      fornecedor: carregar("razao_social", (item) => ({
        rotulo: item.razao_social || "—",
        codigo: item.fornecedor,
      })),
      banco: carregar("banco", (item) => ({
        rotulo: item.banco || "—",
        codigo: item.numero_banco,
      })),
      empresa: carregar("empresa", (item) => ({ rotulo: item.empresa || "—" })),
      departamento: carregar("departamento", (item) => ({
        rotulo: item.departamento || "—",
        codigo: item.departamento_codigo,
      })),
    }
  }, [detalhe])

  /**
   * Os meses que caem entre a data inicial e a final — o que o seletor "Mês" lista.
   * A série da API cobre 24 meses terminando hoje; aqui só ficam os que cruzam o
   * intervalo escolhido. Enquanto as datas estão sendo editadas (antes de "Aplicar
   * filtros"), usa o que está `aplicados`, e o select acompanha o último carregado.
   */
  const mesesDoIntervalo = useMemo(() => {
    const inicio = aplicados.dataInicio || "0000-01-01"
    const fim = aplicados.dataFim || "9999-12-31"
    return (detalhe?.meses ?? []).filter((m) => {
      // O mês cruza o intervalo se o 1º dia dele não passa o fim e o último não
      // fica antes do início — comparação por prefixo de `YYYY-MM`, sem montar data.
      const primeiro = `${m.mes}-01`
      const ultimo = `${m.mes}-31`
      return primeiro <= fim && ultimo >= inicio
    })
  }, [detalhe, aplicados.dataInicio, aplicados.dataFim])

  /**
   * Na primeira resposta a tela nasce com "Todos" e sem datas. Aí semeia a data
   * inicial no 1º dia do mês três meses atrás e a final com hoje, e refaz a
   * consulta já com o período — é o que abre a tela com um trimestre inteiro em
   * vez do mês corrente. Só acontece uma vez; depois os campos mandam.
   */
  useEffect(() => {
    if (!detalhe || datasSemeadas) return
    setDatasSemeadas(true)
    const inicio = inicioPadrao()
    const fim = hoje()
    if (inicio > fim) return
    const proximos = { ...FILTROS_VAZIOS, dataInicio: inicio, dataFim: fim }
    setFiltros(proximos)
    setAplicados(proximos)
  }, [detalhe, datasSemeadas])

  /** Escolher um mês (ou "Todos"): só troca o parâmetro `data`, sem mexer nas datas. */
  const irParaMes = (escolha: string) => {
    setMes(escolha)
  }

  const aplicarFiltros = () => {
    setAplicados(filtros)
    setSelecionados(new Set())
    setLimite(BLOCO_CARDS)
  }

  const limparFiltros = () => {
    // "Limpar" volta ao período padrão (1º dia do mês três meses atrás até hoje)
    // em vez de esvaziar as datas: sem elas a tela recairia no mês corrente, que é
    // justamente o que o "Todos" evita.
    const base = { ...FILTROS_VAZIOS, dataInicio: inicioPadrao(), dataFim: hoje() }
    setFiltros(base)
    setAplicados(base)
    setMes("")
    setBusca("")
    setSelecionados(new Set())
    setLimite(BLOCO_CARDS)
  }

  const alternar = (atual: Set<string>, chave: string) => {
    const proximo = new Set(atual)
    if (proximo.has(chave)) proximo.delete(chave)
    else proximo.add(chave)
    return proximo
  }

  const gruposSelecionados = grupos.filter((grupo) => selecionados.has(grupo.chave))

  async function baixarPdfSelecionadas() {
    if (gruposSelecionados.length === 0) return
    setGerandoPdf(true)
    try {
      await gerarPdfConsolidado(
        gruposSelecionados,
        detalhe?.periodo.periodo ?? detalhe?.referencia.periodo ?? "",
        orientacaoPdf
      )
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/bi/integracoes"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div>
            <h1 className="flex items-center text-xl font-semibold text-slate-900 dark:text-slate-100">
              Contas Pagas — Baixas do ERP
              {info && <InfoButton content={info} />}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Uma baixa por pagamento, com fornecedor, banco, empresa e departamento do
              centro de custo. O valor usa a <strong>data da baixa</strong>, não a de
              vencimento.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => exportarCsvContasPagas(itens, parametros.replace(/[?&]/g, "-"))}
            disabled={!itens.length}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <Button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
            title="Busca as baixas de novo no ERP"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Recarregar do ERP
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <p>{error instanceof Error ? error.message : "Erro ao carregar"}</p>
          <p className="mt-1 text-xs">
            Os botões acima continuam disponíveis para tentar de novo. Nada foi apagado.
          </p>
        </div>
      )}

      <ContasPagasToolbar
        filtros={filtros}
        onChange={(patch) => setFiltros((atual) => ({ ...atual, ...patch }))}
        busca={busca}
        onBuscaChange={setBusca}
        onLimpar={limparFiltros}
        onAplicar={aplicarFiltros}
        totalBaixas={detalhe?.mes.itens.length ?? 0}
        totalFiltro={itens.length}
        periodo={
          detalhe ? { periodo: detalhe.periodo.periodo, recorte: detalhe.periodo.recorte } : null
        }
        opcoes={opcoes}
        meses={mesesDoIntervalo}
        mesSelecionado={mes}
        onSelecionarMes={irParaMes}
      />

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Carregando baixas do ERP…
        </div>
      )}

      {detalhe && (
        <>
          {/*
            Os quatro cards à esquerda são as janelas fixas do card do BI — mesmo
            `KpiCard` do faturamento, não cópia. O quinto é o período que a tela está
            mostrando: acompanha as datas em vez das janelas, e é onde o "Todos" e o
            recorte aparecem em número.
          */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              rotulo="Mês atual"
              periodo={detalhe.mes.periodo}
              valor={FORMATAR.valor(detalhe.mes.total)}
              detalhe={`${FORMATAR.numero(detalhe.mes.lancamentos)} baixas`}
              statusLabel="total do mês atual"
            />
            <KpiCard
              rotulo="Mês anterior"
              periodo={detalhe.mes_anterior.periodo}
              valor={FORMATAR.valor(detalhe.mes_anterior.total)}
              detalhe={`${FORMATAR.numero(detalhe.mes_anterior.lancamentos)} baixas`}
              statusLabel="total do mês anterior"
            />
            <KpiCard
              rotulo="Ano atual"
              periodo={detalhe.ano_atual.periodo}
              valor={FORMATAR.valor(detalhe.ano_atual.total)}
              detalhe={`${FORMATAR.numero(detalhe.ano_atual.lancamentos)} baixas`}
              statusLabel="total do ano atual"
            />
            <KpiCard
              rotulo="Ano anterior"
              periodo={detalhe.ano_anterior.periodo}
              valor={FORMATAR.valor(detalhe.ano_anterior.total)}
              detalhe={`${FORMATAR.numero(detalhe.ano_anterior.lancamentos)} baixas`}
              statusLabel="total do ano anterior"
            />
            <KpiCard
              rotulo="Período selecionado"
              periodo={detalhe.periodo.periodo}
              valor={FORMATAR.valor(detalhe.periodo.total)}
              detalhe={`${FORMATAR.numero(detalhe.periodo.lancamentos)} baixas`}
              statusLabel="total do período selecionado"
            />
          </div>

          {/*
            Os gráficos ficam acima da lista de propósito: o mês vazio acontece no
            primeiro acesso do mês corrente, e é daqui que se sai — pelo seletor de
            mês no toolbar. Escondê-los junto com a lista trancaria quem cair no mês
            sem baixa.
          */}
          <ContasPagasCharts
            meses={mesesDoIntervalo}
            porFornecedor={porFornecedor}
            porBanco={porBanco}
            porEmpresa={porEmpresa}
            porDepartamento={porDepartamento}
            total={total}
            totalBaixas={itens.length}
          />

          {detalhe.mes.lancamentos === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <strong>Sem baixas em {detalhe.referencia.rotulo}.</strong> Não é erro de carga: o
              valor considera a data da baixa, e nenhuma conta foi paga com baixa dentro deste mês
              ainda. Use as barras acima para pular para um mês fechado.
            </div>
          ) : (
            <>
              {grupos.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <span
                    role="status"
                    className="text-slate-600 dark:text-slate-300"
                    aria-label={`${selecionados.size} ${
                      selecionados.size === 1 ? "fornecedor selecionado" : "fornecedores selecionados"
                    }`}
                  >
                    <strong>{selecionados.size}</strong>{" "}
                    {selecionados.size === 1 ? "fornecedor selecionado" : "fornecedores selecionados"}
                    {selecionados.size > 0 && (
                      <span className="text-slate-400"> · PDF com {FORMATAR.valor(total)}</span>
                    )}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelecionados(new Set(grupos.map((g) => g.chave)))}
                      disabled={!grupos.length}
                      className="gap-2"
                      title={`Seleciona os ${grupos.length} fornecedores do filtro`}
                    >
                      <CheckCheck className="w-4 h-4" />
                      Selecionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelecionados(
                          new Set(
                            gruposVisiveis
                              .filter((g) => !selecionados.has(g.chave))
                              .map((g) => g.chave)
                          )
                        )
                      }
                      className="gap-2"
                      title="Seleciona os fornecedores desta página"
                    >
                      <Check className="w-4 h-4" />
                      Selecionar desta página
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelecionados(
                          new Set(
                            grupos
                              .filter((g) => !selecionados.has(g.chave))
                              .map((g) => g.chave)
                          )
                        )
                      }
                      className="gap-2"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Inverter
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelecionados(new Set())}
                      disabled={!selecionados.size}
                    >
                      Limpar seleção
                    </Button>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Orientação do PDF"
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={orientacaoPdf}
                      onChange={(e) => setOrientacaoPdf(e.target.value as OrientacaoPdf)}
                    >
                      {Object.entries(ORIENTACAO_LABEL).map(([valor, rotulo]) => (
                        <option key={valor} value={valor}>
                          PDF {rotulo}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={baixarPdfSelecionadas}
                      disabled={gerandoPdf || !selecionados.size}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {gerandoPdf
                        ? "Gerando..."
                        : `PDF único (${selecionados.size})`}
                    </Button>
                  </div>
                </div>
              )}

              <section aria-label="Fornecedores" className="space-y-3">
                {gruposVisiveis.map((grupo) => (
                  <ContasPagasCard
                    key={grupo.chave}
                    grupo={grupo}
                    selecionado={selecionados.has(grupo.chave)}
                    expandido={expandidos.has(grupo.chave)}
                    totalGeral={total}
                    onSelecionar={(chave) => setSelecionados((atual) => alternar(atual, chave))}
                    onExpandir={(chave) => setExpandidos((atual) => alternar(atual, chave))}
                    orientacao={orientacaoPdf}
                  />
                ))}
                {grupos.length > gruposVisiveis.length && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <p
                      role="status"
                      aria-label={`Mostrando ${gruposVisiveis.length} de ${grupos.length} fornecedores`}
                      className="text-xs text-slate-500 dark:text-slate-400"
                    >
                      Mostrando {gruposVisiveis.length} de{" "}
                      <strong>{FORMATAR.numero(grupos.length)}</strong> fornecedores
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLimite((n) => n + BLOCO_CARDS)}
                    >
                      Carregar mais fornecedores
                    </Button>
                  </div>
                )}
                {grupos.length === 0 && (
                  <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    Nenhuma baixa com esses filtros. Ajuste a busca, o fornecedor, o banco, a
                    empresa ou o departamento.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
