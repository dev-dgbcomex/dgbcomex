import { classificarSaudeProspeccao } from "./classificacao-saude"

export type AcaoProspeccaoSaudeDetalhe = {
  id: number
  dataAcao: string | null
  hora: string | null
  tipo: string
  status: string
  relato: string | null
  checkInTime: string | null
  checkOutTime: string | null
  empresaNome: string | null
  clienteNome: string | null
  nomeAvulso: string | null
  oportunidadeId: number | null
  oportunidadeTitulo: string | null
  oportunidadeStatus: string | null
  oportunidadeValor: number
  oportunidadeProbabilidade: number
  propostaId: number | null
  propostaTitulo: string | null
  propostaStatus: string | null
  contatoId: number | null
  contatoNome: string | null
  criadoPorNome: string | null
  enderecoTexto: string | null
}

export type ClienteSaude = {
  id: number
  tipo: "cliente" | "pessoa"
  nome: string
  documento: string | null
  segmento: string | null
  porte: string | null
  responsaveis: string[]
  statusAcoes: string[]
  tiposAcao: string[]
  statusOportunidades: string[]
  totalAcoes: number
  acoesRealizadas: number
  acoesAgendadas: number
  acoesCanceladas: number
  ultimaAcao: string | null
  proximaAcao: string | null
  acoesComRelato: number
  acoesComCheckIn: number
  temContato: boolean
  temProposta: boolean
  temOportunidade: boolean
  propostasNegociadas: number
  oportunidadesNegociadas: number
  valorEstimadoTotal: number
  probabilidadeMedia: number
  statusOportunidadeDominante: string | null
  pedidosVenda: number
  valorPedidosVenda: number
  faturamentos: number
  valorFaturamento: number
  scoreEsforco: number
  scoreEngajamento: number
  acoes: AcaoProspeccaoSaudeDetalhe[]
}

export type ChaveItemEngajamento =
  | "ata"
  | "checkIn"
  | "contato"
  | "proposta"
  | "oportunidade"

export type RegistroItemEngajamento = {
  id: number
  rotulo: string
  href: string
}

export type ItemEngajamento = {
  chave: ChaveItemEngajamento
  rotulo: string
  presente: boolean
  quantidade: number
  detalhe: string
  peso: number
  registros: RegistroItemEngajamento[]
}

export type ResumoEngajamento = {
  quantidade: number
  total: number
  porcentagem: number
  rotulo: string
  tom: "vermelho" | "amarelo" | "azul" | "verde"
}

export type FiltrosSaude = {
  busca?: string
  segmento?: string
  porte?: string
  responsavel?: string
  statusAcao?: string
  statusOportunidade?: string
  tipoAcao?: string
  apenasAlertas?: boolean
}

export const STATUS_NEGOCIADOS = [
  "NEGOCIADA",
  "NEGOCIACAO",
  "NEGOCIANDO",
  "ACEITA",
  "ACEITO",
  "FECHADO_GANHO",
  "GANHO",
  "CONVERTIDO",
] as const

const STATUS_LABELS: Record<string, string> = {
  NOVO: "Novo",
  CONTATADO: "Contatado",
  QUALIFICACAO: "Qualificação",
  PROPOSTA: "Proposta",
  NEGOCIADA: "Negociada",
  NEGOCIACAO: "Negociação",
  NEGOCIANDO: "Negociando",
  ACEITA: "Aceita",
  ACEITO: "Aceito",
  FECHADO_GANHO: "Ganho",
  GANHO: "Ganho",
  CONVERTIDO: "Convertido",
  FECHADO_PERDIDO: "Perdido",
  PERDIDO: "Perdido",
  CANCELADO: "Cancelado",
}

export function isStatusNegociado(status: string | null | undefined): boolean {
  if (!status) return false
  const normalizado = status.toUpperCase().trim()
  return (STATUS_NEGOCIADOS as readonly string[]).includes(normalizado)
}

export function labelStatusOportunidade(status: string | null | undefined): string {
  if (!status) return "—"
  return STATUS_LABELS[status.toUpperCase()] ?? status
}

const ITENS_ENGAJAMENTO: {
  chave: ChaveItemEngajamento
  rotulo: string
  peso: number
}[] = [
  { chave: "ata", rotulo: "Ata/Relato", peso: 28 / 3 },
  { chave: "checkIn", rotulo: "Check-in/check-out", peso: 28 / 3 },
  { chave: "contato", rotulo: "Contato", peso: 28 / 3 },
  { chave: "proposta", rotulo: "Proposta", peso: 36 },
  { chave: "oportunidade", rotulo: "Oportunidade", peso: 36 },
]

function pluralizar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

