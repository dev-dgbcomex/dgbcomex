import { normalizarMarkdownIa } from "@/lib/markdown-ia"
import {
  blocosMarkdownIaPdf,
  type BlocoMarkdownIaPdf,
  type ItemListaMarkdownIaPdf,
} from "@/lib/markdown-ia-pdf"

type AutoTablePdf = typeof import("jspdf-autotable").default
type CorRgb = [number, number, number]

interface EstadoPdf {
  y: number
}

interface DocPdf {
  addPage(): unknown
  setFillColor(r: number, g: number, b: number): unknown
  setDrawColor(r: number, g: number, b: number): unknown
  setTextColor(r: number, g: number, b: number): unknown
  setFont(familia: string, estilo?: string): unknown
  setFontSize(tamanho: number): unknown
  text(
    texto: string | string[],
    x: number,
    y: number,
    opcoes?: { align?: "left" | "center" | "right" | "justify" }
  ): unknown
  splitTextToSize(texto: string | string[], largura: number): string[]
  rect(x: number, y: number, largura: number, altura: number, estilo: "F" | "S"): unknown
  line(x1: number, y1: number, x2: number, y2: number): unknown
  getNumberOfPages(): number
  setPage(pagina: number): unknown
  save(nome: string): unknown
}

const CORES_PDF: Record<"fundo" | "branco" | "roxo" | "roxoEscuro" | "texto" | "suave" | "linha" | "citacao", CorRgb> = {
  fundo: [40, 42, 54],
  branco: [248, 248, 242],
  roxo: [189, 147, 249],
  roxoEscuro: [96, 62, 150],
  texto: [45, 41, 55],
  suave: [245, 241, 255],
  linha: [203, 190, 225],
  citacao: [98, 114, 164],
}
const MARGEM_PDF = 14
const LARGURA_PDF = 182
const LIMITE_PDF = 268

export type FormatoExportacaoAnaliseIA = "md" | "pdf"
export type EscopoExportacaoAnaliseIA = "conversa" | "interacao"

export interface AnaliseIAExportacao {
  titulo: string
  analise: string
  resumo?: string | null
  criadoPorNome?: string | null
  createdAt?: string | null
}

export interface MensagemIAExportacao {
  papel: string
  conteudo: string
  createdAt?: string | null
}

function formatarData(valor: string | null | undefined) {
  if (!valor) return "sem data"
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? "sem data" : data.toLocaleString("pt-BR")
}

function normalizarNome(valor: string) {
  return (
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "analise"
  )
}

function rotuloMensagem(papel: string) {
  return papel === "usuario" ? "Pergunta" : "Resposta"
}

function blocoMensagem(mensagem: MensagemIAExportacao, indice: number) {
  return `### ${indice + 1}. ${rotuloMensagem(mensagem.papel)} — ${formatarData(mensagem.createdAt)}\n\n${normalizarMarkdownIa(mensagem.conteudo)}`
}

export function numeroDaInteracao(mensagens: MensagemIAExportacao[], indice: number) {
  return Math.max(
    1,
    mensagens.slice(0, indice + 1).filter((mensagem) => mensagem.papel !== "usuario").length
  )
}

function montarConversa(analise: AnaliseIAExportacao, mensagens: MensagemIAExportacao[]) {
  const metadados = [
    `_Análise gerada em ${formatarData(analise.createdAt)}_`,
    analise.criadoPorNome ? `_Gerada por ${analise.criadoPorNome}_` : null,
    analise.resumo ? `**Resumo:** ${analise.resumo}` : null,
  ].filter(Boolean)

  return [
    `# ${analise.titulo}`,
    "",
    ...metadados,
    "",
    "## Análise",
    "",
    normalizarMarkdownIa(analise.analise),
    "",
    "## Conversa",
    "",
    ...mensagens.map(blocoMensagem),
    "",
    `Exportado em ${new Date().toLocaleString("pt-BR")}`,
  ]
    .filter((parte) => parte !== null && parte !== "")
    .join("\n\n")
}

function montarInteracao(
  analise: AnaliseIAExportacao,
  mensagens: MensagemIAExportacao[],
  indice: number
) {
  const mensagem = mensagens[indice]
  if (!mensagem) return ""

  const numero = numeroDaInteracao(mensagens, indice)
  const pergunta =
    mensagem.papel === "usuario"
      ? undefined
      : [...mensagens.slice(0, indice)].reverse().find((item) => item.papel === "usuario")

  return [
    `# Interação ${numero} — ${analise.titulo}`,
    "",
    `_Análise: ${analise.titulo}_`,
    "",
    pergunta ? `## Pergunta\n\n${normalizarMarkdownIa(pergunta.conteudo)}` : null,
    "## Resposta",
    "",
    normalizarMarkdownIa(mensagem.conteudo),
    "",
    `Exportado em ${new Date().toLocaleString("pt-BR")}`,
  ]
    .filter((parte) => parte !== null && parte !== "")
    .join("\n\n")
}

