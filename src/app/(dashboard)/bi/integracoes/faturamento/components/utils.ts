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

export const ORIENTACAO_LABEL = { portrait: "Retrato", landscape: "Paisagem" } as const