function registrosUnicos<T extends { href: string; rotulo: string }>(registros: T[]): T[] {
  const mapa = new Map<string, T>()
  for (const registro of registros) {
    const chave = `${registro.href}|${registro.rotulo}`
    if (!mapa.has(chave)) mapa.set(chave, registro)
  }
  return Array.from(mapa.values())
}

export function calcularItensEngajamento(cliente: ClienteSaude): ItemEngajamento[] {
  const acoes = cliente.acoes ?? []
  const acoesAta = acoes.filter((acao) => !!acao.relato?.trim())
  const acoesCheck = acoes.filter((acao) => !!acao.checkInTime || !!acao.checkOutTime)
  const acoesContato = acoes.filter((acao) => acao.contatoId != null)
  const acoesProposta = acoes.filter((acao) => acao.propostaId != null)
  const acoesOportunidade = acoes.filter((acao) => acao.oportunidadeId != null)

  const quantidades: Record<ChaveItemEngajamento, number> = {
    ata: acoes.length > 0 ? acoesAta.length : cliente.acoesComRelato,
    checkIn: acoes.length > 0 ? acoesCheck.length : cliente.acoesComCheckIn,
    contato: acoes.length > 0 ? acoesContato.length : cliente.temContato ? 1 : 0,
    proposta: acoes.length > 0 ? acoesProposta.length : cliente.temProposta ? 1 : 0,
    oportunidade:
      acoes.length > 0 ? acoesOportunidade.length : cliente.temOportunidade ? 1 : 0,
  }

  const presentes: Record<ChaveItemEngajamento, boolean> = {
    ata: quantidades.ata > 0,
    checkIn: quantidades.checkIn > 0,
    contato: quantidades.contato > 0 || cliente.temContato,
    proposta: quantidades.proposta > 0 || cliente.temProposta,
    oportunidade: quantidades.oportunidade > 0 || cliente.temOportunidade,
  }

  const detalhes: Record<ChaveItemEngajamento, string> = {
    ata:
      quantidades.ata > 0
        ? pluralizar(quantidades.ata, "ação com relato", "ações com relato")
        : "Sem relato/ata registrado",
    checkIn:
      quantidades.checkIn > 0
        ? pluralizar(quantidades.checkIn, "ação com check-in/check-out", "ações com check-in/check-out")
        : "Sem check-in/check-out registrado",
    contato:
      quantidades.contato > 0
        ? pluralizar(quantidades.contato, "contato vinculado", "contatos vinculados")
        : "Sem contato vinculado",
    proposta:
      quantidades.proposta > 0
        ? pluralizar(quantidades.proposta, "proposta vinculada", "propostas vinculadas")
        : "Sem proposta vinculada",
    oportunidade:
      quantidades.oportunidade > 0
        ? pluralizar(quantidades.oportunidade, "oportunidade vinculada", "oportunidades vinculadas")
        : "Sem oportunidade vinculada",
  }

  const registros: Record<ChaveItemEngajamento, RegistroItemEngajamento[]> = {
    ata: acoesAta.map((acao) => ({
      id: acao.id,
      rotulo: `Ação de Prospecção #${acao.id}`,
      href: `/comercial/crm/acoes-prospeccao/${acao.id}`,
    })),
    checkIn: acoesCheck.map((acao) => ({
      id: acao.id,
      rotulo: `Ação de Prospecção #${acao.id}`,
      href: `/comercial/crm/acoes-prospeccao/${acao.id}`,
    })),
    contato: registrosUnicos(
      acoesContato.map((acao) => ({
        id: acao.contatoId ?? acao.id,
        rotulo: acao.contatoNome ?? `Contato #${acao.contatoId}`,
        href: `/comercial/crm/acoes-prospeccao/${acao.id}`,
      }))
    ),
    proposta: registrosUnicos(
      acoesProposta.map((acao) => ({
        id: acao.propostaId ?? acao.id,
        rotulo: acao.propostaTitulo ?? `Proposta #${acao.propostaId}`,
        href: `/comercial/crm/propostas/${acao.propostaId}`,
      }))
    ),
    oportunidade: registrosUnicos(
      acoesOportunidade.map((acao) => ({
        id: acao.oportunidadeId ?? acao.id,
        rotulo: acao.oportunidadeTitulo ?? `Oportunidade #${acao.oportunidadeId}`,
        href: `/comercial/crm/oportunidades/${acao.oportunidadeId}`,
      }))
    ),
  }

  return ITENS_ENGAJAMENTO.map((item) => ({
    ...item,
    presente: presentes[item.chave],
    quantidade: quantidades[item.chave],
    detalhe: detalhes[item.chave],
    registros: registros[item.chave],
  }))
}

