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
    `${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m`,
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
  | "pedidos"
  | "prometido"
  | "livre"
  | "cobertura"

export type DirecaoOrdenacao = "asc" | "desc"

const COLUNAS_NUMERICAS: Record<string, (linha: DisponibilidadeLinha) => number> = {
  falta: (linha) => linha.falta_metros,
  estoque: (linha) => linha.estoque_metros,
  caminho: (linha) => linha.caminho_metros,
  pedidos: (linha) => linha.pedidos_venda,
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

/** Um pedido de venda em aberto, como vem de `/estoque-disponibilidade/pedidos`. */
export interface PedidoDisponibilidade {
  empresa: string
  pedido: string
  cliente: string
  cliente_nome: string
  vendedor: string
  vendedor_nome: string
  produto: string
  cor: string
  data_pedido: string | null
  data_entrega: string | null
  qtde_pedido: number
  qtde_romaneada: number
  saldo: number
  valor: number
  status: string
}

export interface DetalhePedidos {
  total: number
  saldo: number
  valor: number
  pedidos: PedidoDisponibilidade[]
}

/** Os pedidos que formam o prometido de uma produto/cor, um por linha: quem prometeu, quantos metros, em quanto e em quantos pedidos. */
export function detalhePedidos(linha: DisponibilidadeLinha): string[] {
  return linha.por_representante.map(
    (rep) =>
      `${rep.vendedor_nome || rep.vendedor} · ${FORMATAR.metros(rep.saldo)} · ${FORMATAR.valor(
        rep.valor
      )} · ${rep.pedidos} ${rep.pedidos === 1 ? "pedido" : "pedidos"}`
  )
}

const COLUNAS_PEDIDOS = [
  "pedido",
  "cliente_nome",
  "vendedor_nome",
  "data_pedido",
  "data_entrega",
  "saldo",
  "valor",
  "status",
] as const

/**
 * Baixa uma lista de linhas como CSV; numeros saem como numero, para somar no Excel.
 *
 * O BOM no começo não é enfeite: sem ele o Excel abre o arquivo como latin-1 e
 * "BELGA"/"PROFECTUS" chegam com acento errado.
 */
function baixar(nome: string, cabecalho: string, linhas: string[]) {
  const conteudo = `﻿${[cabecalho, ...linhas].join("\r\n")}`
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${nome}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** Numa celula de CSV so entra `string` ou numero — array e objeto viram texto. */
const celula = (valor: unknown) => {
  if (valor === null || valor === undefined) return ""
  if (typeof valor === "number") return String(valor).replace(".", ",")
  return `"${String(valor).replace(/"/g, '""')}"`
}

/** CSV dos pedidos de uma cor — o mesmo recorte que o modal mostra. */
export function exportarCsvPedidos(pedidos: PedidoDisponibilidade[], nome: string) {
  baixar(
    nome,
    COLUNAS_PEDIDOS.join(";"),
    pedidos.map((pedido) => COLUNAS_PEDIDOS.map((c) => celula(pedido[c])).join(";"))
  )
}

/**
 * PDF do recorte de uma cor: os pedidos linha a linha, com o total em cima.
 *
 * `jspdf` entra por `import()` dinamico (o mesmo caminho do PDF do faturamento): a
 * biblioteca pesa e so e precisa quando alguem de fato exporta.
 */
export async function exportarPdfPedidos(
  pedidos: PedidoDisponibilidade[],
  titulo: string
): Promise<boolean> {
  if (!pedidos.length) return false
  const { default: jsPDF } = await import("jspdf")
  await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(13)
  doc.text(titulo, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(
    `${pedidos.length} pedidos · ${FORMATAR.metros(
      pedidos.reduce((soma, pedido) => soma + pedido.saldo, 0)
    )} em aberto · ${FORMATAR.valor(pedidos.reduce((soma, pedido) => soma + pedido.valor, 0))}`,
    14,
    22
  )

  // `autoTable` entra na prototipo do jsPDF em tempo de execucao; o tipo so aparece
  // com um cast. E o mesmo caminho de `lib/export-utils.ts`.
  ;(doc as unknown as { autoTable: (opcoes: unknown) => void }).autoTable({
    startY: 28,
    head: [["Pedido", "Cliente", "Representante", "Data", "Entrega", "Saldo (m)", "Valor", "Situação"]],
    body: pedidos.map((pedido) => [
      pedido.pedido,
      pedido.cliente_nome || pedido.cliente,
      pedido.vendedor_nome || pedido.vendedor,
      FORMATAR.data(pedido.data_pedido),
      FORMATAR.data(pedido.data_entrega),
      FORMATAR.metros(pedido.saldo).replace(" m", ""),
      FORMATAR.valor(pedido.valor),
      pedido.status,
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [241, 245, 249] },
  })

  doc.save(`${titulo.replace(/[^\w-]+/g, "_")}.pdf`)
  return true
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
    "cobertura_metros",
    "primeira_chegada",
    "pedidos_venda",
    "pedidos_compra",
    "valor_prometido",
  ] as const

  baixar(
    nome,
    colunas.join(";"),
    linhas.map((linha) =>
      colunas.map((coluna) => celula(linha[coluna as keyof DisponibilidadeLinha])).join(";")
    )
  )
}

/**
 * PDF do relatório: uma linha por produto/cor, com o resumo no cabeçalho.
 *
 * Mesmo corte do CSV — o número do arquivo e o número da tela não podem divergir.
 */
export async function exportarPdfDisponibilidade(
  linhas: DisponibilidadeLinha[],
  titulo: string,
  resumo: DisponibilidadeResumo
): Promise<boolean> {
  if (!linhas.length) return false
  const { default: jsPDF } = await import("jspdf")
  await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(13)
  doc.text(titulo, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(
    `${resumo.produtos_cor} produto/cor · ${resumo.com_falta} com falta · estoque ${FORMATAR.metros(
      resumo.total_estoque
    )} · a caminho ${FORMATAR.metros(resumo.total_caminho)} · prometido ${FORMATAR.metros(
      resumo.total_prometido
    )} · falta ${FORMATAR.metros(resumo.total_falta)}`,
    14,
    22
  )

  const numero = (v: number) => Math.round(v || 0).toLocaleString("pt-BR")
  // Mesmo cast do outro lugar: o plugin so existe em tempo de execucao.
  ;(doc as unknown as { autoTable: (opcoes: unknown) => void }).autoTable({
    startY: 28,
    head: [[
      "Produto",
      "Cor",
      "Estoque (m)",
      "A caminho (m)",
      "Chega",
      "Prometido (m)",
      "Valor prometido",
      "Pedidos",
      "Livre (m)",
      "Depois da compra (m)",
    ]],
    body: linhas.map((linha) => [
      linha.produto_desc || linha.produto,
      linha.cor_desc || linha.cor,
      numero(linha.estoque_metros),
      numero(linha.caminho_metros),
      FORMATAR.data(linha.primeira_chegada),
      numero(linha.prometido_metros),
      FORMATAR.valor(linha.prometido_valor),
      String(linha.pedidos_venda),
      numero(linha.livre_metros),
      numero(linha.cobertura_metros),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [241, 245, 249] },
  })

  doc.save(`${titulo.replace(/[^\w-]+/g, "_")}.pdf`)
  return true
}