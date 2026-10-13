/**
 * Tipos do detalhe de Contas Pagas (BI). Reaproveita `FORMATAR` do módulo
 * compartilhado com as telas de custo administrativo.
 */

import { FORMATAR } from "@/lib/bi/custo-detalhe"

export { FORMATAR }

export interface PagamentoConta {
  empresa: string
  documento: string
  serie: string
  fornecedor: string
  razao_social: string
  tipo_fornecedor: string
  parcela: string
  parcial: string
  data_baixa: string | null
  banco: string
  numero_banco: string
  cheque: string
  valor: number
  juros: number
  desconto: number
  valor_liquido: number
}

export interface GrupoPagamento {
  lancamentos: number
  valor: number
}

/** Mesma ideia de `GrupoPorChave` do módulo de custo: a chave do grupo é aberta. */
export type GrupoPorChave = GrupoPagamento & { [chave: string]: string | number }

export interface JanelaContasPagas {
  rotulo: string
  inicio: string
  fim: string
  periodo: string
  total: number
  lancamentos: number
}

export interface MesContasPagas {
  mes: string
  rotulo: string
  total: number
  lancamentos: number
}

export interface DetalheContasPagas {
  referencia: { rotulo: string; inicio: string; fim: string; periodo: string; mes: string }
  mes: JanelaContasPagas & {
    itens: PagamentoConta[]
    por_fornecedor: GrupoPorChave[]
    por_banco: GrupoPorChave[]
    por_empresa: GrupoPorChave[]
  }
  mes_anterior: JanelaContasPagas
  ano_atual: JanelaContasPagas
  ano_anterior: JanelaContasPagas
  meses: MesContasPagas[]
}

/** Documento com série e parcela: `000007424/U 01`. */
export const rotuloDocumento = (p: PagamentoConta) => {
  const base = [p.documento, p.serie].filter(Boolean).join("/")
  return p.parcela ? `${base} ${p.parcela}` : base || "—"
}

/** Juros e desconto juntos, quando existem — o card só soma `valor`. */
export function resumoDespesas(p: PagamentoConta): string | null {
  const partes: string[] = []
  if (p.juros) partes.push(`juros ${FORMATAR.valor(p.juros)}`)
  if (p.desconto) partes.push(`desconto ${FORMATAR.valor(p.desconto)}`)
  return partes.length ? partes.join(" · ") : null
}