export function calcularResumoEngajamento(itens: ItemEngajamento[]): ResumoEngajamento {
  const total = itens.length
  const quantidade = itens.filter((item) => item.presente).length
  const porcentagem =
    total > 0
      ? Math.round(
          Math.min(100, itens.reduce((soma, item) => soma + (item.presente ? item.peso : 0), 0))
        )
      : 0
  const tom =
    quantidade === 0 ? "vermelho" : quantidade <= 2 ? "amarelo" : quantidade < total ? "azul" : "verde"
  const rotulo =
    quantidade === 0 ? "Sem itens" : quantidade < 3 ? "Inicial" : quantidade < total ? "Em evolução" : "Completo"

  return { quantidade, total, porcentagem, rotulo, tom }
}

export function obterEngajamento(cliente: ClienteSaude): {
  itens: ItemEngajamento[]
  resumo: ResumoEngajamento
} {
  const itens = calcularItensEngajamento(cliente)
  return { itens, resumo: calcularResumoEngajamento(itens) }
}

export type ResumoConversao = {
  percentual: number
  rotulo: string
  tom: "vermelho" | "amarelo" | "azul" | "verde"
}

export function calcularConversao(
  cliente: Pick<ClienteSaude, "totalAcoes" | "pedidosVenda" | "faturamentos">
): ResumoConversao {
  const total = cliente.totalAcoes
  const convertidos = cliente.pedidosVenda + cliente.faturamentos
  const percentual = total > 0 ? Math.min(100, Math.round((convertidos / total) * 100)) : 0
  const tom =
    percentual === 0 ? "vermelho" : percentual < 25 ? "amarelo" : percentual < 50 ? "azul" : "verde"
  const rotulo =
    total === 0
      ? "Sem ações"
      : percentual === 0
        ? "Sem conversão"
        : percentual < 25
          ? "Baixa"
          : percentual < 50
            ? "Parcial"
            : "Alta"

  return { percentual, rotulo, tom }
}

export type TipoScore = "Esforço" | "Engajamento"

export type ComponenteScore = {
  rotulo: string
  descricao: string
  pontos: number
  presente: boolean
}

export type DetalheScore = {
  componentes: ComponenteScore[]
  total: number
}

const PONTOS_ESFORCO_BASE = 12.5
const PONTOS_ESFORCO_DESTAQUE = 25

export function formatarPontos(pontos: number): string {
  return pontos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
}

export function obterDetalheScore(cliente: ClienteSaude, tipo: TipoScore): DetalheScore {
  const componentes: ComponenteScore[] =
    tipo === "Esforço"
      ? [
          {
            rotulo: "Ação realizada",
            descricao: `${cliente.acoesRealizadas} ações realizadas no período`,
            pontos: cliente.acoesRealizadas > 0 ? PONTOS_ESFORCO_BASE : 0,
            presente: cliente.acoesRealizadas > 0,
          },
          {
            rotulo: "Relato/ata",
            descricao: `${cliente.acoesComRelato} ações com relato preenchido`,
            pontos: cliente.acoesComRelato > 0 ? PONTOS_ESFORCO_BASE : 0,
            presente: cliente.acoesComRelato > 0,
          },
          {
            rotulo: "Check-in",
            descricao: `${cliente.acoesComCheckIn} ações com check-in/check-out`,
            pontos: cliente.acoesComCheckIn > 0 ? PONTOS_ESFORCO_BASE : 0,
            presente: cliente.acoesComCheckIn > 0,
          },
          {
            rotulo: "Contato",
            descricao: cliente.temContato ? "Contato vinculado às ações" : "Sem contato vinculado",
            pontos: cliente.temContato ? PONTOS_ESFORCO_BASE : 0,
            presente: cliente.temContato,
          },
          {
            rotulo: "Proposta",
            descricao: cliente.temProposta ? "Proposta vinculada" : "Sem proposta vinculada",
            pontos: cliente.temProposta ? PONTOS_ESFORCO_DESTAQUE : 0,
            presente: cliente.temProposta,
          },
          {
            rotulo: "Oportunidade",
            descricao: cliente.temOportunidade ? "Oportunidade vinculada" : "Sem oportunidade vinculada",
            pontos: cliente.temOportunidade ? PONTOS_ESFORCO_DESTAQUE : 0,
            presente: cliente.temOportunidade,
          },
        ]
      : [
          {
            rotulo: "Ação realizada",
            descricao: `${cliente.acoesRealizadas} ações realizadas no período`,
            pontos: cliente.acoesRealizadas > 0 ? 20 : 0,
            presente: cliente.acoesRealizadas > 0,
          },
          {
            rotulo: "Ação agendada",
            descricao: `${cliente.acoesAgendadas} ações agendadas`,
            pontos: cliente.acoesAgendadas > 0 ? 10 : 0,
            presente: cliente.acoesAgendadas > 0,
          },
          {
            rotulo: "Proposta negociada",
            descricao: `${cliente.propostasNegociadas} propostas negociadas para frente`,
            pontos: cliente.propostasNegociadas > 0 ? 20 : 0,
            presente: cliente.propostasNegociadas > 0,
          },
          {
            rotulo: "Oportunidade negociada",
            descricao: `${cliente.oportunidadesNegociadas} oportunidades negociadas para frente`,
            pontos: cliente.oportunidadesNegociadas > 0 ? 20 : 0,
            presente: cliente.oportunidadesNegociadas > 0,
          },
          {
            rotulo: "Pedido de venda",
            descricao: `${cliente.pedidosVenda} pedidos de venda vinculados`,
            pontos: cliente.pedidosVenda > 0 ? 15 : 0,
            presente: cliente.pedidosVenda > 0,
          },
          {
            rotulo: "Faturamento",
            descricao: `${cliente.faturamentos} faturamentos vinculados`,
            pontos: cliente.faturamentos > 0 ? 15 : 0,
            presente: cliente.faturamentos > 0,
          },
        ]

  return {
    componentes,
    total: Math.min(100, componentes.reduce((soma, componente) => soma + componente.pontos, 0)),
  }
}

