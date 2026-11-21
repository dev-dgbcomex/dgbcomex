export type FormatoExportacaoResumoIA = "md" | "pdf" | "txt"
export type ModoExportacaoResumoIA = "unico" | "separado"

export interface ResumoIAExportacao {
  id: number
  classificacao: string
  resumo: string
  insights: string | null
  sugestoes: string | null
  motivoClassificacao: string | null
  criadoPorNome: string | null
  createdAt: string | Date | null
}

function formatarData(valor: string | Date | null) {
  if (!valor) return "sem data"
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? "sem data" : data.toLocaleString("pt-BR")
}

function normalizarNome(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "resumo"
}

function secoesResumo(resumo: ResumoIAExportacao) {
  return [
    ["Resumo", resumo.resumo],
    ["Insights", resumo.insights],
    ["Sugestões", resumo.sugestoes],
    ["Motivo da classificação", resumo.motivoClassificacao],
  ] as const
}

function textoResumo(resumo: ResumoIAExportacao, indice: number, markdown: boolean) {
  const titulo = `Resumo ${indice} — ${resumo.classificacao} — ${formatarData(resumo.createdAt)}`
  const linhas = markdown ? [`## ${titulo}`, ""] : [titulo, ""]
  for (const [rotulo, valor] of secoesResumo(resumo)) {
    if (!valor) continue
    linhas.push(markdown ? `**${rotulo}:** ${valor}` : `${rotulo}: ${valor}`)
    linhas.push("")
  }
  if (resumo.criadoPorNome) {
    linhas.push(markdown ? `_Gerado por ${resumo.criadoPorNome}_` : `Gerado por ${resumo.criadoPorNome}`)
  }
  return linhas.join("\n").trim()
}

function baixarTexto(nome: string, conteudo: string, formato: "md" | "txt") {
  const mime = formato === "md" ? "text/markdown;charset=utf-8;" : "text/plain;charset=utf-8;"
  const blob = new Blob(["\uFEFF", conteudo], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${nome}.${formato}`
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
  for (const linha of conteudo.split("\n")) {
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

export async function exportarResumosIA(params: {
  resumos: ResumoIAExportacao[]
  nomeEntidade: string
  formato: FormatoExportacaoResumoIA
  modo: ModoExportacaoResumoIA
}) {
  const { resumos, nomeEntidade, formato, modo } = params
  if (!resumos.length) return

  const baseNome = `resumo-ia-${normalizarNome(nomeEntidade)}`
  const titulo = `Resumos IA — ${nomeEntidade}`

  if (modo === "separado") {
    for (const [indice, resumo] of resumos.entries()) {
      const nome = `${baseNome}-${resumo.id || indice + 1}`
      const conteudo = textoResumo(resumo, 1, formato === "md")
      if (formato === "pdf") {
        await baixarPdf(nome, titulo, conteudo)
      } else {
        baixarTexto(nome, conteudo, formato)
      }
    }
    return
  }

  const cabecalho = formato === "md" ? [`# ${titulo}`, ""] : [titulo, ""]
  const corps = resumos.map((resumo, indice) => textoResumo(resumo, indice + 1, formato === "md"))
  const rodape = `\nExportado em ${new Date().toLocaleString("pt-BR")}`
  const conteudo = [...cabecalho, ...corps, rodape].join("\n\n")

  if (formato === "pdf") {
    await baixarPdf(baseNome, titulo, conteudo.replace(/\*\*/g, "").replace(/^#+\s?/gm, ""))
  } else {
    baixarTexto(baseNome, conteudo, formato)
  }
}
