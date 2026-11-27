import { and, desc, eq, inArray, lt, ilike, or } from "drizzle-orm"
import { chamarIA, type MensagemIA, type ResultadoIA } from "@/lib/ai"
import { classificarSaudeProspeccao, type ClassificacaoSaude } from "@/lib/crm/classificacao-saude"
import { faixaConversaoSql } from "@/lib/crm/contadores-listagem"
import type { FaixaConversao } from "@/lib/crm/faixa-conversao"
import { db } from "@/lib/db"
import { aiChaves } from "@/lib/db/schema/ai-chaves"
import { clientes } from "@/lib/db/schema/clientes"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"

export type ChaveProspeccao = { tipo: "cliente" | "pessoa"; id: number }
export type NomeConsultaCurada = "oportunidades" | "visitas" | "acoes"

export type LinhaAnaliseIA = {
  id: number
  tipo: "cliente" | "pessoa"
  nome: string
  documento?: string | null
  segmento?: string | null
  porte?: string | null
  responsaveis?: string[]
  scoreEsforco: number
  scoreEngajamento: number
  percentualConversao?: number
  visitasRealizadas?: number
  visitasAgendadas?: number
  acoesRealizadas?: number
  acoesAgendadas?: number
  ultimaVisita?: string | null
  proximaVisita?: string | null
  ultimaAcao?: string | null
  proximaAcao?: string | null
  statusOportunidadeDominante?: string | null
  valorEstimadoTotal?: number
  probabilidadeMedia?: number
  pedidosVenda?: number
  faturamentos?: number
}

export type LinhaAnaliseContexto = LinhaAnaliseIA & {
  chave: string
  classificacao: ClassificacaoSaude
  temperatura: FaixaConversao
}

export type ConsultaCurada = {
  nome: NomeConsultaCurada
  chave: ChaveProspeccao
  limite: number
}

export type ResultadoConsultaCurada = ConsultaCurada & { dados: unknown[] }
export type CompactacaoDadosIA = { total: number; incluidos: number; omitidos: number }

const TOKENS_DECISAO = 1024
const TOKENS_ANALISE = 8192
const TOKENS_RESUMO_FATIA = 1024
const TAMANHO_TEXTO_CURTO = 80
const LIMITE_FATIAMENTO_CHARS = 45_000
const TAMANHO_FATIA_CHARS = 18_000
const LIMITE_MEMORIA_FATIAS_CHARS = 40_000

export const PERGUNTA_ANALISE_PADRAO =
  "Faça uma análise da saúde da prospecção destes registros e sugira ações para melhorá-la."

export type PerfilContextoIA = "padrao" | "nvidia"

const LIMITES_CONTEXTO_IA: Record<
  PerfilContextoIA,
  { dados: number; historico: number; mensagemHistorico: number; consulta: number }
> = {
  padrao: {
    dados: 14_000,
    historico: 6_000,
    mensagemHistorico: 1_000,
    consulta: 4_000,
  },
  nvidia: {
    dados: 100_000,
    historico: 30_000,
    mensagemHistorico: 4_000,
    consulta: 20_000,
  },
}

const MAX_HISTORICO_IA = 6

export function medirMensagensIA(mensagens: MensagemIA[]) {
  const enviadoChars = JSON.stringify(mensagens).length
  return { enviadoChars, estTokensAprox: Math.max(1, Math.ceil(enviadoChars / 4)) }
}

const INSTRUCAO_DECISAO = `Etapa de decisão: responda SOMENTE uma linha.
Se os dados recebidos forem suficientes, responda exatamente: PRONTO
Se precisar de mais dados, responda exatamente uma linha no formato CONSULTAR: oportunidades|cliente|123|10 (ou visitas/acoes e cliente/pessoa).
Não escreva análise, Markdown ou qualquer outro texto nesta etapa.`

