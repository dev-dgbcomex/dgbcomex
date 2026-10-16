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
  /**
   * Despesa e departamento vêm da `sp_PagRel_CCusto_Niveis` (a mesma do custo
   * administrativo). Vazio quando a baixa não tem classificação.
   */
  departamento: string
  departamento_codigo: string
  despesa: string
  despesa_2: string
  /** A baixa foi rateada entre mais de uma linha de classificação. */
  rateio: boolean
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
  /** A faixa que a lista está mostrando — igual ao mês âncora, ou o recorte pedido. */
  periodo: {
    rotulo: string
    inicio: string
    fim: string
    periodo: string
    recorte: boolean
  }
  mes: JanelaContasPagas & {
    itens: PagamentoConta[]
    por_fornecedor: GrupoPorChave[]
    por_banco: GrupoPorChave[]
    por_empresa: GrupoPorChave[]
    por_departamento: GrupoPorChave[]
    por_despesa: GrupoPorChave[]
  }
  mes_anterior: JanelaContasPagas
  ano_atual: JanelaContasPagas
  ano_anterior: JanelaContasPagas
  meses: MesContasPagas[]
}

/** Um fornecedor e as baixas dele: o card que a tela lista, como a nota no faturamento. */
export interface GrupoFornecedor {
  chave: string
  razao_social: string
  fornecedor: string
  valor: number
  lancamentos: number
  itens: PagamentoConta[]
}

/** Agrupa as baixas por fornecedor, do maior para o menor. */
export function agruparPorFornecedor(itens: PagamentoConta[]): GrupoFornecedor[] {
  const mapa = new Map<string, GrupoFornecedor>()
  for (const item of itens) {
    const chave = `${item.tipo_fornecedor}:${item.fornecedor}`
    const grupo = mapa.get(chave) ?? {
      chave,
      razao_social: item.razao_social || "—",
      fornecedor: item.fornecedor,
      valor: 0,
      lancamentos: 0,
      itens: [],
    }
    grupo.valor += item.valor
    grupo.lancamentos += 1
    grupo.itens.push(item)
    mapa.set(chave, grupo)
  }
  return [...mapa.values()].sort(
    (a, b) => b.valor - a.valor || a.razao_social.localeCompare(b.razao_social, "pt-BR")
  )
}

/** Filtros da tela. `busca` é local; o resto também pode ir para a API. */
export interface FiltrosContasPagas {
  dataInicio: string
  dataFim: string
  fornecedor: string
  banco: string
  empresa: string
  departamento: string
}

export const FILTROS_VAZIOS: FiltrosContasPagas = {
  dataInicio: "",
  dataFim: "",
  fornecedor: "",
  banco: "",
  empresa: "",
  departamento: "",
}

/** Compara sem acento nem caixa: `servicos` precisa achar `SERVIÇOS`. */
const contem = (texto: string, busca: string) =>
  semAcento(texto).includes(semAcento(busca))

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/**
 * Filtra as baixas pelos campos da toolbar. A busca é um "talvez" em todos os
 * campos: quem digita `blu` ou `importacao` quer achar sem escolher o filtro.
 */
export function filtrarPorFiltros(
  itens: PagamentoConta[],
  filtros: FiltrosContasPagas,
  busca: string
): PagamentoConta[] {
  const termo = busca.trim()
  return itens.filter((item) => {
    if (filtros.fornecedor && !contem(`${item.razao_social} ${item.fornecedor}`, filtros.fornecedor))
      return false
    if (filtros.banco && !contem(`${item.banco} ${item.numero_banco}`, filtros.banco)) return false
    if (filtros.empresa && !contem(item.empresa, filtros.empresa)) return false
    if (filtros.departamento && !contem(item.departamento, filtros.departamento)) return false
    if (
      termo &&
      !contem(
        [
          item.razao_social,
          item.fornecedor,
          rotuloDocumento(item),
          item.banco,
          item.numero_banco,
          // O documento do pagamento (o D000002234) é como o financeiro procura um
          // pagamento no extrato — sem ele, a busca não acha o que ele realmente tem.
          item.cheque,
          item.empresa,
          item.departamento,
          item.despesa,
        ].join(" "),
        termo
      )
    )
      return false
    return true
  })
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
