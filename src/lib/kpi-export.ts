import { formatarKpi, IntegracaoKpiMeta } from "@/lib/bi-kpi-metadados"

export interface TabelaKpi {
  colunas: string[]
  linhas: (string | number)[][]
}

// Monta a tabela "Resumo de períodos" (período × campo) a partir do corpo da
// resposta da api-microdata e dos metadados do card. Retorna null quando não há
// dados ou quando o card não tem janelas/campos conhecidos (ex.: rotas sem meta).
export function montarTabelaKpi(
  body: Record<string, unknown> | null | undefined,
  meta?: IntegracaoKpiMeta
): TabelaKpi | null {
  if (!body) return null

  if (meta?.janelas) {
    const entradas = Object.entries(meta.janelas).filter(
      ([nome, janela]) => body[nome] && typeof body[nome] === "object"
    )
    if (entradas.length === 0) return null

    const camposDoPrimeiro = Object.entries(entradas[0][1].campos)
    const colunas = ["Período", ...camposDoPrimeiro.map(([, campo]) => campo.rotulo ?? campo.chave ?? "Valor")]

    const linhas = entradas.map(([nome, janela]) => {
      const valores = body[nome] as Record<string, unknown>
      return [
        janela.rotulo,
        ...camposDoPrimeiro.map(([chave, campo]) => formatarKpi(chave, valores[chave], campo.formato)),
      ]
    })

    return { colunas, linhas }
  }

  if (meta?.campos || meta?.subcampos) {
    const colunas: string[] = ["Período"]
    const celulas: (string | number)[] = ["Período consultado"]
    const chaves = [...new Set([...Object.keys(meta.campos ?? {}), ...Object.keys(meta.subcampos ?? {})])]

    for (const chave of chaves) {
      const campo = meta.campos?.[chave]
      const subs = meta.subcampos?.[chave]
      const objeto = subs && body[chave] && typeof body[chave] === "object" ? (body[chave] as Record<string, unknown>) : null

      if (objeto && subs) {
        for (const [subChave, sub] of Object.entries(subs)) {
          colunas.push(sub.rotulo ?? subChave)
          celulas.push(formatarKpi(subChave, objeto[subChave], sub.formato))
        }
      } else if (campo) {
        colunas.push(campo.rotulo ?? campo.chave ?? chave)
        celulas.push(formatarKpi(chave, body[chave], campo.formato))
      }
    }

    return { colunas, linhas: [celulas] }
  }

  return null
}