const REGRAS_SISTEMA = `Você é um assistente de Saúde da Prospecção do PDM Pro Têxtil.
Use EXCLUSIVAMENTE as regras e os dados abaixo. Nunca crie outra métrica, outro score ou outra faixa.
Nunca mencione que está usando regras próprias ou genéricas.

CLASSIFICAÇÃO DE SAÚDE:
- Engajados: Engajamento > 30%. Esta regra prevalece sobre todas as outras, mesmo com esforço alto.
- AEC: Engajamento <= 30% e Esforço > 45%.
- BEC: Engajamento <= 30% e Esforço <= 45%. Esforço exatamente 45% é BEC.

TEMPERATURA (critério canônico do sistema):
- QUENTE: oportunidade em NEGOCIACAO, ou ganho (FECHADO_GANHO/GANHO) no mês corrente, ou pedido de venda no mês corrente.
- MORNO: oportunidade em PROPOSTA, ou ganho no trimestre corrente, ou pedido de venda no trimestre corrente.
- FRIO: demais casos.

PONTUAÇÃO DE SAÚDE (use somente estes pesos):
- Esforço: visita/ação realizada (+12,5) + relato/ata (+12,5) + check-in (+12,5) + contato (+12,5) + proposta (+25) + oportunidade (+25), limitado a 100%.
- Engajamento: visita/ação realizada (+20) + visita/ação agendada (+10) + proposta negociada (+20) + oportunidade negociada (+20) + pedido de venda (+15) + faturamento (+15), limitado a 100%.
- Conversão: comercial = mínimo(50%, pedidos de venda ÷ oportunidades × 50%); financeira = mínimo(50%, faturamentos ÷ pedidos de venda × 50%); conversão real = comercial + financeira, arredondada e limitada a 100%. Sem oportunidades, comercial é 0%; sem pedidos, financeira é 0%.

REGRAS DE RESPOSTA:
- Responda em português do Brasil, em Markdown limpo e estruturado, com no máximo 700 palavras.
- Comece com "## Diagnóstico", depois "## Como elevar a saúde" e "## Prioridades". Use "###" para subtítulos dentro dessas seções.
- Sempre que comparar 3 ou mais registros ou métricas, use uma tabela Markdown com cabeçalho. Quando listar registros individualmente, use as colunas: Registro | Classe | Temp. | Esforço | Engaj. | Conv. | Próxima ação.
- Use "- [ ]" para checklist de ações, "**negrito**" para destaques e "> " para alertas curtos. Não use emoji, HTML, bloco de código envolvendo a resposta nem repita em prosa o que já está na tabela.
- Use links Markdown [texto](url) somente quando a URL estiver nos dados recebidos; nunca invente URL nem use javascript:.
- Para cada registro listado individualmente, cite nome, classificação, temperatura, esforço, engajamento e conversão usando os valores recebidos. Quando houver amostragem, use apenas o resumoDosOmitidos recebido, sem inventar nomes.
- Sugira ações que aumentem o engajamento (proposta negociada, oportunidade negociada, pedido de venda, faturamento, visita/ação agendada) ou reduzam esforço sem inventar novos critérios.
- Para AEC, prefira ações que transformem esforço em engajamento. Para BEC, prefira aumentar cadência e registrar relato/ata e check-in. Para Engajados, mantenha o movimento e avance para pedido/faturamento.
- Para temperaturas FRIA/MORNA, sugira avançar para PROPOSTA/NEGOCIACAO conforme a regra canônica, sempre dentro do sistema.
- Se precisar de mais dados, responda EXATAMENTE uma linha no formato: CONSULTAR: oportunidades|cliente|123|10 (ou visitas/acoes e cliente/pessoa). Não escreva mais nada nessa resposta. Você pode pedir no máximo 2 consultas por análise.
- Consultas permitidas: oportunidades, visitas, acoes. Nunca peça SQL livre.`

const REGRAS_FATIAMENTO = `Você compacta um lote de registros da Saúde da Prospecção para manter o contexto de uma análise maior.
Não faça análise final, não sugira ações e nunca responda CONSULTAR.
Preserve, para cada registro recebido, uma linha fiel com: chave, nome, classificação, temperatura, esforço, engajamento, conversão, visitas realizadas/agendadas, ações realizadas/agendadas, status/valor/probabilidade da oportunidade, pedidos e faturamentos. Separe esses campos por " | " para permitir montar tabela Markdown depois.
Ao final, inclua contagens por classificação e temperatura e os registros que exigem atenção.
Use português do Brasil, formato compacto, sem Markdown e com no máximo 3500 caracteres. Não invente dados.`

function chaveDeLinha(linha: Pick<LinhaAnaliseIA, "tipo" | "id">) {
  return `${linha.tipo}:${linha.id}`
}

