"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  CheckCheck,
  Database,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoButton } from "@/components/ui/info-button"
import BotaoImportarApi from "@/components/integracao/BotaoImportarApi"
import { getInfoContent } from "@/lib/info-content"
import { resolverIntegracaoBi } from "@/lib/bi/integracao-bi"
import {
  consultar,
  estadoSalvo,
  limpar,
  mergeDelta,
  salvarEstado,
  substituirBase,
  type ConsultaFaturamento,
  type EstadoFaturamentoDetalhe,
  type FiltrosFaturamento,
  type ItemFaturamento,
} from "@/lib/bi/faturamento-detalhe-db"
import {
  decidirPlano,
  type DecisaoBase,
  type MarcadorBase,
} from "@/lib/bi/faturamento-base"
import { FaturamentoCard } from "./components/faturamento-card"
import { FaturamentoCharts } from "./components/faturamento-charts"
import { FaturamentoToolbar, type FiltrosToolbar } from "./components/faturamento-toolbar"
import { FaturamentoTabelaProdutos } from "./components/faturamento-tabela-produtos"
import { gerarPdfConsolidado } from "./components/faturamento-pdf"
import {
  ORIENTACAO_LABEL,
  agruparPorNf,
  descreverPeriodo,
  filtrarGruposPorBusca,
} from "./components/utils"
import type { GrupoFaturamento, IntegracaoBi, ItemDetalhe, OrientacaoPdf } from "./components/types"

const ITENS_POR_PAGINA = 500
/** Quantas notas renderizar por bloco; o resto entra com "Carregar mais". */
const BLOCO_NOTAS = 100

