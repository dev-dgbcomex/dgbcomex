/** Documentos do ERP (api-microdata) que o CRM vincula a pessoa/oportunidade. */

export type DocumentoErpItem = {
  item: number
  produto: string | null
  descricao?: string | null
  situacao?: string | null
  cor?: string | null
  desenho?: string | null
  quantidade: number
  metros?: number
  unidade: string | null
  valor_unitario: number
  valor_total: number
  acrescimo_desconto?: number
  status?: string | null
  data_entrega?: string | null
}

export type PedidoErp = {
  empresa: string | null
  pedido: string | null
  cliente_cnpj: string | null
  cliente_nome: string | null
  data_pedido: string | null
  data_entrega: string | null
  status: string | null
  status_pedido: string | null
  condicao_pagamento: string | null
  representante: string | null
  identificador_erp: string | null
  total_itens: number
  quantidade: number
  valor_total: number
  /** No detalhe: a lista de itens do documento. */
  itens?: DocumentoErpItem[]
}

export type FaturamentoErp = {
  empresa: string | null
  pedido: string | null
  nr_nota: string | null
  serie: string | null
  cliente_cnpj: string | null
  cliente_nome: string | null
  data_nota: string | null
  data_emissao: string | null
  pedido_origem: string | null
  status: string | null
  condicao_pagamento: string | null
  valor_nota: number
  total_itens: number
  quantidade: number
  valor_total: number
  /** No detalhe: a lista de itens do documento. */
  itens?: DocumentoErpItem[]
}

export type PaginacaoErp = {
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export type ListaErp<T> = {
  paginacao: PaginacaoErp
  itens: T[]
}

export type TipoVinculoErp = "PEDIDO" | "FATURAMENTO"

/** Status do pedido no ERP: 1 Em análise · 2 Aprovado · 3 Cancelado · 4 Análise comercial. */
export function statusPedidoParaCrm(statusErp: string | null | undefined): string {
  if (statusErp === "3") return "CANCELADO"
  return "ABERTO"
}

export const STATUS_PEDIDO_ERP: Record<string, string> = {
  "1": "Em análise",
  "2": "Aprovado",
  "3": "Cancelado",
  "4": "Análise comercial",
}