export async function buscarTemperaturas(
  linhas: LinhaAnaliseIA[]
): Promise<Map<string, FaixaConversao>> {
  const resultado = new Map<string, FaixaConversao>()
  const idsClientes = [...new Set(linhas.filter((l) => l.tipo === "cliente").map((l) => l.id))]
  const idsPessoas = [...new Set(linhas.filter((l) => l.tipo === "pessoa").map((l) => l.id))]

  if (idsClientes.length) {
    const registros = await db
      .select({ id: clientes.id, faixa: faixaConversaoSql("cliente") })
      .from(clientes)
      .where(inArray(clientes.id, idsClientes))
    for (const registro of registros) resultado.set(`cliente:${registro.id}`, registro.faixa)
  }

  if (idsPessoas.length) {
    const registros = await db
      .select({ id: crmLeads.id, faixa: faixaConversaoSql("lead") })
      .from(crmLeads)
      .where(inArray(crmLeads.id, idsPessoas))
    for (const registro of registros) resultado.set(`pessoa:${registro.id}`, registro.faixa)
  }

  return resultado
}

export function prepararLinhas(
  linhas: LinhaAnaliseIA[],
  temperaturas: Map<string, FaixaConversao>
): LinhaAnaliseContexto[] {
  return linhas.map((linha) => {
    const classificacao = classificarSaudeProspeccao({
      scoreEsforco: linha.scoreEsforco,
      scoreEngajamento: linha.scoreEngajamento,
    })
    return {
      ...linha,
      chave: chaveDeLinha(linha),
      classificacao: classificacao.rotulo,
      temperatura: temperaturas.get(chaveDeLinha(linha)) ?? "FRIO",
    }
  })
}

function textoCurto(valor: string | null | undefined, limite = TAMANHO_TEXTO_CURTO) {
  if (!valor) return null
  const texto = String(valor)
  return texto.length <= limite ? texto : `${texto.slice(0, limite - 1)}…`
}

function resumoFiltros(filtros: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(filtros).map(([chave, valor]) => [
      chave,
      typeof valor === "string" ? textoCurto(valor) : valor,
    ])
  )
}

function resumoLinha(linha: LinhaAnaliseContexto) {
  return {
    nome: textoCurto(linha.nome),
    tipo: linha.tipo,
    classificacao: linha.classificacao,
    temperatura: linha.temperatura,
    esforco: linha.scoreEsforco,
    engajamento: linha.scoreEngajamento,
    conversao: linha.percentualConversao ?? 0,
    visitas: {
      realizadas: linha.visitasRealizadas ?? 0,
      agendadas: linha.visitasAgendadas ?? 0,
      ultima: textoCurto(linha.ultimaVisita, 30),
      proxima: textoCurto(linha.proximaVisita, 30),
    },
    acoes: {
      realizadas: linha.acoesRealizadas ?? 0,
      agendadas: linha.acoesAgendadas ?? 0,
      ultima: textoCurto(linha.ultimaAcao, 30),
      proxima: textoCurto(linha.proximaAcao, 30),
    },
    oportunidade: {
      status: textoCurto(linha.statusOportunidadeDominante, 40),
      valor: linha.valorEstimadoTotal ?? 0,
      probabilidade: linha.probabilidadeMedia ?? 0,
    },
    pedidos: linha.pedidosVenda ?? 0,
    faturamentos: linha.faturamentos ?? 0,
    segmento: textoCurto(linha.segmento, 40),
    responsaveis: (linha.responsaveis ?? [])
      .slice(0, 3)
      .map((nome) => textoCurto(nome, 40))
      .filter((nome): nome is string => Boolean(nome)),
  }
}

const PESO_TEMPERATURA: Record<FaixaConversao, number> = { QUENTE: 3, MORNO: 2, FRIO: 1 }

function compararRegistros(a: LinhaAnaliseContexto, b: LinhaAnaliseContexto) {
  return (
    PESO_TEMPERATURA[b.temperatura] - PESO_TEMPERATURA[a.temperatura] ||
    b.scoreEngajamento - a.scoreEngajamento ||
    (b.percentualConversao ?? 0) - (a.percentualConversao ?? 0) ||
    a.nome.localeCompare(b.nome, "pt-BR")
  )
}

