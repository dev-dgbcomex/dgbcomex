export type StatusOportunidadePadrao = {
  id: number
  nome: string
  rotulo: string | null
  tipo: string
  cor: string | null
  ordem: number
  ativo: boolean
  exibirKanban: boolean
}

/**
 * Fallback usado quando a tabela `status` nao tem registros do tipo OPORTUNIDADE
 * (ex.: banco ainda nao migrado). As cores acompanham o seed do ERP.
 */
export const STATUS_OPORTUNIDADE_PADRAO: StatusOportunidadePadrao[] = [
  {
    id: -1,
    nome: "NOVO",
    rotulo: "Novo",
    tipo: "OPORTUNIDADE",
    cor: "#3b82f6",
    ordem: 1,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -2,
    nome: "QUALIFICACAO",
    rotulo: "Qualificação",
    tipo: "OPORTUNIDADE",
    cor: "#8b5cf6",
    ordem: 2,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -3,
    nome: "PROPOSTA",
    rotulo: "Proposta",
    tipo: "OPORTUNIDADE",
    cor: "#f59e0b",
    ordem: 3,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -4,
    nome: "NEGOCIACAO",
    rotulo: "Negociação",
    tipo: "OPORTUNIDADE",
    cor: "#f97316",
    ordem: 4,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -5,
    nome: "FECHADO_GANHO",
    rotulo: "Ganho",
    tipo: "OPORTUNIDADE",
    cor: "#22c55e",
    ordem: 5,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -6,
    nome: "FECHADO_PERDIDO",
    rotulo: "Perdido",
    tipo: "OPORTUNIDADE",
    cor: "#ef4444",
    ordem: 6,
    ativo: true,
    exibirKanban: true,
  },
]
