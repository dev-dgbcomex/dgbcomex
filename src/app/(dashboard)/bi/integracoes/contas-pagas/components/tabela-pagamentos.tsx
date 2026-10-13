import {
  FORMATAR,
  type PagamentoConta,
  rotuloDocumento,
} from "@/lib/bi/contas-pagas-detalhe"

const COLUNAS = [
  "data_baixa",
  "empresa",
  "documento",
  "serie",
  "parcela",
  "tipo_fornecedor",
  "fornecedor",
  "razao_social",
  "banco",
  "numero_banco",
  "cheque",
  "valor",
  "juros",
  "desconto",
  "valor_liquido",
] as const

export function exportarCsvContasPagas(itens: PagamentoConta[], mes: string) {
  const linhas = itens.map((item) =>
    COLUNAS.map((coluna) => {
      const valor = item[coluna]
      if (valor === null || valor === undefined) return ""
      // Numérico sem aspas: o Excel soma a coluna direto.
      if (typeof valor === "number") return String(valor).replace(".", ",")
      return `"${String(valor).replace(/"/g, '""')}"`
    }).join(";")
  )

  const blob = new Blob([[COLUNAS.join(";"), ...linhas].join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `contas_pagas_${mes}-01.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** Normaliza para comparar sem acento nem caixa. */
const semAcento = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

export function filtrarPagamentos(
  itens: PagamentoConta[],
  busca: string
): PagamentoConta[] {
  const termo = semAcento(busca.trim())
  if (!termo) return itens
  return itens.filter((i) =>
    semAcento(
      [
        i.documento,
        i.serie,
        i.parcela,
        i.fornecedor,
        i.razao_social,
        i.banco,
        i.cheque,
        rotuloDocumento(i),
      ].join(" ")
    ).includes(termo)
  )
}

/** Parcelas do mesmo documento somadas: mostra a fatura, não o parcelo. */
export function porDocumento(
  itens: PagamentoConta[]
): { documento: string; razao_social: string; parcelas: number; valor: number }[] {
  const mapa = new Map<
    string,
    { documento: string; razao_social: string; parcelas: number; valor: number }
  >()
  for (const item of itens) {
    const chave = `${item.empresa}|${item.documento}|${item.serie}`
    const atual = mapa.get(chave) ?? {
      documento: rotuloDocumento(item),
      razao_social: item.razao_social,
      parcelas: 0,
      valor: 0,
    }
    atual.parcelas += 1
    atual.valor += item.valor
    mapa.set(chave, atual)
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor)
}

interface TabelaPagamentosProps {
  itens: PagamentoConta[]
  busca: string
}

/** A lista linha a linha: uma linha por baixa de conta a pagar. */
export function TabelaPagamentos({ itens, busca }: TabelaPagamentosProps) {
  const visiveis = filtrarPagamentos(itens, busca)
  const soma = visiveis.reduce((s, i) => s + i.valor, 0)

  return (
    <section
      aria-label="Pagamentos"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pagamentos</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {FORMATAR.numero(visiveis.length)} de {FORMATAR.numero(itens.length)} baixas
          {visiveis.length !== itens.length && (
            <span className="ml-1">— somando {FORMATAR.valor(soma)}</span>
          )}
        </p>
      </div>

      <div className="max-h-[34rem] overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/50">
            <tr>
              {["Baixa", "Documento", "Fornecedor", "Banco"].map((titulo) => (
                <th
                  key={titulo}
                  className="px-3 py-2 text-left text-xs font-medium tracking-wider text-slate-500 uppercase"
                >
                  {titulo}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium tracking-wider text-slate-500 uppercase">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visiveis.map((item, indice) => (
              <tr key={`${item.documento}-${item.parcela}-${indice}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {FORMATAR.data(item.data_baixa)}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">
                  {rotuloDocumento(item)}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="block max-w-[240px] truncate text-slate-900 dark:text-slate-100">
                    {item.razao_social || "—"}
                  </span>
                  {item.fornecedor && (
                    <span className="text-[10px] text-slate-400">{item.fornecedor}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="block max-w-[160px] truncate text-slate-700 dark:text-slate-300">
                    {item.banco || "—"}
                  </span>
                  {item.cheque && (
                    <span className="text-[10px] text-slate-400">{item.cheque}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                  {FORMATAR.valor(item.valor)}
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">
                  {busca ? "Nenhum pagamento encontrado." : "Nenhuma baixa neste mês."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visiveis.length > 0 && visiveis.length !== itens.length && (
        <div className="border-t border-slate-200 px-4 py-2 text-right text-xs dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Total do filtro: </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {FORMATAR.valor(soma)}
          </span>
        </div>
      )}
    </section>
  )
}