export function calcularScores(entrada: {
  acoesRealizadas: number
  acoesAgendadas: number
  acoesComRelato: number
  acoesComCheckIn: number
  temContato: boolean
  temProposta: boolean
  temOportunidade: boolean
  propostasNegociadas: number
  oportunidadesNegociadas: number
  pedidosVenda: number
  faturamentos: number
}): { scoreEsforco: number; scoreEngajamento: number } {
  const scoreEsforco = Math.min(
    100,
    (entrada.acoesRealizadas > 0 ? PONTOS_ESFORCO_BASE : 0) +
      (entrada.acoesComRelato > 0 ? PONTOS_ESFORCO_BASE : 0) +
      (entrada.acoesComCheckIn > 0 ? PONTOS_ESFORCO_BASE : 0) +
      (entrada.temContato ? PONTOS_ESFORCO_BASE : 0) +
      (entrada.temProposta ? PONTOS_ESFORCO_DESTAQUE : 0) +
      (entrada.temOportunidade ? PONTOS_ESFORCO_DESTAQUE : 0)
  )

  const scoreEngajamento = Math.min(
    100,
    (entrada.acoesRealizadas > 0 ? 20 : 0) +
      (entrada.acoesAgendadas > 0 ? 10 : 0) +
      (entrada.propostasNegociadas > 0 ? 20 : 0) +
      (entrada.oportunidadesNegociadas > 0 ? 20 : 0) +
      (entrada.pedidosVenda > 0 ? 15 : 0) +
      (entrada.faturamentos > 0 ? 15 : 0)
  )

  return { scoreEsforco, scoreEngajamento }
}

export function calcularDiferenca(
  linha: Pick<ClienteSaude, "scoreEsforco" | "scoreEngajamento">
): number {
  return linha.scoreEsforco - linha.scoreEngajamento
}

export type { ClassificacaoSaude } from "./classificacao-saude"

export function classificarAlerta(
  linha: Pick<ClienteSaude, "scoreEsforco" | "scoreEngajamento">
) {
  return classificarSaudeProspeccao(linha)
}

function normalizar(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function filtrarClientesSaude(
  linhas: ClienteSaude[],
  filtros: FiltrosSaude
): ClienteSaude[] {
  const busca = normalizar(filtros.busca)
  return linhas.filter((linha) => {
    if (
      busca &&
      !normalizar(linha.nome).includes(busca) &&
      !normalizar(linha.documento).includes(busca) &&
      !normalizar(linha.segmento).includes(busca)
    ) {
      return false
    }
    if (filtros.segmento && linha.segmento !== filtros.segmento) return false
    if (filtros.porte && linha.porte !== filtros.porte) return false
    if (filtros.responsavel && !linha.responsaveis.includes(filtros.responsavel)) return false
    if (filtros.statusAcao && !linha.statusAcoes.includes(filtros.statusAcao)) return false
    if (
      filtros.statusOportunidade &&
      !linha.statusOportunidades.includes(filtros.statusOportunidade)
    ) {
      return false
    }
    if (filtros.tipoAcao && !linha.tiposAcao.includes(filtros.tipoAcao)) return false
    if (filtros.apenasAlertas && classificarAlerta(linha).rotulo === "BEC") return false
    return true
  })
}