function baixarTexto(nome: string, conteudo: string) {
  const blob = new Blob(["\uFEFF", conteudo], { type: "text/markdown;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${nome}.md`
  link.click()
  URL.revokeObjectURL(url)
}

function garantirEspaco(doc: DocPdf, estado: EstadoPdf, altura: number) {
  if (estado.y + altura > LIMITE_PDF) {
    doc.addPage()
    estado.y = 32
  }
}

function desenharCabecalho(doc: DocPdf, titulo: string, subtitulo: string) {
  doc.setFillColor(...CORES_PDF.fundo)
  doc.rect(0, 0, 210, 26, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(...CORES_PDF.branco)
  const titulos = doc.splitTextToSize(titulo, LARGURA_PDF).slice(0, 2)
  doc.text(titulos, MARGEM_PDF, 11)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...CORES_PDF.roxo)
  doc.text(subtitulo, MARGEM_PDF, 21)
}

function desenharRodape(doc: DocPdf) {
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    doc.setDrawColor(...CORES_PDF.linha)
    doc.line(MARGEM_PDF, 285, 210 - MARGEM_PDF, 285)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...CORES_PDF.citacao)
    doc.text("Saúde da Prospecção — análise de IA", MARGEM_PDF, 291)
    doc.text(`Página ${pagina} de ${total}`, 210 - MARGEM_PDF, 291, { align: "right" })
  }
}

function escreverTexto(
  doc: DocPdf,
  estado: EstadoPdf,
  texto: string,
  opcoes: {
    x?: number
    largura?: number
    altura?: number
    espacoApos?: number
    cor?: CorRgb
    fonte?: string
    estilo?: string
    tamanho?: number
  }
) {
  const altura = opcoes.altura ?? 5
  const x = opcoes.x ?? MARGEM_PDF
  doc.setFont(opcoes.fonte ?? "helvetica", opcoes.estilo ?? "normal")
  doc.setFontSize(opcoes.tamanho ?? 10)
  doc.setTextColor(...(opcoes.cor ?? CORES_PDF.texto))
  for (const linha of doc.splitTextToSize(texto, opcoes.largura ?? LARGURA_PDF)) {
    garantirEspaco(doc, estado, altura)
    doc.text(linha, x, estado.y)
    estado.y += altura
  }
  estado.y += opcoes.espacoApos ?? 2
}

function renderizarLista(
  doc: DocPdf,
  estado: EstadoPdf,
  itens: ItemListaMarkdownIaPdf[]
) {
  for (const item of itens) {
    const prefixo =
      item.tipo === "tarefaConcluida"
        ? "[x]"
        : item.tipo === "tarefa"
          ? "[ ]"
          : item.tipo === "numero"
            ? "•"
            : "•"
    const x = MARGEM_PDF + Math.min(item.nivel, 4) * 4
    escreverTexto(doc, estado, `${prefixo} ${item.texto}`, {
      x,
      largura: LARGURA_PDF - (x - MARGEM_PDF),
      altura: 5,
      espacoApos: 0.5,
    })
  }
  estado.y += 3
}

