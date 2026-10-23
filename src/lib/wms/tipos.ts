/**
 * Tipos e constantes do WMS no front (dgbcomex).
 *
 * As tabelas vivem no PostgreSQL local e são acessadas via api-microdata; estes tipos
 * descrevem apenas o contrato HTTP usado pelas rotas `/api/wms/*` e pelas telas.
 */

export const WMS_MOVIMENTO_TIPO = ["ENTRADA", "SAIDA", "TRANSFERENCIA", "AJUSTE"] as const
export type WmsMovimentoTipo = (typeof WMS_MOVIMENTO_TIPO)[number]

export const WMS_ENDERECO_TIPO = ["PULMAO", "PICKING", "EXPEDICAO", "AVARIA"] as const
export type WmsEnderecoTipo = (typeof WMS_ENDERECO_TIPO)[number]

export type WmsEndereco = {
  id: number
  codigo: string
  tipo: string
  zona: string | null
  rua: string | null
  predio: string | null
  nivel: string | null
  apto: string | null
  capacidade: string | null
  ativo: boolean
  observacoes: string | null
  createdAt: string
  updatedAt: string
}

export type WmsPecaAlocada = {
  id: number
  nroRolo: string
  nroPeca: string
  enderecoId: number
  enderecoCodigo: string
  metros: string | null
  peso: string | null
}

export type WmsMovimento = {
  id: number
  tipo: string
  estoqueId: number | null
  nroRolo: string | null
  nroPeca: string | null
  origem: string | null
  destino: string | null
  usuarioId: number | null
  metros: string | null
  peso: string | null
  observacao: string | null
  createdAt: string
}

export type PecaEmAberto = {
  empresa: string | null
  nro_rolo: string
  nro_peca: string
  produto: string | null
  categoria: string | null
  cor: string | null
  desenho: string | null
  variante: string | null
  largura: string | null
  metros: number | null
  peso: number | null
  situacao: string | null
  lote_interno: string | null
  data_entrada: string | null
}

export type WmsDashboard = {
  enderecos: number
  enderecosAtivos: number
  pecasAlocadas: number
  metrosAlocados: number
  pecasEmAberto: number
  movimentosHoje: number
}

export type NovaPeca = {
  empresa?: string | null
  nroRolo: string
  nroPeca: string
  produto?: string | null
  categoria?: string | null
  cor?: string | null
  desenho?: string | null
  variante?: string | null
  largura?: string | null
  metros?: number | null
  peso?: number | null
  situacao?: string | null
  loteInterno?: string | null
  dataEntrada?: string | null
}

export type NovoEndereco = {
  codigo: string
  tipo?: string
  zona?: string | null
  rua?: string | null
  predio?: string | null
  nivel?: string | null
  apto?: string | null
  capacidade?: number | null
  observacoes?: string | null
}

export type NovoMovimento = {
  tipo: WmsMovimentoTipo
  estoqueId?: number | null
  enderecoDestinoId?: number | null
  usuarioId?: number | null
  observacao?: string | null
  peca?: NovaPeca
}
