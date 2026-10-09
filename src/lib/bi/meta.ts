export interface CampoKpi {
  rotulo?: string
  descricao?: string
  formato?: FormatoKpi
  chave?: string
}

export interface ResumoKpi {
  rotulo: string
  caminho: string[]
  formato: FormatoKpi
  destaque?: boolean
}

export type FormatoKpi = "brl" | "pct" | "qtde" | "texto"

export interface IntegracaoKpiMeta {
  titulo?: string
  descricao: string
  resumo: ResumoKpi[]
  campos?: Record<string, CampoKpi>
  subcampos?: Record<string, Record<string, CampoKpi>>
  janelas?: Record<string, JanelaKpi>
  regras?: string[]
  exemplos?: { titulo: string; descricao: string }[]
}

export interface JanelaKpi {
  rotulo: string
  descricao: string
  campos: Record<string, CampoKpi>
}

export function metadadosKpi(nome: string): IntegracaoKpiMeta | undefined {
  // no-op para evitar circular; o card usa BI_KPI_METADADOS
  void nome
  return undefined
}