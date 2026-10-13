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
}

export interface GrupoCusto {
  lancamentos: number
  valor: number
}

export type GrupoPorChave = GrupoCusto & Record<string, string>

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

export const FORMATAR = {
  valor: (v: number) =>
    (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  numero: (v: number) => (v || 0).toLocaleString("pt-BR"),
  percentual: (v: number) =>
    `${((v || 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
  data: (d?: string | null) => {
    if (!d) return "—"
    const partes = d.split("-")
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : d
  },
}