function agregarOmitidos(linhas: LinhaAnaliseContexto[]) {
  const porTipo: Record<string, number> = { cliente: 0, pessoa: 0 }
  const porTemperatura: Record<FaixaConversao, number> = { QUENTE: 0, MORNO: 0, FRIO: 0 }
  const porClassificacao: Record<string, number> = {}
  let visitasRealizadas = 0
  let visitasAgendadas = 0
  let acoesRealizadas = 0
  let acoesAgendadas = 0
  let pedidosVenda = 0
  let faturamentos = 0

  for (const linha of linhas) {
    porTipo[linha.tipo] = (porTipo[linha.tipo] ?? 0) + 1
    porTemperatura[linha.temperatura] = (porTemperatura[linha.temperatura] ?? 0) + 1
    porClassificacao[linha.classificacao] = (porClassificacao[linha.classificacao] ?? 0) + 1
    visitasRealizadas += linha.visitasRealizadas ?? 0
    visitasAgendadas += linha.visitasAgendadas ?? 0
    acoesRealizadas += linha.acoesRealizadas ?? 0
    acoesAgendadas += linha.acoesAgendadas ?? 0
    pedidosVenda += linha.pedidosVenda ?? 0
    faturamentos += linha.faturamentos ?? 0
  }

  return {
    quantidade: linhas.length,
    porTipo,
    porTemperatura,
    porClassificacao,
    totais: {
      visitasRealizadas,
      visitasAgendadas,
      acoesRealizadas,
      acoesAgendadas,
      pedidosVenda,
      faturamentos,
    },
  }
}

function jsonLimitado(valor: unknown, limite: number) {
  const texto = JSON.stringify(valor)
  if (texto.length <= limite) return texto
  if (Array.isArray(valor)) {
    for (let quantidade = valor.length - 1; quantidade >= 0; quantidade--) {
      const candidato = JSON.stringify(valor.slice(0, quantidade))
      if (candidato.length <= limite) return candidato
    }
  }
  return JSON.stringify({
    aviso: "dados omitidos por limite de tamanho",
    total: Array.isArray(valor) ? valor.length : 0,
  })
}

function montarBlocoDados(
  linhas: LinhaAnaliseContexto[],
  filtros: Record<string, unknown>,
  perfil: PerfilContextoIA
) {
  const ordenadas = [...linhas].sort(compararRegistros)
  const resumos = ordenadas.map(resumoLinha)
  const filtrosCompactos = resumoFiltros(filtros)

  for (let quantidade = resumos.length; quantidade >= 0; quantidade--) {
    const dados = {
      filtros: filtrosCompactos,
      registros: resumos.slice(0, quantidade),
      amostragem: {
        total: resumos.length,
        incluidos: quantidade,
        omitidos: resumos.length - quantidade,
        criterio: "temperatura, engajamento e conversão",
        resumoDosOmitidos: agregarOmitidos(ordenadas.slice(quantidade)),
      },
    }
    const bloco = JSON.stringify(dados)
    if (bloco.length <= LIMITES_CONTEXTO_IA[perfil].dados) {
      return {
        bloco,
        compactacao: {
          total: resumos.length,
          incluidos: quantidade,
          omitidos: resumos.length - quantidade,
        },
      }
    }
  }

  return {
    bloco: JSON.stringify({
      filtros: filtrosCompactos,
      registros: [],
      amostragem: {
        total: resumos.length,
        incluidos: 0,
        omitidos: resumos.length,
        criterio: "temperatura, engajamento e conversão",
        resumoDosOmitidos: agregarOmitidos(ordenadas),
      },
    }),
    compactacao: { total: resumos.length, incluidos: 0, omitidos: resumos.length },
  }
}

function montarHistoricoMensagens(
  historico: { papel: "usuario" | "assistente"; conteudo: string }[],
  perfil: PerfilContextoIA
) {
  const historicoSelecionado = historico.slice(-MAX_HISTORICO_IA)
  let restante = LIMITES_CONTEXTO_IA[perfil].historico
  const mensagensHistorico: MensagemIA[] = []

  for (let indice = historicoSelecionado.length - 1; indice >= 0; indice--) {
    const limite = Math.min(LIMITES_CONTEXTO_IA[perfil].mensagemHistorico, restante)
    if (limite <= 0) break
    const conteudo = historicoSelecionado[indice].conteudo.slice(0, limite)
    mensagensHistorico.unshift({
      role: historicoSelecionado[indice].papel === "usuario" ? "user" : "assistant",
      content: conteudo,
    })
    restante -= conteudo.length
  }

  return mensagensHistorico
}

