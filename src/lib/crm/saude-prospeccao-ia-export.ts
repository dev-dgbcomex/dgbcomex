import { markdownIaParaTexto, normalizarMarkdownIa } from "@/lib/markdown-ia"

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

async function baixarPdf(nome: string, titulo: string, conteudo: string) {
  const { default: jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(titulo, 14, 16)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  let y = 26
  for (const linha of markdownIaParaTexto(conteudo).split("\n")) {
    const partes = linha.trim() ? (doc.splitTextToSize(linha, 182) as string[]) : [""]
    for (const parte of partes) {
      if (y > 280) {
        doc.addPage()
        y = 16
      }
      if (parte) doc.text(parte, 14, y)
      y += parte ? 5 : 3
    }
  }
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
    await baixarPdf(nome, titulo, conteudo)
    return
  }

  baixarTexto(nome, conteudo)
}
