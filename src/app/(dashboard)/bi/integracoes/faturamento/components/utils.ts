import type { GrupoFaturamento, ItemDetalhe } from "./types"

export function formatarMetragem(m?: number): string {
  return (m || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatarPeso(p?: number): string {
  return (p || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatarValor(v?: number): string {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatarData(d?: string): string {
  if (!d) return "—"
  const partes = d.split("-")
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
  return d
}

/** Agrupa os itens da página por `empresa|nr_nota` já com os totais consolidados. */
export function agruparPorNf(itens: ItemDetalhe[]): GrupoFaturamento[] {
  const mapa = new Map<string, GrupoFaturamento>()
  for (const item of itens) {
    const chave_nf = `${item.empresa}|${item.nr_nota}`
    let grupo = mapa.get(chave_nf)
    if (!grupo) {
      grupo = {
        chave_nf,
        empresa: item.empresa,
        nr_nota: item.nr_nota,
        cliente: item.cliente,
        nome_cliente: item.nome_cliente,
        representante: item.representante,
        representante_codigo: item.representante_codigo,
        data_nota: item.data_nota,
        romaneio: item.romaneio,
        vr_nota: item.vr_nota,
        itens: [],
        totalItens: 0,
        totalMetros: 0,
        totalPeso: 0,
        totalVrTotal: 0,
        totalAcresDesc: 0,
        faturamento: 0,
      }
      mapa.set(chave_nf, grupo)
    }
    grupo.itens.push(item)
    grupo.totalItens += 1
    grupo.totalMetros += item.metros || 0
    grupo.totalPeso += item.peso || 0
    grupo.totalVrTotal += item.vr_total || 0
    grupo.totalAcresDesc += item.acres_desc || 0
    grupo.faturamento += (item.vr_total || 0) + (item.acres_desc || 0)
    if (!grupo.representante && item.representante) grupo.representante = item.representante
    if (!grupo.romaneio && item.romaneio) grupo.romaneio = item.romaneio
  }
  return [...mapa.values()]
}

/** Mantém o grupo quando algum dos seus itens casa com a busca livre. */
export function filtrarGruposPorBusca(grupos: GrupoFaturamento[], busca: string): GrupoFaturamento[] {
  const q = busca.trim().toLocaleLowerCase("pt-BR")
  if (!q) return grupos
  return grupos.filter((grupo) => {
    const alvo = [
      grupo.empresa,
      grupo.nr_nota,
      grupo.cliente,
      grupo.nome_cliente,
      grupo.representante,
      grupo.representante_codigo,
      grupo.romaneio,
      ...grupo.itens.map((item) => item.cod_produto),
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
    return alvo.includes(q)
  })
}

export interface SerieComMetragem {
  faturamento: number
  metros: number
}

/** Top N por faturamento, já com a metragem somada (para o segundo eixo do gráfico). */
export function topPorFaturamento<T>(
  entrada: (grupo: GrupoFaturamento) => { chave: string; rotulo: string } | null,
  grupos: GrupoFaturamento[],
  limite = 8
): (SerieComMetragem & { rotulo: string; chave: string })[] {
  const mapa = new Map<string, SerieComMetragem & { rotulo: string; chave: string }>()
  for (const grupo of grupos) {
    const chave = entrada(grupo)
    if (!chave) continue
    const atual = mapa.get(chave.chave) ?? { chave: chave.chave, rotulo: chave.rotulo, faturamento: 0, metros: 0 }
    atual.faturamento += grupo.faturamento
    atual.metros += grupo.totalMetros
    mapa.set(chave.chave, atual)
  }
  return [...mapa.values()].sort((a, b) => b.faturamento - a.faturamento).slice(0, limite)
}

/** Top N por metragem acumulada dos itens de cada nota (gráfico por produto). */
export function topPorProduto(
  grupos: GrupoFaturamento[],
  limite = 8
): (SerieComMetragem & { produto: string })[] {
  const mapa = new Map<string, SerieComMetragem & { produto: string }>()
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      const produto = item.cod_produto || "—"
      const atual = mapa.get(produto) ?? { produto, faturamento: 0, metros: 0 }
      atual.faturamento += (item.vr_total || 0) + (item.acres_desc || 0)
      atual.metros += item.metros || 0
      mapa.set(produto, atual)
    }
  }
  return [...mapa.values()].sort((a, b) => b.faturamento - a.faturamento).slice(0, limite)
}

export interface SerieMes {
  /** Chave cronológica `YYYY-MM` — é por ela que a série é ordenada. */
  chave: string
  /** Rótulo exibido no eixo, `MM/AA`. */
  mes: string
  faturamento: number
  metros: number
}

/**
 * Faturamento e metragem por mês, em ordem cronológica.
 *
 * A ordenação usa a chave `YYYY-MM` e não o rótulo `MM/AA`: comparando o rótulo,
 * "10/25" vem depois de "01/26" e os últimos meses de 2025 aparecem no meio dos de
 * 2026.
 */
export function seriesPorMes(grupos: GrupoFaturamento[]): SerieMes[] {
  const mapa = new Map<string, SerieMes>()
  for (const grupo of grupos) {
    const partes = (grupo.data_nota || "").split("-")
    if (partes.length !== 3) continue
    const chave = `${partes[0]}-${partes[1]}`
    const atual = mapa.get(chave) ?? {
      chave,
      mes: `${partes[1]}/${partes[0].slice(2)}`,
      faturamento: 0,
      metros: 0,
    }
    atual.faturamento += grupo.faturamento
    atual.metros += grupo.totalMetros
    mapa.set(chave, atual)
  }
  return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave))
}

export interface LinhaProduto {
  produto: string
  /** Descrição vinda do catálogo do ERP; vazia quando o produto não está nele. */
  descricao: string
  /** Unidade comercial do produto (MT, KG, ...), quando o ERP informs. */
  unidade: string
  itens: number
  metros: number
  peso: number
  faturamento: number
  /** Média aritmética do `vr_unitario` dos itens do produto. */
  unitarioMedio: number
  /** `faturamento / metros`. Zero quando o produto não tem metragem (venda por peso). */
  medioPorMetro: number
}

/**
 * Uma linha por produto, com os totais do período e a barra proporcional.
 *
 * O faturamento usa a mesma fórmula do card de faturamento — `Σ(vr_total +
 * acres_desc)` — para o número da tabela bater com o do gráfico. `medioPorMetro`
 * fica em 0 quando o produto não tem metragem registrada (por exemplo, quando é
 * vendido por peso), e a tabela exibe "—" nesse caso em vez de dividir por zero.
 */
export function tabelaPorProduto(
  grupos: GrupoFaturamento[],
  limite = 50
): LinhaProduto[] {
  const mapa = new Map<string, LinhaProduto & { somaUnitario: number }>()
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      const produto = item.cod_produto || "—"
      const valor = (item.vr_total || 0) + (item.acres_desc || 0)
      const atual = mapa.get(produto) ?? {
        produto,
        descricao: "",
        unidade: "",
        itens: 0,
        metros: 0,
        peso: 0,
        faturamento: 0,
        somaUnitario: 0,
        unitarioMedio: 0,
        medioPorMetro: 0,
      }
      atual.itens += 1
      atual.metros += item.metros || 0
      atual.peso += item.peso || 0
      atual.faturamento += valor
      atual.somaUnitario += item.vr_unitario || 0
      // Descricao e unidade vêm do catálogo `Produtos` do ERP. A primeira encontrada
      // vence; produto fora do catálogo fica sem elas, e a tabela mostra o código.
      if (!atual.descricao && item.descricao_produto) atual.descricao = item.descricao_produto
      if (!atual.unidade && item.unidade_produto) atual.unidade = item.unidade_produto
      mapa.set(produto, atual)
    }
  }

  return [...mapa.values()]
    .map(({ somaUnitario, ...linha }) => ({
      ...linha,
      unitarioMedio: linha.itens > 0 ? somaUnitario / linha.itens : 0,
      medioPorMetro: linha.metros > 0 ? linha.faturamento / linha.metros : 0,
    }))
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, limite)
}

export const ORIENTACAO_LABEL = { portrait: "Retrato", landscape: "Paisagem" } as const