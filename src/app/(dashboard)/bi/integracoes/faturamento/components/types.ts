export type OrientacaoPdf = 'portrait' | 'landscape'

export interface GrupoFaturamento {
  chave_nf: string
  empresa: string
  nr_nota: string
  cliente: string
  nome_cliente: string
  representante: string
  representante_codigo: string
  data_nota: string
  romaneio?: string
  vr_nota?: number
  itens: any[]
  totalItens: number
  totalMetros: number
  totalPeso: number
  totalVrTotal: number
  totalAcresDesc: number
  faturamento: number
}
