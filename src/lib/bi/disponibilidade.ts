/**
 * Tipos da disponibilidade comercial (`GET /estoque-disponibilidade` da api-microdata).
 *
 * A tela mostra tres numeros por produto x cor — o que tem, o que chega e o que ja foi
 * prometido — e o liquido, que e a unica coisa que o comercial precisa decidir:
 * `livre = estoque - prometido`. Ver o docstring do router para a origem de cada fonte.
 */

export interface DisponibilidadeRepresentante {
  vendedor: string
  vendedor_nome: string
  pedidos: number
  saldo: number
  valor: number
}

export interface DisponibilidadeLinha {
  produto: string
  produto_desc: string
  cor: string
  cor_desc: string
  estoque_metros: number
  estoque_pecas: number
  estoque_rolos: number
  caminho_metros: number
  pedidos_compra: number
  primeira_chegada: string | null
  ultima_chegada: string | null
  prometido_metros: number
  prometido_valor: number
  pedidos_venda: number
  livre_metros: number
  cobertura_metros: number
  falta_metros: number
  por_representante: DisponibilidadeRepresentante[]
}

export interface DisponibilidadeResumo {
  produtos_cor: number
  com_falta: number
  total_estoque: number
  total_caminho: number
  total_prometido: number
  total_falta: number
  valor_prometido: number
}

export interface Disponibilidade {
  resumo: DisponibilidadeResumo
  linhas: DisponibilidadeLinha[]
}

export const FORMATAR = {
  metros: (v: number) =>
    `${Math.round(v || 0).toLocaleString("pt-BR")} m`,
  inteiro: (v: number) => Math.round(v || 0).toLocaleString("pt-BR"),
  valor: (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  data: (d?: string | null) => {
    if (!d) return "—"
    const partes = d.split("-")
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : d
  },
}

/** "000014" + "5 - BLACK" — a chave que o ERP usa para casar estoque, compra e carteira. */
export const chaveLinha = (linha: { produto: string; cor: string; cor_desc?: string }) =>
  `${linha.produto} ${linha.cor}`.trim()

/** Normaliza para comparar sem acento e sem caixa: "veludo confort" acha "VELUDO CONFORT". */
const semAcento = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

const compararTexto = (a: string, b: string) =>
  semAcento(a).localeCompare(semAcento(b), "pt-BR")

export type ChaveOrdenacao =
  | "falta"
  | "produto"
  | "cor"
  | "estoque"
  | "caminho"
  | "prometido"
  | "livre"
  | "cobertura"

export type DirecaoOrdenacao = "asc" | "desc"

const COLUNAS_NUMERICAS: Record<string, (linha: DisponibilidadeLinha) => number> = {
  falta: (linha) => linha.falta_metros,
  estoque: (linha) => linha.estoque_metros,
  caminho: (linha) => linha.caminho_metros,
  prometido: (linha) => linha.prometido_metros,
  livre: (linha) => linha.livre_metros,
  cobertura: (linha) => linha.cobertura_metros,
}

/**
 * Ordena as linhas por produto, cor ou por qualquer métrica.
 *
 * Texto (produto, cor) vai com `localeCompare` em pt-BR e sem acento: "CINZA" antes de
 * "CHOCOLA" e "MARINHO" na posição que o brasileiro lê, não o byte do banco.
 * Métrica ordena por número — e o negativo vem antes do positivo em "asc", que é o
 * que interessa quando a coluna é "Depois da compra".
 */
export function ordenarLinhas(
  linhas: DisponibilidadeLinha[],
  chave: ChaveOrdenacao,
  direcao: DirecaoOrdenacao = "desc"
): DisponibilidadeLinha[] {
  const numero = COLUNAS_NUMERICAS[chave]
  const copia = [...linhas]
  copia.sort((a, b) => {
    const resultado = numero
      ? numero(a) - numero(b)
      : compararTexto(
          chave === "produto" ? `${a.produto_desc || a.produto}` : a.cor_desc || a.cor,
          chave === "produto" ? `${b.produto_desc || b.produto}` : b.cor_desc || b.cor
        )
    return direcao === "asc" ? resultado : -resultado
  })
  return copia
}

export function filtrarLinhas(
  linhas: DisponibilidadeLinha[],
  busca: string
): DisponibilidadeLinha[] {
  const termo = semAcento(busca.trim())
  if (!termo) return linhas
  return linhas.filter((linha) =>
    semAcento(
      [linha.produto, linha.produto_desc, linha.cor, linha.cor_desc].join(" ")
    ).includes(termo)
  )
}

/** CSV do recorte atual; metros como numero, para somar direto no Excel. */
export function exportarCsvDisponibilidade(linhas: DisponibilidadeLinha[], nome: string) {
  const colunas = [
    "produto",
    "produto_desc",
    "cor",
    "cor_desc",
    "estoque_metros",
    "caminho_metros",
    "prometido_metros",
    "livre_metros",
    "falta_metros",
    "primeira_chegada",
    "pedidos_venda",
    "pedidos_compra",
    "valor_prometido",
  ] as const

  const linhasCsv = linhas.map((linha) =>
    colunas
      .map((coluna) => {
        const valor = linha[coluna as keyof DisponibilidadeLinha]
        if (valor === null || valor === undefined) return ""
        if (typeof valor === "number") return String(valor).replace(".", ",")
        return `"${String(valor).replace(/"/g, '""')}"`
      })
      .join(";")
  )

  const blob = new Blob([[colunas.join(";"), ...linhasCsv].join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${nome}.csv`
  link.click()
  URL.revokeObjectURL(url)
}