function renderizarBloco(
  doc: DocPdf,
  bloco: BlocoMarkdownIaPdf,
  estado: EstadoPdf,
  autoTable: AutoTablePdf
) {
  if (bloco.tipo === "titulo") {
    const tamanho = bloco.nivel <= 1 ? 15 : bloco.nivel === 2 ? 13 : 11
    garantirEspaco(doc, estado, tamanho + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(tamanho)
    doc.setTextColor(...CORES_PDF.roxoEscuro)
    doc.text(bloco.texto, MARGEM_PDF, estado.y)
    estado.y += 5
    doc.setDrawColor(...CORES_PDF.linha)
    doc.line(MARGEM_PDF, estado.y, 210 - MARGEM_PDF, estado.y)
    estado.y += 7
    return
  }

  if (bloco.tipo === "tabela") {
    garantirEspaco(doc, estado, 24)
    autoTable(doc, {
      head: [bloco.cabecalhos],
      body: bloco.linhas,
      startY: estado.y,
      margin: { left: MARGEM_PDF, right: MARGEM_PDF, top: 0, bottom: 20 },
      theme: "grid",
      tableWidth: "auto",
      tableLineWidth: 0.2,
      tableLineColor: [203, 190, 225],
      styles: {
        font: "helvetica",
        fontSize: 9,
        textColor: [45, 41, 55],
        lineColor: [203, 190, 225],
        lineWidth: 0.2,
        cellPadding: 2.2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [96, 62, 150],
        textColor: [248, 248, 242],
        fontStyle: "bold",
      },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 241, 255] },
    })
    const comTabela = doc as DocPdf & { lastAutoTable?: { finalY: number } }
    estado.y = (comTabela.lastAutoTable?.finalY ?? estado.y) + 6
    return
  }

  if (bloco.tipo === "lista") {
    renderizarLista(doc, estado, bloco.itens)
    return
  }

  if (bloco.tipo === "citacao") {
    const linhas = doc.splitTextToSize(bloco.texto, LARGURA_PDF - 8)
    const altura = linhas.length * 5 + 5
    garantirEspaco(doc, estado, altura)
    doc.setFillColor(...CORES_PDF.suave)
    doc.rect(MARGEM_PDF, estado.y - 4, LARGURA_PDF, altura, "F")
    doc.setDrawColor(...CORES_PDF.roxo)
    doc.line(MARGEM_PDF, estado.y - 4, MARGEM_PDF, estado.y + altura - 9)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(10)
    doc.setTextColor(...CORES_PDF.citacao)
    linhas.forEach((linha, indice) => {
      doc.text(linha, MARGEM_PDF + 4, estado.y + indice * 5)
    })
    estado.y += altura
    return
  }

  if (bloco.tipo === "codigo") {
    doc.setFillColor(248, 248, 242)
    for (const linhaOriginal of bloco.linhas) {
      for (const linha of doc.splitTextToSize(linhaOriginal, LARGURA_PDF - 6)) {
        garantirEspaco(doc, estado, 5)
        doc.rect(MARGEM_PDF, estado.y - 3.5, LARGURA_PDF, 5, "F")
        doc.setFont("courier", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...CORES_PDF.texto)
        doc.text(linha, MARGEM_PDF + 3, estado.y)
        estado.y += 5
      }
    }
    estado.y += 3
    return
  }

  if (bloco.tipo === "separador") {
    garantirEspaco(doc, estado, 6)
    doc.setDrawColor(...CORES_PDF.linha)
    doc.line(MARGEM_PDF, estado.y, 210 - MARGEM_PDF, estado.y)
    estado.y += 6
    return
  }

  escreverTexto(doc, estado, bloco.texto, { altura: 5, espacoApos: 3 })
}

async function baixarPdf(nome: string, titulo: string, subtitulo: string, conteudo: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  desenharCabecalho(doc, titulo, subtitulo)
  const estado: EstadoPdf = { y: 32 }
  for (const bloco of blocosMarkdownIaPdf(conteudo)) {
    renderizarBloco(doc, bloco, estado, autoTable)
  }
  desenharRodape(doc)
  doc.save(`${nome}.pdf`)
}

export async function exportarAnaliseIA(params: {
  analise: AnaliseIAExportacao
  mensagens: MensagemIAExportacao[]
  formato: FormatoExportacaoAnaliseIA
  escopo: EscopoExportacaoAnaliseIA
  indice?: number
}) {
  const { analise, mensagens, formato, escopo, indice } = params
  const conversa = escopo === "conversa"
  const mensagem = conversa ? null : mensagens[indice ?? -1]
  if (!conversa && !mensagem) return

  const numero = conversa ? 0 : numeroDaInteracao(mensagens, indice!)
  const nomeBase = `saude-prospeccao-ia-${normalizarNome(analise.titulo)}`
  const nome = `${nomeBase}-${conversa ? "conversa" : `interacao-${numero}`}`
  const titulo = conversa ? `Conversa — ${analise.titulo}` : `Interação ${numero} — ${analise.titulo}`
  const conteudo = conversa
    ? montarConversa(analise, mensagens)
    : montarInteracao(analise, mensagens, indice!)

  if (formato === "pdf") {
    const subtitulo = `Saúde da Prospecção • ${analise.criadoPorNome ? `${analise.criadoPorNome} • ` : ""}${formatarData(analise.createdAt)}`
    await baixarPdf(nome, titulo, subtitulo, conteudo)
    return
  }

  baixarTexto(nome, conteudo)
}
