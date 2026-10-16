/**
 * CSV das baixas de contas pagas. Uma linha por baixa, com o grupo do fornecedor e
 * a classificação de centro de custo ao lado — é o que o financeiro precisa para
 * fechar contra o ERP, e o que a tela de custo administrativo também exporta.
 */

import { FORMATAR, rotuloDocumento, type PagamentoConta } from "@/lib/bi/contas-pagas-detalhe"

/**
 * Coluna do CSV -> valor na baixa. Escrito como mapa de verdade (e não por nome de
 * campo) porque metade dos rótulos é diferente do dado: "Data baixa" x `data_baixa`,
 * "Cód. departamento" x `departamento_codigo`. Um `linha[coluna]` silenciosamente
 * vazio é o tipo de bug que só aparece quando alguém abre a planilha.
 */
const COLUNAS: { titulo: string; valor: (l: PagamentoConta) => string | number | null }[] = [
  { titulo: "Data baixa", valor: (l) => (l.data_baixa ? FORMATAR.data(l.data_baixa) : "") },
  { titulo: "Empresa", valor: (l) => l.empresa },
  { titulo: "Documento", valor: (l) => rotuloDocumento(l) },
  { titulo: "Fornecedor", valor: (l) => l.fornecedor },
  { titulo: "Razão social", valor: (l) => l.razao_social },
  { titulo: "Parcela", valor: (l) => l.parcela },
  { titulo: "Banco", valor: (l) => l.banco },
  { titulo: "Cód. banco", valor: (l) => l.numero_banco },
  { titulo: "Documento do pagamento", valor: (l) => l.cheque },
  { titulo: "Departamento", valor: (l) => l.departamento },
  { titulo: "Cód. departamento", valor: (l) => l.departamento_codigo },
  { titulo: "Despesa", valor: (l) => l.despesa },
  { titulo: "Valor pago", valor: (l) => l.valor },
  { titulo: "Juros", valor: (l) => l.juros },
  { titulo: "Desconto", valor: (l) => l.desconto },
  { titulo: "Valor líquido", valor: (l) => l.valor_liquido },
]

function celula(valor: string | number | null): string {
  if (valor === null || valor === undefined || valor === "") return ""
  // Numérico sem aspas e com vírgula: o Excel soma a coluna direto.
  if (typeof valor === "number") return String(valor).replace(".", ",")
  return `"${String(valor).replace(/"/g, '""')}"`
}

export function exportarCsvContasPagas(itens: PagamentoConta[], periodo: string) {
  const linhas = itens.map((item) =>
    COLUNAS.map((coluna) => celula(coluna.valor(item))).join(";")
  )
  // BOM UTF-8: sem ele o Excel abre em latin-1 e "JOELHA"/"FOLHA" chegam com acento
  // errado — o mesmo problema que o CSV da disponibilidade teve.
  const conteudo =
    "\uFEFF" +
    [COLUNAS.map((coluna) => coluna.titulo).join(";"), ...linhas].join("\r\n")

  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `contas_pagas_${periodo}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
