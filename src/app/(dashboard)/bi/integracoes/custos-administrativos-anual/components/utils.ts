import {
  FORMATAR,
  filtrarLancamentos,
  type DetalheCustosAdministrativosAnual,
  type LancamentoCusto,
  type MesCusto,
} from "@/lib/bi/custo-detalhe"

/** `YYYY-MM` -> `YYYY-MM-DD` no primeiro dia, que é o formato de arquivo. */
const mesArquivo = (mes: string) => `${mes}-01`

export function exportarCsvAnual(
  itens: LancamentoCusto[],
  rotulo: string,
  mes: MesCusto | null
) {
  const colunas = [
    "mes",
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

  const linhas = itens.map((item) =>
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
  link.download = mes
    ? `custos_administrativos_${mesArquivo(mes.mes)}.csv`
    : `custos_administrativos_12m_${rotulo.replace(/[^\w]+/g, "_")}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** Meses ordenados por custo: é a ordem em que dá para achar o que puxou a média. */
export function mesesPorCusto(meses: MesCusto[]): MesCusto[] {
  return [...meses].sort((a, b) => b.administrativo - a.administrativo)
}

/** Quanto do total de 12 meses o mês sozinho representa. */
export function participacaoNoTotal(detalhe: DetalheCustosAdministrativosAnual, mes: MesCusto) {
  const total = detalhe.administrativo.total
  return total > 0 ? mes.administrativo / total : 0
}

/** Itens visíveis na lista com o filtro de mês e a busca livre aplicados. */
export function itensFiltrados(
  detalhe: DetalheCustosAdministrativosAnual,
  busca: string,
  mes: string
): LancamentoCusto[] {
  return filtrarLancamentos(detalhe.itens, busca, mes || undefined)
}

/** Total do recorte selecionado (dois meses em diante), para o rodapé da lista. */
export function totalDoRecorte(itens: LancamentoCusto[]) {
  return {
    valor: itens.reduce((soma, i) => soma + i.valor, 0),
    lancamentos: itens.length,
    rotulo: FORMATAR.valor(itens.reduce((soma, i) => soma + i.valor, 0)),
  }
}
