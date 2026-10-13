/**
 * Tipos e formatação compartilhados pelas telas de detalhe de custo administrativo
 * (mensal e anual). As duas leem a mesma fonte — a `sp_PagRel_CCusto_Niveis` — então o
 * formato do lançamento é idêntico; o que muda é a janela (2 meses contra 12).
 */

export interface LancamentoCusto {
  empresa: string
  documento: string
  fornecedor: string
  razao_social: string
  despesa: string
  despesa_2: string
  departamento: string
  departamento_nome: string
  data_baixa: string | null
  data_emissao: string | null
  parcela: string
  referente: string
  valor: number
  /** `YYYY-MM` derivado de `data_baixa`. Vem só na tela anual. */
  mes?: string
}

export interface GrupoCusto {
  lancamentos: number
  valor: number
}

/**
 * A chave que nomeia o grupo varia por tela (`departamento_nome`, `despesa`,
 * `razao_social`, `banco`...), então a chave é aberta. O valor aceita número
 * porque `lancamentos`/`valor` também saem por ela.
 */
export type GrupoPorChave = GrupoCusto & { [chave: string]: string | number }

export interface PeriodoCusto {
  rotulo: string
  inicio: string
  fim: string
  periodo: string
  mes: string
  total: number
  lancamentos: number
  itens: LancamentoCusto[]
  por_departamento: GrupoPorChave[]
  por_despesa: GrupoPorChave[]
  por_fornecedor: GrupoPorChave[]
}

export interface DetalheCustosAdministrativos {
  departamentos: string[]
  mes_atual: PeriodoCusto
  mes_anterior: PeriodoCusto
}

export interface MesCusto {
  mes: string
  rotulo: string
  administrativo: number
  faturamento: number
  /**
   * `administrativo / faturamento` do mesmo mês; `null` quando não houve faturamento.
   *
   * O nome é `porcentagem` e não `percentual` de propósito: o transformer `vite:oxc`
   * que o vitest 4 usa em `.tsx` devolve `undefined` para qualquer propriedade que
   * comece com "percentual" quando ela é lida dentro de um callback. Reproduzido em
   * arquivo mínimo, sem código do app. "porcentagem" passa.
   */
  porcentagem: number | null
  lancamentos: number
}

export interface DetalheCustosAdministrativosAnual {
  departamentos: string[]
  janela: {
    rotulo: string
    inicio: string
    fim: string
    periodo: string
    meses: number
  }
  administrativo: { total: number; media: number; lancamentos: number }
  faturamento: { total: number; media: number; porcentagem: number | null }
  meses: MesCusto[]
  por_departamento: GrupoPorChave[]
  por_despesa: GrupoPorChave[]
  por_fornecedor: GrupoPorChave[]
  itens: LancamentoCusto[]
}

export const FORMATAR = {
  valor: (v: number) =>
    (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  numero: (v: number) => (v || 0).toLocaleString("pt-BR"),
  porcentagem: (v: number) =>
    `${((v || 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
  data: (d?: string | null) => {
    if (!d) return "—"
    const partes = d.split("-")
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : d
  },
}

/** Normaliza para comparar sem acento nem caixa: "Variáveis" == "variaveis". */
export const semAcento = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

export function filtrarLancamentos(
  itens: LancamentoCusto[],
  busca: string,
  mes?: string
): LancamentoCusto[] {
  const termo = semAcento(busca.trim())
  const noMes = (i: LancamentoCusto) => !mes || i.mes === mes
  if (!termo) return itens.filter(noMes)
  return itens.filter(
    (i) =>
      noMes(i) &&
      semAcento(
        [
          i.documento,
          i.fornecedor,
          i.razao_social,
          i.despesa,
          i.despesa_2,
          i.departamento_nome,
          i.referente,
        ].join(" ")
      ).includes(termo)
  )
}
