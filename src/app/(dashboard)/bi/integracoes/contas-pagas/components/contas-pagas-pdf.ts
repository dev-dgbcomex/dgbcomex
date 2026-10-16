/**
 * PDF das baixas de contas pagas: um por fornecedor e o consolidado dos selecionados.
 *
 * Mesmo caminho do faturamento (`jspdf` + `autotable` por import dinâmico, para não
 * pesar o bundle de quem só quer ler a tela). O `autoTable` é injetado no prototype
 * do jsPDF em tempo de execução, então o tipo só aparece com o mesmo cast de
 * `faturamento-pdf.ts` e `lib/export-utils.ts`.
 */

import { FORMATAR, rotuloDocumento, type GrupoFornecedor } from "@/lib/bi/contas-pagas-detalhe"

export type OrientacaoPdf = "portrait" | "landscape"

export const ORIENTACAO_LABEL = { portrait: "Retrato", landscape: "Paisagem" } as const

type JsPdf = {
  setFontSize: (n: number) => JsPdf
  setFont: (nome: string, estilo?: string) => JsPdf
  setTextColor: (r: number, g: number, b: number) => JsPdf
  setFillColor: (r: number, g: number, b: number) => JsPdf
  setDrawColor: (r: number, g: number, b: number) => JsPdf
  text: (texto: string, x: number, y: number) => void
  rect: (x: number, y: number, w: number, h: number, estilo: string) => void
  roundedRect: (x: number, y: number, w: number, h: number, r: number, r2: number, e: string) => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  setPage: (n: number) => JsPdf
  addPage: () => void
  getNumberOfPages: () => number
  save: (nome: string) => void
  autoTable?: (opcoes: unknown) => void
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
}

const CINZA = "#64748b"
const AZUL = "#0f766e"

function cabecalho(doc: JsPdf, largura: number, titulo: string, subtitulo: string, y0: number) {
  const margin = 10
  let y = y0
  doc.setFillColor(15, 118, 110)
  doc.roundedRect(margin, y - 4, largura - margin * 2, 12, 2, 2, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13).setFont("helvetica", "bold")
  doc.text(titulo, margin + 3, y + 4)
  doc.setFontSize(8.5).setFont("helvetica", "normal")
  doc.text(subtitulo, margin + 3, y + 9)
  doc.setTextColor(0, 0, 0)
  return y + 14
}

function tabela(
  doc: JsPdf,
  cabecalhoLinhas: string[],
  corpo: (string | number)[][],
  larguras: string[]
) {
  ;(doc as unknown as { autoTable: (o: unknown) => void }).autoTable({
    head: [cabecalhoLinhas],
    body: corpo.map((linha) => linha.map((celula) => String(celula))),
    startY: 34,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak" },
    headStyles: { fillColor: AZUL, textColor: 255, fontSize: 7.5 },
    alternateRowStyles: { fillColor: "#f1f5f9" },
    columnStyles: Object.fromEntries(
      larguras.map((largura, i) => [i, { cellWidth: largura }])
    ),
  })
}

function linhasDoGrupo(grupo: GrupoFornecedor) {
  return grupo.itens.map((item) => [
    item.data_baixa ? FORMATAR.data(item.data_baixa) : "—",
    rotuloDocumento(item),
    item.banco || "—",
    item.departamento || "—",
    FORMATAR.valor(item.valor),
  ])
}

const LARGURAS = ["18mm", "30mm", "34mm", "34mm", "24mm"]

/** Um PDF por fornecedor, no mesmo formato do botão "PDF" do card. */
export async function gerarPdfFornecedor(
  grupo: GrupoFornecedor,
  orientacao: OrientacaoPdf = "portrait"
) {
  const { default: jsPDF } = await import("jspdf")
  await import("jspdf-autotable")
  const doc = new jsPDF(orientacao) as unknown as JsPdf
  const largura = doc.internal.pageSize.getWidth()

  cabecalho(
    doc,
    largura,
    `CONTAS PAGAS — ${grupo.razao_social}`,
    `${grupo.fornecedor} · ${grupo.lancamentos} ${
      grupo.lancamentos === 1 ? "baixa" : "baixas"
    } · total ${FORMATAR.valor(grupo.valor)}`,
    22
  )

  tabela(doc, ["Baixa", "Documento", "Banco", "Departamento", "Valor"], linhasDoGrupo(grupo), LARGURAS)

  const fim = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40
  doc.setFontSize(7.5).setFont("helvetica", "normal").setTextColor(100, 116, 139)
  doc.text(
    `Total pago a ${grupo.razao_social}: ${FORMATAR.valor(grupo.valor)}`,
    10,
    fim + 6
  )

  doc.save(`contas-pagas-${grupo.fornecedor || "fornecedor"}.pdf`)
}

/** Um PDF só com os fornecedores selecionados, uma tabela por fornecedor. */
export async function gerarPdfConsolidado(
  grupos: GrupoFornecedor[],
  periodo: string,
  orientacao: OrientacaoPdf = "portrait"
) {
  const { default: jsPDF } = await import("jspdf")
  await import("jspdf-autotable")
  const doc = new jsPDF(orientacao) as unknown as JsPdf
  const largura = doc.internal.pageSize.getWidth()
  const total = grupos.reduce((soma, grupo) => soma + grupo.valor, 0)

  let y = cabecalho(
    doc,
    largura,
    "CONTAS PAGAS — CONSOLIDADO",
    `${periodo} · ${grupos.length} ${
      grupos.length === 1 ? "fornecedor" : "fornecedores"
    } · total ${FORMATAR.valor(total)}`,
    22
  )

  for (const [indice, grupo] of grupos.entries()) {
    if (indice > 0) doc.addPage()
    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(0, 0, 0)
    doc.text(`${indice + 1}. ${grupo.razao_social}`, 10, y)
    doc.setFontSize(7.5).setFont("helvetica", "normal").setTextColor(100, 116, 139)
    doc.text(
      `${grupo.fornecedor} · ${grupo.lancamentos} baixas · ${FORMATAR.valor(grupo.valor)}`,
      10,
      y + 4
    )
    doc.setTextColor(0, 0, 0)
    y += 10

    tabela(
      doc,
      ["Baixa", "Documento", "Banco", "Departamento", "Valor"],
      linhasDoGrupo(grupo),
      LARGURAS
    )
    y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  }

  doc.save(`contas-pagas-consolidado-${grupos.length}-fornecedores.pdf`)
}
