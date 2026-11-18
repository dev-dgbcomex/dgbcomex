export type VisitaSaudeDetalhe = {
  id: number
  dataVisita: string | null
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
  statusVisitas: string[]
  tiposVisita: string[]
  statusOportunidades: string[]
  totalVisitas: number
  visitasRealizadas: number
  visitasAgendadas: number
  visitasCanceladas: number
  ultimaVisita: string | null
  visitasComRelato: number
  visitasComCheckIn: number
  temContato: boolean
  temProposta: boolean
  temOportunidade: boolean
  valorEstimadoTotal: number
  probabilidadeMedia: number
  statusOportunidadeDominante: string | null
  pedidosVenda: number
  valorPedidosVenda: number
  faturamentos: number
  valorFaturamento: number
  scoreEsforco: number
  scoreEngajamento: number
  diferenca: number
  visitas: VisitaSaudeDetalhe[]
}

export type FiltrosSaude = {
  busca?: string
  segmento?: string
  porte?: string
  responsavel?: string
  statusVisita?: string
  statusOportunidade?: string
  tipoVisita?: string
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

export function calcularScores(entrada: {
  visitasRealizadas: number
  visitasAgendadas: number
  visitasComRelato: number
  visitasComCheckIn: number
  temContato: boolean
  temProposta: boolean
  temOportunidade: boolean
  propostasNegociadas: number
  oportunidadesNegociadas: number
  pedidosVenda: number
  faturamentos: number
}): { scoreEsforco: number; scoreEngajamento: number; diferenca: number } {
  const scoreEsforco =
    (entrada.visitasRealizadas > 0 ? 20 : 0) +
    (entrada.visitasComRelato > 0 ? 20 : 0) +
    (entrada.visitasComCheckIn > 0 ? 15 : 0) +
    (entrada.temContato ? 15 : 0) +
    (entrada.temProposta ? 15 : 0) +
    (entrada.temOportunidade ? 15 : 0)

  const scoreEngajamento = Math.min(
    100,
    (entrada.visitasRealizadas > 0 ? 20 : 0) +
      (entrada.visitasAgendadas > 0 ? 10 : 0) +
      (entrada.propostasNegociadas > 0 ? 20 : 0) +
      (entrada.oportunidadesNegociadas > 0 ? 20 : 0) +
      (entrada.pedidosVenda > 0 ? 15 : 0) +
      (entrada.faturamentos > 0 ? 15 : 0)
  )

  return {
    scoreEsforco,
    scoreEngajamento,
    diferenca: scoreEsforco - scoreEngajamento,
  }
}

export function classificarAlerta(diferenca: number): {
  rotulo: string
  tom: "vermelho" | "amarelo" | "verde"
} {
  if (diferenca >= 20) {
    return { rotulo: "Muito esforço, pouco retorno", tom: "vermelho" }
  }
  if (diferenca <= -20) {
    return { rotulo: "Cliente engajado, pouco esforço", tom: "amarelo" }
  }
  return { rotulo: "Equilibrado", tom: "verde" }
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
    if (filtros.statusVisita && !linha.statusVisitas.includes(filtros.statusVisita)) return false
    if (
      filtros.statusOportunidade &&
      !linha.statusOportunidades.includes(filtros.statusOportunidade)
    ) {
      return false
    }
    if (filtros.tipoVisita && !linha.tiposVisita.includes(filtros.tipoVisita)) return false
    if (filtros.apenasAlertas && Math.abs(linha.diferenca) < 20) return false
    return true
  })
}
