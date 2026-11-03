export type StatusPropostaPadrao = {
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
 * Fallback usado quando a tabela `status` nao tem registros do tipo PROPOSTA.
 * As cores acompanham o padrao do kanban de propostas.
 */
export const STATUS_PROPOSTA_PADRAO: StatusPropostaPadrao[] = [
  {
    id: -1,
    nome: "ENVIADA",
    rotulo: "Enviada",
    tipo: "PROPOSTA",
    cor: "#3b82f6",
    ordem: 1,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -2,
    nome: "ACEITA",
    rotulo: "Aceita",
    tipo: "PROPOSTA",
    cor: "#22c55e",
    ordem: 2,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -3,
    nome: "RECUSADA",
    rotulo: "Recusada",
    tipo: "PROPOSTA",
    cor: "#ef4444",
    ordem: 3,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: -4,
    nome: "REVISAO",
    rotulo: "Em Revisão",
    tipo: "PROPOSTA",
    cor: "#f59e0b",
    ordem: 4,
    ativo: true,
    exibirKanban: true,
  },
]
