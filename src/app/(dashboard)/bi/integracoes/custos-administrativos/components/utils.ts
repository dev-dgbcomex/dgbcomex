import { FORMATAR, type PeriodoCusto } from "./types"

/** `2026-10-09` -> `09/10/2026`, usado no nome do arquivo e nos rótulos. */
export const rotuloData = (iso: string) => FORMATAR.data(iso)

export function exportarCsv(periodo: PeriodoCusto, mes: string) {
  const colunas = [
    "data_baixa",
    "data_emissao",
    "empresa",
    "documento",
    "fornecedor",
    "razao_social",
    "despesa",
    "despesa_2",
    "departamento",
    "departamento_nome",
    "parcela",
    "referente",
    "valor",
  ] as const

  const linhas = periodo.itens.map((item) =>
    colunas
      .map((coluna) => {
        const valor = item[coluna]
        if (valor === null || valor === undefined) return ""
        // O valor já vem como número: mantém a coluna numérica para o Excel somar.
        if (typeof valor === "number") return String(valor).replace(".", ",")
        return `"${String(valor).replace(/"/g, '""')}"`
      })
      .join(";")
  )

  const blob = new Blob([[colunas.join(";"), ...linhas].join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `custos_administrativos_${mes}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** Variação do mês corrente contra o anterior, em reais e em pontos percentuais. */
export function variacao(atual: number, anterior: number) {
  const diferenca = atual - anterior
  const percentual = anterior > 0 ? diferenca / anterior : null
  return { diferenca, percentual, subiu: diferenca > 0 }
}
