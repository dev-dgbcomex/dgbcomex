/**
 * Tipos e constantes do WMS no front (dgbcomex).
 *
 * As tabelas de separação vivem no PostgreSQL local e são acessadas via api-microdata;
 * estes tipos descrevem apenas o contrato HTTP usado pelas rotas `/api/wms/*` e telas.
 */

export const WMS_SEPARACAO_STATUS = [
  "LIBERADO",
  "EM_SEPARACAO",
  "SEPARADO",
  "CANCELADO",
] as const
export type WmsSeparacaoStatus = (typeof WMS_SEPARACAO_STATUS)[number]

export const WMS_PEDIDO_STATUS = [
  "SEM_SEPARACAO",
  "LIBERADO",
  "EM_SEPARACAO",
  "SEPARADO",
  "CANCELADO",
] as const
export type WmsPedidoStatus = (typeof WMS_PEDIDO_STATUS)[number]

export type WmsDashboard = {
  pedidosLiberados: number
  separacoesLiberadas: number
  separacoesEmAndamento: number
  separacoesConcluidas: number
  pecasReservadas: number
  metrosReservados: number
  pecasEmAberto: number
  gavetas: number
}

export type WmsGaveta = {
  codigo: string
  descricao: string | null
  grupoGaveta: string | null
  zona: string | null
  setor: string | null
  fazSugestao: string | null
  estoquePlano: string | null
  confirmarTransferencia: string | null
  pecas: number
  metros: number
}

export type WmsPedido = {
  empresa: string
  pedido: string
  clienteCodigo: string | null
  clienteNome: string | null
  dataPedido: string | null
  dataEntrega: string | null
  status: string
  totalItens: number
  saldoMetros: number
  separacaoId: number | null
  separacaoStatus: WmsPedidoStatus
}

export type WmsItemPedido = {
  item: number
  produto: string | null
  produtoDesc: string | null
  situacao: string | null
  situacaoDesc: string | null
  cor: string | null
  corDesc: string | null
  desenho: string | null
  desenhoDesc: string | null
  variante: string | null
  varianteDesc: string | null
  categoria: string | null
  categoriaDesc: string | null
  largura: string | null
  qtde: number
  qtdeRomaneio: number
  qtdeAcerto: number
  saldo: number
  unid: string | null
  reservadoMetros: number
  pecasReservadas: number
}

export type WmsPedidoDetalhe = WmsPedido & {
  statusPed: string | null
  itens: WmsItemPedido[]
}

export type WmsSeparacao = {
  id: number
  empresa: string
  pedido: string
  status: WmsSeparacaoStatus
  clienteCodigo: string | null
  clienteNome: string | null
  dataPedido: string | null
  dataEntrega: string | null
  observacao: string | null
  motivoCancelamento: string | null
  criadoPor: number | null
  iniciadoPor: number | null
  concluidoPor: number | null
  canceladoPor: number | null
  criadoEm: string | null
  iniciadoEm: string | null
  concluidoEm: string | null
  canceladoEm: string | null
  atualizadoEm: string | null
  totalPecas: number
  totalMetros: number
  itensSeparados: number
  saldoMetros: number
}

export type WmsPecaSeparacao = {
  id: number
  item: number
  empresa: string
  nroRolo: string
  nroPeca: string
  produto: string | null
  produtoDesc: string | null
  situacao: string | null
  cor: string | null
  corDesc: string | null
  desenho: string | null
  variante: string | null
  categoria: string | null
  largura: string | null
  subLote: string | null
  aviso: string | null
  gaveta: string | null
  gavetaDescricao: string | null
  zona: string | null
  metros: number | null
  peso: number | null
  status: string
  adicionadoEm: string | null
  baixadoNoErp: boolean
}

export type WmsSeparacaoDetalhe = WmsSeparacao & {
  itens: WmsItemPedido[]
  pecas: WmsPecaSeparacao[]
}

export type PecaEmAberto = {
  empresa: string | null
  nro_rolo: string
  nro_peca: string
  produto: string | null
  produto_desc: string | null
  situacao: string | null
  situacao_desc: string | null
  cor: string | null
  cor_desc: string | null
  desenho: string | null
  desenho_desc: string | null
  variante: string | null
  variante_desc: string | null
  categoria: string | null
  categoria_desc: string | null
  largura: string | null
  sub_lote: string | null
  aviso: string | null
  gaveta: string | null
  gaveta_descricao: string | null
  zona: string | null
  metros: number | null
  peso: number | null
  data_entrada: string | null
}

export type WmsPaginado<T> = { itens: T[]; total: number }

export type NovaSeparacao = {
  empresa: string
  pedido: string
  observacao?: string | null
  usuarioId?: number | null
}

export type PecaRef = {
  empresa?: string | null
  nroRolo: string
  nroPeca: string
}
