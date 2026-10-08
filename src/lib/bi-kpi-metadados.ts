// Metadados de exibição dos KPIs da api-microdata (tela /bi/integracoes).
//
// Cada card mostra um resumo sintético (linhas de `resumo`) e um botão "i" que abre um modal
// com a explicação completa (`descricao`), os valores das janelas, regras de negócio e exemplos.
// Também permite ocultar campos do API (não listados aqui) e dar um título próprio ao card.

export type FormatoKpi = "brl" | "pct" | "qtde" | "texto"

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

export interface JanelaKpi {
  rotulo: string
  descricao: string
  campos: Record<string, CampoKpi>
}

export interface IntegracaoKpiMeta {
  titulo?: string
  descricao: string
  resumo: ResumoKpi[]
  janelas?: Record<string, JanelaKpi>
  campos?: Record<string, CampoKpi>
  subcampos?: Record<string, Record<string, CampoKpi>>
  regras?: string[]
  exemplos?: { titulo: string; descricao: string }[]
}

const JANELAS_PADRAO_4 = {
  MesAtual: {
    rotulo: "Mês atual",
    descricao: "Ocorrências de 1º até o último dia do mês selecionado no seletor de data.",
  },
  MesAnterior: {
    rotulo: "Mês anterior",
    descricao: "Ocorrências do mês fechado imediatamente anterior ao selecionado.",
  },
  AnoAtual: {
    rotulo: "Ano atual",
    descricao: "Acumulado de 1º de janeiro até o fim do mês selecionado.",
  },
  AnoAnterior: {
    rotulo: "Ano anterior",
    descricao: "Total do ano inteiro anterior (1º de janeiro a 31 de dezembro).",
  },
} satisfies Record<string, Omit<JanelaKpi, "campos">>

function janelasComparativas(campo: CampoKpi): Record<string, JanelaKpi> {
  return Object.fromEntries(
    Object.entries(JANELAS_PADRAO_4).map(([nome, janela]) => [
      nome,
      { ...janela, campos: { [campo.chave ?? campo.rotulo ?? nome]: campo } },
    ])
  )
}

const Faturamento = {
  rotulo: "Faturamento",
  descricao:
    "Soma de todas as notas emitidas no período (valor total mais acréscimos/abatimentos consumidos).",
  formato: "brl",
} satisfies CampoKpi

const Desconto = {
  rotulo: "Desconto",
  descricao:
    "Valor de abatimentos/descontos concedidos nas notas do período (reduz o faturamento).",
  formato: "brl",
  chave: "Desconto",
} satisfies CampoKpi

const Devolucao = {
  rotulo: "Devoluções",
  descricao: "Valor contábil das notas devolvidas no período, nas naturezas de CFOP de devolução.",
  formato: "brl",
  chave: "Devolucao",
} satisfies CampoKpi

const Estorno = {
  rotulo: "Estornos",
  descricao: "Valor das notas estornadas pelo emissor no período.",
  formato: "brl",
  chave: "Estorno",
} satisfies CampoKpi

const ContasPagas = {
  rotulo: "Contas pagas",
  descricao: "Soma das baixas de contas a pagar efetivamente pagas no período.",
  formato: "brl",
  chave: "ContasPagas",
} satisfies CampoKpi

const resumoComparativo = (campo: string): ResumoKpi[] => [
  { rotulo: "Mês atual", caminho: ["MesAtual", campo], formato: "brl", destaque: true },
  { rotulo: "Mês anterior", caminho: ["MesAnterior", campo], formato: "brl" },
  { rotulo: "Ano atual", caminho: ["AnoAtual", campo], formato: "brl" },
  { rotulo: "Ano anterior", caminho: ["AnoAnterior", campo], formato: "brl" },
]