type OpcoesMensagensAnalise = {
  linhas: LinhaAnaliseContexto[]
  filtros: Record<string, unknown>
  historico?: { papel: "usuario" | "assistente"; conteudo: string }[]
  pergunta?: string
  dadosConsulta?: ResultadoConsultaCurada
  perfil?: PerfilContextoIA
}

function montarMensagensAnaliseComCompactacao({
  linhas,
  filtros,
  historico = [],
  pergunta,
  dadosConsulta,
  perfil = "padrao",
}: OpcoesMensagensAnalise): {
  mensagens: MensagemIA[]
  compactacao: CompactacaoDadosIA
  memoria: string
} {
  const limites = LIMITES_CONTEXTO_IA[perfil]
  const { bloco, compactacao } = montarBlocoDados(linhas, filtros, perfil)
  const mensagensHistorico = montarHistoricoMensagens(historico, perfil)

  const mensagens: MensagemIA[] = [
    { role: "system", content: REGRAS_SISTEMA },
    {
      role: "user",
      content: `Dados dos registros filtrados na tela:\n${bloco}\n\n${
        pergunta ?? PERGUNTA_ANALISE_PADRAO
      }`,
    },
    ...mensagensHistorico,
  ]

  if (dadosConsulta) {
    mensagens.push({
      role: "user",
      content: `Dados da consulta curada ${dadosConsulta.nome} para ${
        dadosConsulta.chave.tipo
      } ${dadosConsulta.chave.id}:\n${jsonLimitado(
        dadosConsulta.dados,
        limites.consulta
      )}\n\nAgora responda à pergunta original em Markdown, sem novas consultas.`,
    })
  }

  return { mensagens, compactacao, memoria: bloco }
}

export function montarMensagensAnalise(opcoes: OpcoesMensagensAnalise): MensagemIA[] {
  return montarMensagensAnaliseComCompactacao(opcoes).mensagens
}

export function montarMensagensConversaAnalise({
  analise,
  memoria,
  filtros,
  consultas = [],
  historico = [],
  pergunta,
  perfil = "padrao",
}: {
  analise: { titulo: string | null; analise: string; resumo: string | null }
  memoria: string
  filtros: Record<string, unknown>
  consultas?: ResultadoConsultaCurada[]
  historico?: { papel: "usuario" | "assistente"; conteudo: string }[]
  pergunta: string
  perfil?: PerfilContextoIA
}): MensagemIA[] {
  const limites = LIMITES_CONTEXTO_IA[perfil]
  const contextoConsultas = consultas.length
    ? `\n\nConsultas já feitas nesta análise:\n${jsonLimitado(consultas, limites.consulta)}`
    : ""

  return [
    { role: "system", content: REGRAS_SISTEMA },
    {
      role: "user",
      content: `Você está respondendo sobre uma análise já salva no sistema. Use aquela análise e o contexto compactado abaixo; não peça os registros novamente. Responda em Markdown limpo, mantendo títulos, tabelas, checklist e destaques quando ajudarem.\n\nTítulo: ${analise.titulo ?? "Análise salva"}\nResumo: ${analise.resumo ?? "—"}\n\nAnálise salva:\n${textoLimitado(
        analise.analise,
        limites.dados
      )}\n\nContexto compactado dos registros usados na análise:\n${textoLimitado(
        memoria,
        limites.dados
      )}\n\nFiltros originais: ${JSON.stringify(resumoFiltros(filtros))}${contextoConsultas}\n\nPergunta atual: ${pergunta}`,
    },
    ...montarHistoricoMensagens(historico, perfil),
  ]
}

export function perfilContextoDaChave(chave: ChaveIAResumo | null): PerfilContextoIA {
  return chave && /nvidia|nemotron/i.test(`${chave.nome ?? ""} ${chave.modelo ?? ""}`)
    ? "nvidia"
    : "padrao"
}