function janelasPadrao() {
  const hoje = new Date()
  const ano = hoje.getFullYear() - 1
  return {
    dataInicio: `${ano}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`,
    dataFim: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`,
  }
}

function paraItem(item: Record<string, unknown>): Omit<ItemFaturamento, "chave"> {
  return {
    empresa: String(item.empresa ?? ""),
    pedido: String(item.pedido ?? ""),
    item: Number(item.item ?? 0),
    nr_nota: String(item.nr_nota ?? ""),
    data_nota: String(item.data_nota ?? ""),
    cliente: String(item.cliente ?? ""),
    nome_cliente: String(item.nome_cliente ?? ""),
    cod_produto: String(item.cod_produto ?? ""),
    descricao_produto: String(item.descricao_produto ?? ""),
    unidade_produto: String(item.unidade_produto ?? ""),
    metros: Number(item.metros ?? 0),
    vr_unitario: Number(item.vr_unitario ?? 0),
    vr_total: Number(item.vr_total ?? 0),
    acres_desc: Number(item.acres_desc ?? 0),
    peso: Number(item.peso ?? 0),
    vr_nota: Number(item.vr_nota ?? 0),
    romaneio: String(item.romaneio ?? ""),
    representante_codigo: String(item.representante_codigo ?? ""),
    representante: String(item.representante ?? ""),
  }
}

/**
 * Baixa a base completa que já está no Neon, para popular o IndexedDB de um navegador
 * novo sem passar pelo ERP. O caminho vai sempre preenchido: `faturamento-detalhe/`
 * com barra final vira `["faturamento-detalhe", ""]` no catch-all e quebra a chamada.
 */
async function baixarBaseDoNeon(integracaoId: number): Promise<Omit<ItemFaturamento, "chave">[]> {
  const lista: Omit<ItemFaturamento, "chave">[] = []
  let pagina = 1
  for (;;) {
    const res = await fetch(
      `/api/integracao/${integracaoId}/detalhe/faturamento-detalhe?pagina=${pagina}&por_pagina=500`
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json?.detail || json?.error || "Erro ao baixar itens")
    const itens: Record<string, unknown>[] = json.itens ?? []
    for (const item of itens) lista.push(paraItem(item))
    const paginacao = json.paginacao ?? {}
    if (pagina >= Number(paginacao.total_paginas ?? 1)) break
    pagina += 1
  }
  return lista
}

/** Itens que o `carga`/`sync` já devolveram no corpo — dispensa a leitura do Neon. */
function itensDaResposta(json: Record<string, unknown>): Omit<ItemFaturamento, "chave">[] {
  const itens: Record<string, unknown>[] = Array.isArray(json.itens) ? json.itens : []
  return itens.map(paraItem)
}

/**
 * Marcador da base no Neon (`/faturamento-detalhe/estado`). Leitura barata: é o que
 * a tela usa para decidir entre baixar o espelho, pedir o delta ou recarregar.
 *
 * Falha de rede, 403 ou timeout viram `null` — "não sei", e não "está vazio". Com
 * `null` a regra é conservadora (não dispara leitura do ERP), e a tela só escala para
 * a carga quando o espelho vier vazio de verdade.
 */
async function lerEstadoNeon(integracaoId: number): Promise<MarcadorBase | null> {
  try {
    const res = await fetch(`/api/integracao/${integracaoId}/detalhe/faturamento-detalhe/estado`)
    if (!res.ok) return null
    const json = await res.json()
    return {
      carga_completa: Boolean(json.carga_completa),
      contagem: Number(json.contagem ?? 0),
      ultima_data: json.ultima_data ?? null,
    }
  } catch {
    return null
  }
}

export default function FaturamentoDetalhePage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [filtros, setFiltros] = useState<FiltrosToolbar>(() => ({
    ...janelasPadrao(),
    representante: "",
    cliente: "",
    produto: "",
    nota: "",
  }))
  const [aplicados, setAplicados] = useState<FiltrosToolbar>(() => ({ ...janelasPadrao(), representante: "", cliente: "", produto: "", nota: "" }))
  const [busca, setBusca] = useState("")
  const [acao, setAcao] = useState<"idle" | "carregando" | "atualizando" | "erro">("idle")
  const [plano, setPlano] = useState<DecisaoBase | null>(null)
  /** Motivo do servidor recusar repetir a carga/sync (outra sessão mexeu na base). */
  const [pulado, setPulado] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [selectedNfs, setSelectedNfs] = useState<Set<string>>(() => new Set())
  const [expandedNfs, setExpandedNfs] = useState<Set<string>>(() => new Set())
  const [orientacaoPdf, setOrientacaoPdf] = useState<OrientacaoPdf>("portrait")
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const { data: integracoes } = useQuery<IntegracaoBi[]>({
    queryKey: ["bi-integracao-listar"],
    queryFn: async () => {
      const res = await fetch("/api/integracao/listar?tela=bi")
      if (!res.ok) throw new Error("Erro ao listar integrações")
      return res.json()
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  // A integração do detalhe é a que aponta para o endpoint `faturamento-detalhe`.
  // A busca é pelo nome exato do card ("Faturamento do Dia"): casar só pelo texto
  // pegava "Faturamento Dia (diário)", que é outro endpoint — e o `find` com OU
  // devolvia o primeiro da lista, que quase sempre era esse.
  const integracao = useMemo(
    () =>
      resolverIntegracaoBi(integracoes, "/bi/integracoes/faturamento", /faturamento-detalhe/i),
    [integracoes]
  )

  // Período efetivo da tela: o que está nos filtros é só o que o usuário digitou,
  // quem vale é o que foi aplicado — e é esse que aparece nos números e gráficos.
  const periodoAplicado = useMemo(
    () =>
      descreverPeriodo(
        aplicados.dataInicio || filtros.dataInicio,
        aplicados.dataFim || filtros.dataFim
      ),
    [aplicados, filtros]
  )

  const consultaFiltros = useMemo<FiltrosFaturamento>(() => {
    const f: FiltrosFaturamento = {}
    if (aplicados.dataInicio) f.data_inicio = aplicados.dataInicio
    if (aplicados.dataFim) f.data_fim = aplicados.dataFim
    if (aplicados.representante.trim()) f.representante = aplicados.representante.trim()
    if (aplicados.cliente.trim()) f.cliente = aplicados.cliente.trim()
    if (aplicados.produto.trim()) f.produto = aplicados.produto.trim()
    return f
  }, [aplicados])

  // A janela com que o cache foi populado é a base de todo filtro: sem ela a tela
  // consulta o IndexedDB com a janela padrão de 12 meses e parece que a base sumiu.
  const [janelaDoCache, setJanelaDoCache] = useState<{ inicio: string; fim: string } | null>(null)
  useEffect(() => {
    let ativo = true
    void estadoSalvo().then((salvo) => {
      if (!ativo || !salvo) return
      setJanelaDoCache({ inicio: salvo.janela_inicio, fim: salvo.janela_fim })
    })
    return () => {
      ativo = false
    }
  }, [])

  /**
   * Traz o período inteiro, não uma página. O cache local limita `por_pagina` a
   * 500, então uma base de 12 meses dava ~11 páginas: a tela mostrava 214 das
   * 2.078 notas e os KPIs/gráficos contavam só a primeira página — parecia falta
   * de dado no Neon. Como tudo já está no IndexedDB, percorrer as páginas é
   * barato e deixa lista, totais e gráficos cobrindo o período inteiro.
   */
  const { data: consulta, isLoading: carregandoDb, refetch: recarregarDb } = useQuery<ConsultaFaturamento>({
    queryKey: ["faturamento-detalhe-consulta", consultaFiltros],
    queryFn: async () => {
      const primeira = await consultar(consultaFiltros, 1, ITENS_POR_PAGINA)
      const total = primeira.paginacao.total_paginas
      if (total <= 1) return primeira
      const itens = [...primeira.itens]
      for (let p = 2; p <= total; p++) {
        const seguinte = await consultar(consultaFiltros, p, ITENS_POR_PAGINA)
        itens.push(...seguinte.itens)
      }
      return { ...primeira, itens }
    },
    retry: false,
  })

  const { data: estado } = useQuery<EstadoFaturamentoDetalhe | null>({
    queryKey: ["faturamento-detalhe-estado-db"],
    queryFn: () => estadoSalvo(),
    retry: false,
  })

  const itensPeriodo = useMemo<ItemDetalhe[]>(() => consulta?.itens ?? [], [consulta])

  const todosGrupos = useMemo(() => agruparPorNf(itensPeriodo), [itensPeriodo])

  const grupos = useMemo(() => {
    const porNota = aplicados.nota.trim()
      ? todosGrupos.filter((g) => g.nr_nota.includes(aplicados.nota.trim()))
      : todosGrupos
    return filtrarGruposPorBusca(porNota, busca)
  }, [todosGrupos, busca, aplicados.nota])

  // 2.078 cartões no DOM de uma vez travam o navegador; o bloco cresce sob demanda.
  const [limiteRender, setLimiteRender] = useState(BLOCO_NOTAS)
  useEffect(() => {
    setLimiteRender(BLOCO_NOTAS)
  }, [grupos])
  const gruposVisiveis = useMemo(() => grupos.slice(0, limiteRender), [grupos, limiteRender])

  const resumo = consulta?.resumo

  const totaisPeriodo = useMemo(
    () => ({
      faturamento: grupos.reduce((soma, g) => soma + g.faturamento, 0),
      itens: grupos.reduce((soma, g) => soma + g.totalItens, 0),
      metros: grupos.reduce((soma, g) => soma + g.totalMetros, 0),
      peso: grupos.reduce((soma, g) => soma + g.totalPeso, 0),
    }),
    [grupos]
  )

  const temCacheLocal = estado?.carga_completa ?? false

  // O cache local só é válido se cobrir a janela que o filtro está pedindo.
  const janelaAtual = `${filtros.dataInicio}|${filtros.dataFim}`
  const janelaCache = janelaDoCache ?? (estado ? { inicio: estado.janela_inicio, fim: estado.janela_fim } : null)
  const cacheDesatualizado = Boolean(
    janelaCache && `${janelaCache.inicio}|${janelaCache.fim}` !== janelaAtual
  )
  const precisaPopularCache = !temCacheLocal || cacheDesatualizado

  /**
   * Só a operação em andamento trava os botões. Erro não trava: o aviso fica na tela
   * e os botões continuam vivos para a pessoa repetir — era o "`acao !== idle`" que
   * deixava a tela morta depois de uma falha.
   */
  const executando = acao === "carregando" || acao === "atualizando"

  function aplicarFiltros() {
    setAplicados(filtros)
    setSelectedNfs(new Set())
    setExpandedNfs(new Set())
  }

  function limparFiltros() {
    const padrao: FiltrosToolbar = { ...janelasPadrao(), representante: "", cliente: "", produto: "", nota: "" }
    setFiltros(padrao)
    setAplicados(padrao)
    setBusca("")
    setSelectedNfs(new Set())
    setExpandedNfs(new Set())
  }

  /**
   * O que cada caminho fez com a base. `pulado` é o servidor recusando repetir o
   * trabalho (outra sessão mexeu na base agora há pouco) — aí quem chama busca no
   * espelho; `erro` não vira mais nada, porque insistir atrás de um erro só esconde a
   * causa. Em ambos a tela já tem um destino para ir, então não há laço.
   */
  type ResultadoBase = "feito" | "pulado" | "erro"

  /**
   * Grava o marcador local e reconsulta a base: comum aos três caminhos.
   */
  const publicar = useCallback(async (novo: EstadoFaturamentoDetalhe) => {
    await salvarEstado(novo)
    setJanelaDoCache({ inicio: novo.janela_inicio, fim: novo.janela_fim })
    setSelectedNfs(new Set())
    setExpandedNfs(new Set())
    await recarregarDb()
  }, [recarregarDb])

  /**
   * Carga completa: lê 12 meses do ERP e **reescreve o Neon**. É a operação cara.
   * O `carga` devolve os itens no corpo, então o IndexedDB é populado sem reler o Neon.
   *
   * Devolve `false` quando a API respondeu `pulado`: outra sessão mexeu na base nos
   * últimos 30 minutos e reler o ERP não traria nada novo. Quem chama decide se busca
   * os itens no espelho — assim o grafo de chamadas não faz ciclo.
   */
  const rodarCarga = useCallback(
    async (opcoes: { motivo?: string; forcar?: boolean } = {}): Promise<ResultadoBase> => {
      setAcao("carregando")
      if (opcoes.motivo) setPlano({ plano: "carga", motivo: opcoes.motivo })
      try {
        const forcar = opcoes.forcar ? "?forcar=true" : ""
        const res = await fetch(
          `/api/integracao/${integracao!.id}/detalhe/faturamento-detalhe/carga${forcar}`,
          { method: "POST" }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.detail || json?.error || "Erro ao carregar a base")
        if (json?.pulado) {
          setPulado(String(json.motivo ?? "outra sessão acabou de atualizar a base."))
          return "pulado"
        }
        const lista = itensDaResposta(json)
        if (!lista.length) throw new Error("A API não devolveu itens na carga.")
        await limpar()
        await substituirBase(lista)
        await publicar({
          carga_completa: true,
          contagem: Number(json.contagem || lista.length),
          ultima_data: json.ultima_data ?? null,
          janela_inicio: filtros.dataInicio,
          janela_fim: filtros.dataFim,
        })
        setAcao("idle")
        return "feito"
      } catch (err) {
        setAcao("erro")
        setErro(err instanceof Error ? err.message : "Erro ao carregar a base")
        return "erro"
      }
    },
    [integracao, filtros.dataInicio, filtros.dataFim, publicar]
  )

  /** Só o delta: notas novas desde `ultima_data`, com merge no IndexedDB. */
  const rodarSync = useCallback(
    async (opcoes: { motivo?: string; forcar?: boolean } = {}): Promise<ResultadoBase> => {
      setAcao("atualizando")
      if (opcoes.motivo) setPlano({ plano: "sync", motivo: opcoes.motivo })
      try {
        const forcar = opcoes.forcar ? "?forcar=true" : ""
        const res = await fetch(
          `/api/integracao/${integracao!.id}/detalhe/faturamento-detalhe/sync${forcar}`,
          { method: "POST" }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.detail || json?.error || "Erro ao atualizar")
        if (json?.pulado) {
          setPulado(String(json.motivo ?? "outra sessão acabou de atualizar a base."))
          return "pulado"
        }
        // O sync devolve so o delta; o IndexedDB faz merge em vez de substituir.
        const novos = itensDaResposta(json)
        if (novos.length) await mergeDelta(novos, filtros.dataInicio, filtros.dataFim)
        await publicar({
          carga_completa: true,
          contagem: Number(json.contagem || novos.length),
          ultima_data: json.ultima_data ?? null,
          janela_inicio: filtros.dataInicio,
          janela_fim: filtros.dataFim,
        })
        setAcao("idle")
        return "feito"
      } catch (err) {
        setAcao("erro")
        setErro(err instanceof Error ? err.message : "Erro ao atualizar")
        return "erro"
      }
    },
    [integracao, filtros.dataInicio, filtros.dataFim, publicar]
  )

  /**
   * "Importar via API" na tela de faturamento: traz as notas do ERP.
   *
   * Com o cache local já populado, o caminho é o delta (merge no IndexedDB, sem
   * reescrever o Neon); sem ele, é a carga dos 12 meses. É a mesma regra que a
   * tela usa sozinha — aqui quem pediu foi a pessoa, então vai com `forcar`.
   */
  const importarDaApi = useCallback(async () => {
    const resultado = temCacheLocal
      ? await rodarSync({ motivo: "Importação via API", forcar: true })
      : await rodarCarga({ motivo: "Importação via API", forcar: true })
    if (resultado === "erro") {
      throw new Error("Não foi possível importar a base da API")
    }
  }, [temCacheLocal, rodarSync, rodarCarga])

  /**
   * Espelho do Neon: popula o IndexedDB deste navegador sem tocar no ERP e sem
   * reescrever o Neon. Se vier vazio, **escala para a carga** em vez de largar um
   * aviso morto: era o que travava a tela em produção, com os botões sem utilidade.
   *
   * `escalar` é desligado quando quem chamou já veio de uma carga recusada pelo
   * servidor: aí um espelho vazio é contradição e precisa virar erro, não laço.
   */
  const rodarDump = useCallback(
    async (opcoes: { motivo?: string; escalar?: boolean } = {}): Promise<ResultadoBase> => {
      setAcao("carregando")
      if (opcoes.motivo) setPlano({ plano: "usar-neon", motivo: opcoes.motivo })
      try {
        const lista = await baixarBaseDoNeon(integracao!.id)
        if (!lista.length) {
          if (opcoes.escalar === false) {
            setAcao("erro")
            setErro(
              "Outra sessão acabou de atualizar a base, mas o espelho do Neon veio vazio. Clique em Recarregar base para refazer."
            )
            return "erro"
          }
          await rodarCarga({
            motivo:
              "A base do Neon veio vazia — carregando 12 meses do ERP. Pode levar alguns minutos.",
          })
          return "erro"
        }
        await limpar()
        await substituirBase(lista)
        await publicar({
          carga_completa: true,
          contagem: lista.length,
          ultima_data: estado?.ultima_data ?? null,
          janela_inicio: filtros.dataInicio,
          janela_fim: filtros.dataFim,
        })
        setAcao("idle")
        return "feito"
      } catch (err) {
        setAcao("erro")
        setErro(err instanceof Error ? err.message : "Erro ao usar a base existente")
        return "erro"
      }
    },
    [integracao, estado?.ultima_data, filtros.dataInicio, filtros.dataFim, publicar, rodarCarga]
  )

  /**
   * Recarga pedida na mão — o botão continua sendo o escape hatch e manda `forcar`,
   * porque quem pede é a pessoa, não a decisão automática.
   */
  async function carregarBase() {
    setErro("")
    if (!integracao) {
      setErro("Integração de faturamento não encontrada. Cadastre-a em Admin → Integrações.")
      return
    }
    setPulado(null)
    await rodarCarga({ forcar: true })
  }

  /** Botão "Usar base do Neon": o espelho, com a mesma escalada para a carga. */
  const usarBaseExistente = useCallback(async () => {
    setErro("")
    if (!integracao) {
      setErro("Integração de faturamento não encontrada. Cadastre-a em Admin → Integrações.")
      return
    }
    setPulado(null)
    await rodarDump()
  }, [integracao, rodarDump])

  /**
   * Coloca a base em dia sozinho, sem depender de clique.
   *
   * Pergunta o marcador do Neon, decide com `decidirPlano` e executa: espelho quando
   * o Neon tem dado, delta quando está alguns dias atrás, carga quando está vazio ou
   * parado demais. Em produção a tela abria no aviso "a base do Neon está vazia" e
   * parava ali, com os botões travados, esperando alguém entender o que clicar.
   *
   * Quando o servidor responde `pulado` (outra sessão acabou de mexer na base), o
   * plano automático vai para o espelho em vez de insistir: os itens já estão lá.
   *
   * Uma tentativa por montagem (trava por ref): se falhar, o erro aparece e o usuário
   * pode repetir pelos botões.
   */
  const jaTentouPopular = useRef(false)
  const garantirBase = useCallback(async () => {
    const local = await estadoSalvo()
    const neon = await lerEstadoNeon(integracao!.id)
    const { plano, motivo } = decidirPlano({ estadoNeon: neon, cacheLocal: local })
    setPlano({ plano, motivo })
    if (plano === "carga") {
      // `pulado` = outra sessão acabou de mexer na base: os itens já estão no Neon,
      // então em vez de insistir a tela lê o espelho. `erro` não insiste.
      const r = await rodarCarga({ motivo })
      return r === "pulado" ? rodarDump({ escalar: false }) : undefined
    }
    if (plano === "sync") {
      const r = await rodarSync({ motivo })
      return r === "pulado" ? rodarDump({ escalar: false }) : undefined
    }
    if (plano === "usar-neon") return rodarDump({ motivo })
    // "pronto": nada a pedir. A tela já tem o que mostrar.
    setAcao("idle")
  }, [integracao, rodarCarga, rodarSync, rodarDump])

  useEffect(() => {
    if (jaTentouPopular.current) return
    if (!integracao) return
    if (estado === undefined) return // ainda consultando o estado do cache
    jaTentouPopular.current = true
    void garantirBase()
  }, [integracao, estado, garantirBase])

  /** Botão "Atualizar": o delta. Exige base local porque o sync tem watermark. */
  async function atualizarDelta() {
    setErro("")
    if (!integracao) {
      setErro("Integração de faturamento não encontrada. Cadastre-a em Admin → Integrações.")
      return
    }
    const st = await estadoSalvo()
    if (!st?.carga_completa) {
      setErro("Popule o cache antes de atualizar (botão Usar base do Neon ou Recarregar base).")
      return
    }
    setPulado(null)
    // Botão manual: `forcar` ignora o corte de recência do servidor. Quem quer as notas
    // de agora clica aqui, e o clique tem que valer mesmo que outro tenha feito há pouco.
    await rodarSync({ forcar: true })
  }

  function exportarCsv() {
    if (!itensPeriodo.length) return
    const colunas: (keyof ItemDetalhe)[] = [
      "data_nota",
      "nr_nota",
      "empresa",
      "pedido",
      "item",
      "cliente",
      "nome_cliente",
      "cod_produto",
      "romaneio",
      "representante",
      "representante_codigo",
      "metros",
      "vr_unitario",
      "vr_total",
      "acres_desc",
      "peso",
      "vr_nota",
    ]
    const linhas = itensPeriodo.map((linha) =>
      colunas
        .map((coluna) => {
          const valor = linha[coluna]
          if (valor === null || valor === undefined) return ""
          return `"${String(valor).replace(/"/g, '""')}"`
        })
        .join(";")
    )
    const blob = new Blob([[colunas.join(";"), ...linhas].join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `faturamento_detalhe_${filtros.dataInicio}_${filtros.dataFim}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleSelecaoNf = useCallback((chaveNf: string) => {
    setSelectedNfs((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chaveNf)) proximo.delete(chaveNf)
      else proximo.add(chaveNf)
      return proximo
    })
  }, [])

  const toggleExpandirNf = useCallback((chaveNf: string) => {
    setExpandedNfs((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chaveNf)) proximo.delete(chaveNf)
      else proximo.add(chaveNf)
      return proximo
    })
  }, [])

  const selecionadas = useMemo(() => [...selectedNfs], [selectedNfs])

  /** Grupos do período inteiro já carregados; o PDF consolidado usa esta base. */
  const gruposDoPeriodo = useMemo<GrupoFaturamento[]>(() => {
    const alvo = new Set<string>()
    for (const chave of selectedNfs) alvo.add(chave)
    return grupos.filter((grupo) => alvo.has(grupo.chave_nf))
  }, [grupos, selectedNfs])

  function selecionarTodas() {
    setSelectedNfs(new Set(grupos.map((grupo) => grupo.chave_nf)))
  }

  function selecionarVisiveis() {
    setSelectedNfs(new Set(grupos.map((grupo) => grupo.chave_nf)))
  }

  function limparSelecao() {
    setSelectedNfs(new Set())
  }

  function inverterSelecao() {
    setSelectedNfs((atual) => {
      const proximo = new Set(atual)
      for (const grupo of grupos) {
        if (proximo.has(grupo.chave_nf)) proximo.delete(grupo.chave_nf)
        else proximo.add(grupo.chave_nf)
      }
      return proximo
    })
  }

  async function baixarPdfSelecionadas() {
    if (!selecionadas.length) return
    setGerandoPdf(true)
    setErro("")
    try {
      // `grupos` já cobre o período inteiro, então nenhuma nota se perde no PDF.
      await gerarPdfConsolidado(grupos, selecionadas, orientacaoPdf)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar PDF")
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
              Faturamento — Detalhe das notas
              {info && <InfoButton content={info} />}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cache local no IndexedDB —{" "}
              {integracao ? integracao.nome : "integração não encontrada"} · última carga:{" "}
              {estado?.ultima_data ?? "—"}
            </p>
            {cacheDesatualizado && janelaCache && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                O cache local foi populado de {janelaCache.inicio} a {janelaCache.fim}. Ajuste a
                janela ou use <strong>Usar base do Neon</strong> para repopular.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={usarBaseExistente}
            disabled={executando || !precisaPopularCache}
            className="gap-2"
            title={
              precisaPopularCache
                ? "Baixa do Neon a base de 12 meses para este navegador, sem ler o ERP"
                : "O cache local já cobre a janela atual"
            }
          >
            <Download className={`w-4 h-4 ${acao === "carregando" ? "animate-spin" : ""}`} />
            Usar base do Neon
          </Button>
          <Button
            type="button"
            onClick={atualizarDelta}
            disabled={executando || !temCacheLocal}
            className="gap-2"
            title="Traz só as notas novas desde a última carga (lê o delta no ERP e faz merge no cache)"
          >
            <RefreshCw className={`w-4 h-4 ${acao === "atualizando" ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={carregarBase}
            disabled={executando}
            className="gap-2"
            title="Lê 12 meses no ERP e reescreve a base do Neon. A tela já faz isso sozinha quando a base está vazia ou parada"
          >
            <Database className={`w-4 h-4 ${acao === "carregando" ? "animate-spin" : ""}`} />
            {acao === "carregando" ? "Carregando..." : "Recarregar base (12 meses)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportarCsv}
            disabled={!itensPeriodo.length}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <BotaoImportarApi tela="bi" integracao={integracao} aoImportar={importarDaApi} />
        </div>
      </div>

      {erro && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <p>{erro}</p>
          {acao === "erro" && integracao && (
            <p className="mt-1 text-xs">
              Os botões acima continuam disponíveis para tentar de novo. Nada foi apagado.
            </p>
          )}
        </div>
      )}

      {/*
       * O que a tela decidiu fazer com a base. Fica na tela mesmo depois de pronto:
       * é a resposta para "por que a tela recarregou sozinha?" — e some quando a
       * pessoa mexe nos filtros, que não tem relação com a base.
       */}
      {plano && integracao && (
        <p
          role="status"
          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
        >
          {executando ? plano.motivo : <>{plano.motivo} Não é preciso clicar em nada.</>}
        </p>
      )}

      {/*
       * O servidor recusou repetir o trabalho. Não é erro: é o corte de recência, e a
       * base no Neon já está atualizada — a tela vai buscar os itens no espelho.
       */}
      {pulado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Não repeti a carga: {pulado}. Os itens já estão no Neon e a tela está
          mostrando a mesma base — nada se perdeu.
        </p>
      )}

      <FaturamentoToolbar
        filtros={filtros}
        onChange={(patch) => setFiltros((atual) => ({ ...atual, ...patch }))}
        busca={busca}
        onBuscaChange={setBusca}
        onLimpar={limparFiltros}
        onAplicar={aplicarFiltros}
        totalNotas={grupos.length}
        periodo={periodoAplicado}
      />

      {periodoAplicado && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Período em exibição
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {periodoAplicado.intervalo}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {periodoAplicado.duracao}
            {aplicados.dataInicio !== filtros.dataInicio ||
            aplicados.dataFim !== filtros.dataFim
              ? " — período aplicado; ajuste os campos e clique em Aplicar filtros"
              : ""}
          </span>
        </div>
      )}

      {resumo && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Itens no filtro: <strong>{resumo.itens.toLocaleString("pt-BR")}</strong>
          </span>
          <span>
            Notas: <strong>{resumo.notas.toLocaleString("pt-BR")}</strong>
          </span>
          <span>
            Pedidos: <strong>{resumo.pedidos.toLocaleString("pt-BR")}</strong>
          </span>
        </div>
      )}

      <FaturamentoCharts
        grupos={grupos}
        faturamentoTotal={totaisPeriodo.faturamento}
        totalItens={totaisPeriodo.itens}
        totalNotas={grupos.length}
        totalMetros={totaisPeriodo.metros}
        totalPeso={totaisPeriodo.peso}
      />

      <FaturamentoTabelaProdutos grupos={grupos} />

      {grupos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span
            role="status"
            className="text-slate-600 dark:text-slate-300"
            aria-label={`${selecionadas.length} ${selecionadas.length === 1 ? "nota selecionada" : "notas selecionadas"}`}
          >
            <strong>{selecionadas.length}</strong>{" "}
            {selecionadas.length === 1 ? "nota selecionada" : "notas selecionadas"}
            {selecionadas.length > 0 && (
              <span className="text-slate-400">
                {" "}
                · PDF com {gruposDoPeriodo.length}{" "}
                {gruposDoPeriodo.length === 1 ? "nota" : "notas"}
              </span>
            )}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selecionarTodas}
              disabled={!grupos.length}
              className="gap-2"
              title={`Seleciona as ${grupos.length} notas do período filtrado`}
            >
              <CheckCheck className="w-4 h-4" />
              Selecionar todas do período
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selecionarVisiveis}
              className="gap-2"
              title="Seleciona as notas desta página"
            >
              <Check className="w-4 h-4" />
              Selecionar desta página
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={inverterSelecao}
              className="gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Inverter
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limparSelecao}
              disabled={!selecionadas.length}
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
              disabled={gerandoPdf || !selecionadas.length}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              {gerandoPdf
                ? "Gerando..."
                : `PDF único (${selecionadas.length})`}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {gruposVisiveis.map((grupo) => (
          <FaturamentoCard
            key={grupo.chave_nf}
            grupo={grupo}
            selecionado={selectedNfs.has(grupo.chave_nf)}
            expandido={expandedNfs.has(grupo.chave_nf)}
            onSelecionar={toggleSelecaoNf}
            onExpandir={toggleExpandirNf}
            orientacao={orientacaoPdf}
          />
        ))}
        {grupos.length > gruposVisiveis.length && (
          <div className="flex flex-col items-center gap-2 py-4">
            <p
              role="status"
              aria-label={`Mostrando ${gruposVisiveis.length} de ${grupos.length} notas do período`}
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              Mostrando {gruposVisiveis.length} de{" "}
              <strong>{grupos.length.toLocaleString("pt-BR")}</strong> notas do período
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLimiteRender((n) => n + BLOCO_NOTAS)}
            >
              Carregar mais notas
            </Button>
          </div>
        )}
        {grupos.length === 0 && !carregandoDb && (
          <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Nenhuma nota encontrada. Carregue a base ou ajuste os filtros.
          </p>
        )}
      </div>
    </div>
  )
}