export const BI_KPI_METADADOS: Record<string, IntegracaoKpiMeta> = {
  "Faturamento do Dia": {
    titulo: "Faturamento",
    descricao:
      "Faturamento do MÊS selecionado — não de um dia. O seletor de data define qual mês; o valor soma as notas de 1º até o último dia daquele mês e compara com o mês anterior e o acumulado do ano (atual e anterior). Para um dia específico, use o card 'Faturamento Dia (diário)'.",
    resumo: [
      {
        rotulo: "Faturamento mês atual",
        caminho: ["MesAtual", "Faturamento"],
        formato: "brl",
        destaque: true,
      },
      { rotulo: "Mês anterior", caminho: ["MesAnterior", "Faturamento"], formato: "brl" },
      { rotulo: "Ano atual", caminho: ["AnoAtual", "Faturamento"], formato: "brl" },
      { rotulo: "Ano anterior", caminho: ["AnoAnterior", "Faturamento"], formato: "brl" },
    ],
    campos: { Faturamento },
    janelas: janelasComparativas(Faturamento),
    regras: [
      "Janela do mês atual: 1º dia até o último dia do mês da data selecionada.",
      "Fórmula: Σ(Vr_Total + Acres_Desc) das notas emitidas — vwFaturamento ao vivo (a mesma fonte do card 'Custos Administrativos Mensal').",
      "Ano atual acumula de 1º de janeiro até o fim do mês selecionado; ano anterior é o ano inteiro.",
    ],
    exemplos: [
      {
        titulo: "Mês inteiro com comparativo",
        descricao:
          "Com o seletor em 06/10/2026, o 'Faturamento mês atual' soma as notas emitidas de 01 a 31/10/2026; 'Mês anterior' compara com setembro; 'Ano atual' é o acumulado de jan/out; 'Ano anterior', o total de todo o ano passado.",
      },
      {
        titulo: "Não confunda com o card diário",
        descricao:
          "O card 'Faturamento Dia (diário)' soma apenas a data escolhida. Este soma o mês todo da data escolhida.",
      },
    ],
  },
  "Faturamento Dia (diário)": {
    descricao:
      "Faturamento de hoje, ontem e anteontem (relativos à data escolhida no seletor — por padrão, hoje). Soma das notas emitidas em cada dia. Para o mês inteiro, use o card 'Faturamento do Dia'.",
    resumo: [
      {
        rotulo: "Hoje",
        caminho: ["Faturamento"],
        formato: "brl",
        destaque: true,
      },
      { rotulo: "Ontem", caminho: ["Ontem"], formato: "brl" },
      { rotulo: "Anteontem", caminho: ["Anteontem"], formato: "brl" },
    ],
    campos: {
      Faturamento: {
        rotulo: "Hoje",
        descricao: "Faturamento do dia selecionado (hoje, quando o seletor está em hoje).",
        formato: "brl",
      },
      Ontem: {
        rotulo: "Ontem",
        descricao: "Faturamento do dia anterior ao selecionado.",
        formato: "brl",
      },
      Anteontem: {
        rotulo: "Anteontem",
        descricao: "Faturamento de dois dias antes do selecionado.",
        formato: "brl",
      },
    },
    regras: [
      "Janela: cada dia é calculado isoladamente (Data_Nota = dia).",
      "Sem movimento no dia, o valor é R$ 0,00 (comportamento do legado, ISNULL(...,0)).",
      "Hoje, Ontem e Anteontem são relativos à data escolhida no seletor de data.",
    ],
    exemplos: [
      {
        titulo: "Um dia específico",
        descricao: "Com o seletor em 06/10/2026, 'Hoje' é 06/10, 'Ontem' é 05/10 e 'Anteontem' é 04/10.",
      },
    ],
  },
  "Contas Pagas": {
    descricao:
      "Quanto a empresa efetivamente pagou a fornecedores. O card compara o mês atual com o mês anterior e traz o acumulado do ano (atual e anterior).",
    resumo: resumoComparativo("ContasPagas"),
    janelas: janelasComparativas(ContasPagas),
    regras: [
      "O valor considera a DATA DA BAIXA (Data_Baixa), não a data de vencimento.",
      "Fonte: uspListagemBaixasPagar do DBProDash (mesma do dashboard legado).",
      "Ano atual acumula de 1º de janeiro até o fim do mês selecionado; ano anterior é o ano inteiro.",
    ],
    exemplos: [
      {
        titulo: "Lendo o card",
        descricao:
          "Se em outubro você pagou R$ 150 mil a fornecedores, o 'Mês atual' mostra R$ 150.000,00; 'Mês anterior' compara com setembro; 'Ano atual' é o total de pagamentos de jan/out; 'Ano anterior', o total de todo o ano passado.",
      },
    ],
  },
  Descontos: {
    descricao:
      "Abatimentos/descontos concedidos nas notas, que reduzem o faturamento. Costumam aparecer como valor negativo ou zero quando não há nota com desconto no período.",
    resumo: resumoComparativo("Desconto"),
    janelas: janelasComparativas(Desconto),
    regras: [
      "Fórmula: Σ(Acres_Desc) das notas do período (vdw uspDesconto).",
      "Desconto concedido reduz o faturamento líquido das vendas.",
    ],
    exemplos: [
      {
        titulo: "Como interpretar",
        descricao:
          "R$ −5.000,00 no 'Mês atual' significa R$ 5 mil em abatimentos dados nas notas do mês selecionado.",
      },
    ],
  },
  Devoluções: {
    descricao:
      "Valor contábil das notas devolvidas no período. O card compara o mês atual com o mês anterior e traz o acumulado do ano.",
    resumo: resumoComparativo("Devolucao"),
    janelas: janelasComparativas(Devolucao),
    regras: [
      "Considera apenas as naturezas de CFOP de devolução: 1.201-1, 1.201-2, 1.202-1 e 2.202-1.",
      "Fórmula: Σ(Vr_Contabil) — mesma uspDevolucao do legado (lista de CFOPs pode crescer).",
    ],
    exemplos: [
      {
        titulo: "Como interpretar",
        descricao:
          "R$ 20.000,00 no 'Mês atual' significa R$ 20 mil em mercadoria devolvida nas notas daquele mês.",
      },
    ],
  },
  Estornos: {
    descricao:
      "Valor das notas fiscais estornadas pelo emissor no período. O card compara o mês atual com o mês anterior e traz o acumulado do ano.",
    resumo: resumoComparativo("Estorno"),
    janelas: janelasComparativas(Estorno),
    regras: [
      "Fórmula: Σ(Vr_Nota) por data de emissão — mesma uspEstorno do legado.",
      "Estornos cancelam vendas já emitidas; por isso aparecem como desconto no resultado.",
    ],
    exemplos: [
      {
        titulo: "Como interpretar",
        descricao: "R$ 8.000,00 no 'Mês atual' significa R$ 8 mil em notas estornadas naquele mês.",
      },
    ],
  },
  "Custos Administrativos Mensal": {
    descricao:
      "Custos administrativos do mês atual (departamentos 1.1.1.1 e 1.1.1.2) comparados com o mês anterior. Enquanto não houver baixa de contas pagas no mês corrente, o custo administrativo aparece R$ 0,00.",
    resumo: [
      {
        rotulo: "Faturamento do mês atual",
        caminho: ["Faturamento"],
        formato: "brl",
        destaque: true,
      },
      {
        rotulo: "Custo administrativo do mês atual",
        caminho: ["Administrativo"],
        formato: "brl",
      },
      {
        rotulo: "% do faturamento",
        caminho: ["Porc_Administrativo"],
        formato: "pct",
      },
      {
        rotulo: "Mês anterior — custo administrativo",
        caminho: ["MesAnterior", "Administrativo"],
        formato: "brl",
      },
    ],
    janelas: {
      MesAtual: {
        rotulo: "Mês atual",
        descricao: "Valores de 1º até hoje no mês atual.",
        campos: {
          Faturamento: {
            rotulo: "Faturamento",
            descricao: "Vendas emitidas no mês atual.",
            formato: "brl",
          },
          Administrativo: {
            rotulo: "Custo administrativo",
            descricao:
              "Despesas administrativas (1.1.1.1 e 1.1.1.2) pagas no mês atual. R$ 0 até haver baixa no mês.",
            formato: "brl",
          },
          Porc_Administrativo: {
            rotulo: "% do faturamento",
            descricao: "Custo administrativo ÷ faturamento do mês atual.",
            formato: "pct",
          },
        },
      },
      MesAnterior: {
        rotulo: "Mês anterior",
        descricao: "Mesmas métricas do mês fechado imediatamente anterior.",
        campos: {
          Faturamento: {
            rotulo: "Faturamento",
            descricao: "Vendas emitidas no mês anterior.",
            formato: "brl",
          },
          Administrativo: {
            rotulo: "Custo administrativo",
            descricao: "Despesas administrativas pagas no mês anterior.",
            formato: "brl",
          },
          Porc_Administrativo: {
            rotulo: "% do faturamento",
            descricao: "Custo administrativo ÷ faturamento do mês anterior.",
            formato: "pct",
          },
        },
      },
    },
    regras: [
      "Custo administrativo = baixas dos departamentos de custo 1.1.1.1 e 1.1.1.2 (rateio ao vivo).",
      "Mês atual fica R$ 0,00 até existirem contas pagas lançadas no mês — é esperado.",
      "Fonte: uspCustoAdmComparativo do DBProDash.",
    ],
    exemplos: [
      {
        titulo: "O que significa cada valor",
        descricao:
          "Faturamento de R$ 373 mil e custo administrativo de R$ 0,00 no mês atual significa que ainda não houve baixa administrativa em outubro; no mês anterior, R$ 170 mil de custo para R$ 1,5 mi de vendas dá 11,3%.",
      },
    ],
  },
  "Custos Administrativos Anual": {
    titulo: "Média – Custo administrativo 12 meses",
    descricao:
      "Média mensal dos últimos 12 meses fechados (do mês anterior ao atual até 12 meses atrás), com o total do período também disponível no modal. Faturamento é a média de vendas; Administrativo, a média das despesas dos centros de custo 1.1.1.1 e 1.1.1.2.",
    resumo: [
      {
        rotulo: "Faturamento (média/mês)",
        caminho: ["Faturamento", "Media"],
        formato: "brl",
        destaque: true,
      },
      {
        rotulo: "Custo administrativo (média/mês)",
        caminho: ["Administrativo", "Media"],
        formato: "brl",
      },
      {
        rotulo: "Total 12 meses — custo administrativo",
        caminho: ["Administrativo", "Total"],
        formato: "brl",
      },
      {
        rotulo: "% do faturamento",
        caminho: ["Porc_Administrativo"],
        formato: "pct",
      },
    ],
    subcampos: {
      Faturamento: {
        Total: {
          rotulo: "Faturamento total (12 meses)",
          descricao: "Σ das vendas dos 12 meses fechados, sem dividir.",
          formato: "brl",
        },
        Media: {
          rotulo: "Faturamento médio mensal",
          descricao: "Total dos 12 meses ÷ 12 — quanto você fatura em média por mês.",
          formato: "brl",
        },
      },
      Administrativo: {
        Total: {
          rotulo: "Custo administrativo total (12 meses)",
          descricao: "Σ das despesas administrativas (1.1.1.1 e 1.1.1.2) dos 12 meses fechados.",
          formato: "brl",
        },
        Media: {
          rotulo: "Custo administrativo médio mensal",
          descricao: "Total dos 12 meses ÷ 12 — a despesa administrativa média de cada mês.",
          formato: "brl",
        },
      },
    },
    campos: {
      Porc_Administrativo: {
        rotulo: "% do faturamento gasta com administração",
        descricao:
          "Custo administrativo ÷ faturamento do mesmo período: quanto de cada R$ 1 vendido é consumido por despesa administrativa.",
        formato: "pct",
      },
    },
    regras: [
      "Janela: 12 meses fechados (mês corrente − 12 até − 1).",
      "Custo administrativo = baixas dos departamentos 1.1.1.1 e 1.1.1.2 (rateio ao vivo).",
      "Média mensal = total do período ÷ 12; a % usa a mesma proporção nos dois cortes.",
    ],
    exemplos: [
      {
        titulo: "Total e média",
        descricao:
          "Se o total dos 12 meses de custo administrativo foi R$ 9,9 mi, a média mensal é R$ 825 mil (total ÷ 12). O card destaca a média e mostra o total em linha própria.",
      },
      {
        titulo: "O que a % significa",
        descricao:
          "Com faturamento médio de R$ 2,29 mi/mês e custo administrativo de R$ 825 mil/mês, a % de 36% significa: de cada R$ 1 vendido, R$ 0,36 é consumido por administração.",
      },
    ],
  },
  "Contas a Receber Programado": {
    descricao:
      "O que ainda falta receber: títulos com vencimento a partir de hoje, com destaque para o que vence neste mês. Inclui os vencidos do mês corrente que ainda não entraram.",
    resumo: [
      {
        rotulo: "Títulos a receber",
        caminho: ["QtdeDoc"],
        formato: "qtde",
        destaque: true,
      },
      { rotulo: "Total a receber", caminho: ["ValorTotal"], formato: "brl" },
      { rotulo: "Títulos a receber no mês", caminho: ["QtdeDocMes"], formato: "qtde" },
      { rotulo: "A receber no mês", caminho: ["ValorTotalMes"], formato: "brl" },
    ],
    campos: {
      QtdeDoc: {
        rotulo: "Títulos a receber",
        descricao: "Quantidade de documentos com vencimento a partir de hoje.",
        formato: "qtde",
      },
      ValorTotal: {
        rotulo: "Total a receber",
        descricao: "Soma dos valores a receber com vencimento a partir de hoje.",
        formato: "brl",
      },
      QtdeDocMes: {
        rotulo: "Títulos a receber no mês",
        descricao: "Quantidade de documentos com vencimento entre 1º e o último dia do mês corrente.",
        formato: "qtde",
      },
      ValorTotalMes: {
        rotulo: "A receber no mês",
        descricao: "Soma dos valores com vencimento entre 1º e o último dia do mês corrente.",
        formato: "brl",
      },
    },
    regras: [
      "Janela: vencimento ≥ 1º dia do mês corrente até 2050-12-31 (rede de segurança).",
      "Inclui títulos vencidos do mês corrente que ainda não foram recebidos.",
      "Janela do mês: vencimento entre 1º e o último dia do mês corrente — é a parte do total que vence neste mês.",
    ],
    exemplos: [
      {
        titulo: "Como ler",
        descricao:
          "876 títulos somando R$ 3,34 mi = ainda há R$ 3,34 mi para entrar no caixa; dos quais 310 títulos (R$ 1,23 mi) vencem neste mês.",
      },
    ],
  },
  "Contas a Pagar Programado": {
    descricao:
      "O que ainda falta pagar: títulos com vencimento a partir de hoje, com destaque para o que vence neste mês. Inclui os vencidos do mês corrente que ainda não foram pagos.",
    resumo: [
      {
        rotulo: "Títulos a pagar",
        caminho: ["QtdeDoc"],
        formato: "qtde",
        destaque: true,
      },
      { rotulo: "Total a pagar", caminho: ["ValorTotal"], formato: "brl" },
      { rotulo: "Títulos a pagar no mês", caminho: ["QtdeDocMes"], formato: "qtde" },
      { rotulo: "A pagar no mês", caminho: ["ValorTotalMes"], formato: "brl" },
    ],
    campos: {
      QtdeDoc: {
        rotulo: "Títulos a pagar",
        descricao: "Quantidade de documentos distintos a pagar com vencimento a partir de hoje.",
        formato: "qtde",
      },
      ValorTotal: {
        rotulo: "Total a pagar",
        descricao: "Soma dos valores a pagar com vencimento a partir de hoje.",
        formato: "brl",
      },
      QtdeDocMes: {
        rotulo: "Títulos a pagar no mês",
        descricao: "Documentos distintos com vencimento entre 1º e o último dia do mês corrente.",
        formato: "qtde",
      },
      ValorTotalMes: {
        rotulo: "A pagar no mês",
        descricao: "Soma dos valores com vencimento entre 1º e o último dia do mês corrente.",
        formato: "brl",
      },
    },
    regras: [
      "Janela: vencimento ≥ 1º dia do mês corrente até 2050-12-31 (rede de segurança).",
      "A contagem considera documentos DISTINTOS (diferença do receber, que conta linhas).",
      "Janela do mês: vencimento entre 1º e o último dia do mês corrente — é a parte do total que vence neste mês.",
    ],
    exemplos: [
      {
        titulo: "Como ler",
        descricao:
          "112 títulos somando R$ 3,86 mi = ainda há R$ 3,86 mi comprometidos para pagar; dos quais 45 títulos (R$ 765 mil) vencem neste mês.",
      },
    ],
  },
}

export function metadadosKpi(nome: string): IntegracaoKpiMeta | undefined {
  return BI_KPI_METADADOS[nome]
}

export function formatarKpi(chave: string, valor: unknown, formato?: FormatoKpi): string {
  if (typeof valor !== "number") return String(valor ?? "")
  if (formato === "pct" || chave.toLowerCase().startsWith("porc")) {
    return `${(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
  }
  if (formato === "qtde" || chave.toLowerCase().startsWith("qtde")) {
    return valor.toLocaleString("pt-BR")
  }
  if (formato === "texto") return String(valor)
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
