import type { ItemFaturamento } from "@/lib/bi/faturamento-detalhe-db"

export type OrientacaoPdf = "portrait" | "landscape"

/** Item da listagem como chega do `consultar()` — sem a chave do IndexedDB. */
export type ItemDetalhe = Omit<ItemFaturamento, "chave">

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
  itens: ItemDetalhe[]
  totalItens: number
  totalMetros: number
  totalPeso: number
  totalVrTotal: number
  totalAcresDesc: number
  faturamento: number
}

export interface IntegracaoBi {
  id: number
  nome: string
  baseUrl: string
  tipoAuth: string
}