export function parseConsultaCurada(conteudo: string): ConsultaCurada | null {
  const match = conteudo.match(
    /^\s*CONSULTAR:\s*(oportunidades|visitas|acoes)\s*\|\s*(cliente|pessoa)\s*\|\s*(\d+)(?:\s*\|\s*(\d+))?\s*$/im
  )
  if (!match) return null
  const limite = match[4] ? Number(match[4]) : 10
  return {
    nome: match[1] as NomeConsultaCurada,
    chave: { tipo: match[2] as "cliente" | "pessoa", id: Number(match[3]) },
    limite: Math.min(Math.max(limite, 1), 20),
  }
}

export function limparResposta(conteudo: string): string {
  return conteudo
    .replace(/^\s*```(?:markdown|md)?\s*\n/i, "")
    .replace(/\n```\s*$/i, "")
    .replace(/^\s*CONSULTAR:.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export type ChaveIAResumo = { id: number; provedor: string; nome: string; modelo: string | null }

export async function buscarChaveIAAnalise(): Promise<ChaveIAResumo | null> {
  try {
    const [chave] = await db
      .select({ id: aiChaves.id, provedor: aiChaves.provedor, nome: aiChaves.nome, modelo: aiChaves.modelo })
      .from(aiChaves)
      .where(
        and(
          eq(aiChaves.ativo, true),
          lt(aiChaves.failCount, 5),
          eq(aiChaves.provedor, "openai_compatible"),
          or(ilike(aiChaves.nome, "%nvidia%"), ilike(aiChaves.modelo, "%nemotron%"))
        )
      )
      .orderBy(aiChaves.ordem)
      .limit(1)
    return chave ?? null
  } catch {
    return null
  }
}

export async function executarConsultaCurada(consulta: ConsultaCurada): Promise<ResultadoConsultaCurada> {
  const { chave, limite } = consulta
  let dados: unknown[] = []

  if (consulta.nome === "oportunidades") {
    const condicao =
      chave.tipo === "cliente"
        ? eq(crmOportunidades.clienteId, chave.id)
        : eq(crmOportunidades.empresaId, chave.id)
    dados = await db
      .select({
        id: crmOportunidades.id,
        titulo: crmOportunidades.titulo,
        status: crmOportunidades.status,
        valor: crmOportunidades.valorEstimado,
        probabilidade: crmOportunidades.probabilidade,
        atualizadoEm: crmOportunidades.updatedAt,
      })
      .from(crmOportunidades)
      .where(condicao)
      .orderBy(desc(crmOportunidades.updatedAt))
      .limit(limite)
  } else if (consulta.nome === "visitas") {
    const condicao =
      chave.tipo === "cliente"
        ? eq(crmVisitas.clienteId, chave.id)
        : eq(crmVisitas.empresaId, chave.id)
    dados = await db
      .select({
        id: crmVisitas.id,
        data: crmVisitas.dataVisita,
        tipo: crmVisitas.tipo,
        status: crmVisitas.status,
        relato: crmVisitas.relato,
        criadoEm: crmVisitas.createdAt,
      })
      .from(crmVisitas)
      .where(condicao)
      .orderBy(desc(crmVisitas.dataVisita))
      .limit(limite)
  } else {
    const condicao =
      chave.tipo === "cliente"
        ? eq(crmAcoesProspeccao.clienteId, chave.id)
        : eq(crmAcoesProspeccao.empresaId, chave.id)
    dados = await db
      .select({
        id: crmAcoesProspeccao.id,
        data: crmAcoesProspeccao.dataAcao,
        tipo: crmAcoesProspeccao.tipo,
        status: crmAcoesProspeccao.status,
        relato: crmAcoesProspeccao.relato,
        criadoEm: crmAcoesProspeccao.createdAt,
      })
      .from(crmAcoesProspeccao)
      .where(condicao)
      .orderBy(desc(crmAcoesProspeccao.dataAcao))
      .limit(limite)
  }

  return { ...consulta, dados }
}

export type FatiamentoAnaliseIA = {
  total: number
  fatias: number
  incluidos: number
  omitidos: number
}

type DadosFonteAnaliseIA = {
  linhas: LinhaAnaliseContexto[]
  filtros: Record<string, unknown>
  pergunta?: string
  historico?: { papel: "usuario" | "assistente"; conteudo: string }[]
}

type ResumoLinhaIA = ReturnType<typeof resumoLinha>

export function dividirLinhasEmFatias(
  linhas: LinhaAnaliseContexto[],
  filtros: Record<string, unknown>,
  limite = TAMANHO_FATIA_CHARS
): string[] {
  const resumos = [...linhas].sort(compararRegistros).map(resumoLinha)
  const filtrosCompactos = resumoFiltros(filtros)
  const fatias: string[] = []
  let atual: ResumoLinhaIA[] = []

  for (const resumo of resumos) {
    const candidato = JSON.stringify({ filtros: filtrosCompactos, registros: [...atual, resumo] })
    if (candidato.length > limite && atual.length > 0) {
      fatias.push(JSON.stringify({ filtros: filtrosCompactos, registros: atual }))
      atual = [resumo]
    } else {
      atual.push(resumo)
    }
  }

  if (atual.length > 0) {
    fatias.push(JSON.stringify({ filtros: filtrosCompactos, registros: atual }))
  }

  return fatias
}

function textoLimitado(texto: string, limite: number) {
  if (texto.length <= limite) return texto
  const aviso = `\n\n[resumo truncado para caber no contexto: ${texto.length} caracteres originais]`
  return `${texto.slice(0, Math.max(0, limite - aviso.length))}${aviso}`
}

async function processarAnaliseEmFatias({
  dadosFonte,
  chaveForcada,
  perfil,
}: {
  dadosFonte: DadosFonteAnaliseIA
  chaveForcada: number | null
  perfil: PerfilContextoIA
}): Promise<{
  mensagens: MensagemIA[]
  fatiamento: FatiamentoAnaliseIA
  resultado: ResultadoIA
  memoria: string
}> {
  const fatias = dividirLinhasEmFatias(dadosFonte.linhas, dadosFonte.filtros)
  const resumos: string[] = []
  let resultadoFatia: ResultadoIA = {
    conteudo: "",
    provedor: "nenhum",
    modelo: "",
    nomeChave: "",
    tentativas: 0,
  }

  for (let indice = 0; indice < fatias.length; indice++) {
    resultadoFatia = await chamarIA(
      [
        { role: "system", content: REGRAS_FATIAMENTO },
        {
          role: "user",
          content: `Fatia ${indice + 1} de ${fatias.length} dos registros filtrados.\n${fatias[indice]}\n\nCompacte apenas esta fatia, preservando todos os registros.`,
        },
      ],
      {
        temperatura: 0,
        maxTokens: TOKENS_RESUMO_FATIA,
        reasoningEffort: "none",
        enableThinking: false,
      },
      chaveForcada ?? undefined
    )
    if (resultadoFatia.provedor === "nenhum") break
    resumos.push(`### Fatia ${indice + 1}\n${limparResposta(resultadoFatia.conteudo)}`)
  }

  const fatiamento: FatiamentoAnaliseIA = {
    total: dadosFonte.linhas.length,
    fatias: fatias.length,
    incluidos: resumos.length === fatias.length ? dadosFonte.linhas.length : 0,
    omitidos: resumos.length === fatias.length ? 0 : dadosFonte.linhas.length,
  }

  if (resultadoFatia.provedor === "nenhum" || resumos.length !== fatias.length) {
    return {
      mensagens: [],
      fatiamento,
      resultado: resultadoFatia,
      memoria: "",
    }
  }

  const memoria = textoLimitado(resumos.join("\n\n"), LIMITE_MEMORIA_FATIAS_CHARS)
  const pergunta = dadosFonte.pergunta ?? PERGUNTA_ANALISE_PADRAO
  const mensagens: MensagemIA[] = [
    { role: "system", content: REGRAS_SISTEMA },
    {
      role: "user",
      content: `Os ${dadosFonte.linhas.length} registros filtrados foram processados em ${fatias.length} fatias. Este é o resumo integral mantido em contexto:\n\n${memoria}\n\nFiltros: ${JSON.stringify(
        resumoFiltros(dadosFonte.filtros)
      )}\nCobertura: ${fatiamento.incluidos} de ${fatiamento.total} registros.\n\n${pergunta}`,
    },
    ...montarHistoricoMensagens(dadosFonte.historico ?? [], perfil),
  ]

  return { mensagens, fatiamento, resultado: resultadoFatia, memoria }
}

export async function chamarAnaliseComConsultas({
  mensagens,
  maxConsultas = 2,
  chaveId,
  perfil = "padrao",
  dadosFonte,
}: {
  mensagens: MensagemIA[]
  maxConsultas?: number
  chaveId?: number
  perfil?: PerfilContextoIA
  dadosFonte?: DadosFonteAnaliseIA
}): Promise<{
  conteudo: string
  resultado: ResultadoIA
  consultas: ResultadoConsultaCurada[]
  fatiamento?: FatiamentoAnaliseIA
  memoria?: string
}> {
  const consultas: ResultadoConsultaCurada[] = []
  let decisao: ResultadoIA = {
    conteudo: "",
    provedor: "nenhum",
    modelo: "",
    nomeChave: "",
    tentativas: 0,
  }
  let chaveForcada: number | null = chaveId ?? null
  if (maxConsultas > 0 && !chaveForcada) {
    const chave = await buscarChaveIAAnalise()
    chaveForcada = chave?.id ?? null
  }

  let fatiamento: FatiamentoAnaliseIA | undefined
  let memoria: string | undefined
  let conversa = [...mensagens]
  if (dadosFonte) {
    const tamanhoFonte = JSON.stringify(dadosFonte.linhas.map(resumoLinha)).length
    const enviadoChars = medirMensagensIA(mensagens).enviadoChars
    if (tamanhoFonte > LIMITE_FATIAMENTO_CHARS || enviadoChars > LIMITE_FATIAMENTO_CHARS) {
      const processado = await processarAnaliseEmFatias({ dadosFonte, chaveForcada, perfil })
      fatiamento = processado.fatiamento
      memoria = processado.memoria
      if (processado.resultado.provedor === "nenhum") {
        return { conteudo: "", resultado: processado.resultado, consultas, fatiamento, memoria }
      }
      conversa = processado.mensagens
    }
  }

  let mensagensDecisao: MensagemIA[] = [
    ...conversa,
    { role: "user", content: INSTRUCAO_DECISAO },
  ]

  for (let rodada = 0; rodada < maxConsultas; rodada++) {
    decisao = await chamarIA(
      mensagensDecisao,
      {
        temperatura: 0,
        maxTokens: TOKENS_DECISAO,
        aceitarRaciocinio: true,
        reasoningEffort: "none",
        enableThinking: false,
      },
      chaveForcada ?? undefined
    )
    if (decisao.provedor === "nenhum") break

    const consulta = parseConsultaCurada(decisao.conteudo)
    if (!consulta || consultas.length >= maxConsultas) break

    const dados = await executarConsultaCurada(consulta)
    consultas.push(dados)
    conversa.push({
      role: "assistant",
      content: `CONSULTAR: ${consulta.nome}|${consulta.chave.tipo}|${consulta.chave.id}|${consulta.limite}`,
    })
    conversa.push({
      role: "user",
      content: `Resultado da consulta curada autorizada:\n${jsonLimitado(dados, LIMITES_CONTEXTO_IA[perfil].consulta)}`,
    })
    mensagensDecisao = [...conversa, { role: "user", content: INSTRUCAO_DECISAO }]
  }

  if (decisao.provedor === "nenhum" && maxConsultas > 0) {
    return { conteudo: "", resultado: decisao, consultas }
  }

  const resultado = await chamarIA(
    [
      ...conversa,
      { role: "user", content: "Agora responda à solicitação original em Markdown, sem novas consultas." },
    ],
    {
      temperatura: 0.6,
      topP: 0.95,
      maxTokens: TOKENS_ANALISE,
      reasoningEffort: "medium",
      enableThinking: true,
      forceNonemptyContent: true,
      retryVazioComMaisTokens: true,
    },
    chaveForcada ?? undefined
  )

  return { conteudo: limparResposta(resultado.conteudo), resultado, consultas, fatiamento, memoria }
}

export async function contextoInicial(
  linhas: LinhaAnaliseIA[],
  filtros: Record<string, unknown>,
  perfil: PerfilContextoIA = "padrao"
) {
  const temperaturas = await buscarTemperaturas(linhas)
  const preparadas = prepararLinhas(linhas, temperaturas)
  const { mensagens, compactacao, memoria } = montarMensagensAnaliseComCompactacao({
    linhas: preparadas,
    filtros,
    perfil,
  })
  return { linhas: preparadas, mensagens, compactacao, memoria }
}
