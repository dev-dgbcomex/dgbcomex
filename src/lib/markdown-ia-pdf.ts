import { normalizarMarkdownIa } from "@/lib/markdown-ia"

export interface ItemListaMarkdownIaPdf {
  texto: string
  tipo: "bullet" | "numero" | "tarefa" | "tarefaConcluida"
  nivel: number
}

export type BlocoMarkdownIaPdf =
  | { tipo: "titulo"; nivel: number; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: ItemListaMarkdownIaPdf[] }
  | { tipo: "tabela"; cabecalhos: string[]; linhas: string[][] }
  | { tipo: "citacao"; texto: string }
  | { tipo: "codigo"; linhas: string[] }
  | { tipo: "separador" }

export function textoInlineMarkdownIa(valor: string) {
  return valor
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim()
}

function celulasDaLinha(linha: string) {
  return linha
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((celula) => textoInlineMarkdownIa(celula))
}

function ehLinhaSeparadora(linha: string) {
  const texto = linha.trim()
  if (!texto.startsWith("|")) return false
  const celulas = celulasDaLinha(linha)
  return celulas.length > 0 && celulas.every((celula) => /^:?-{3,}:?$/.test(celula))
}

function ehInicioDeBloco(linha: string) {
  const texto = linha.trim()
  return (
    /^#{1,6}\s/.test(texto) ||
    texto.startsWith("|") ||
    texto.startsWith("```") ||
    /^>\s?/.test(texto) ||
    /^(?:[-*+]|\d+[.)])\s+/.test(texto) ||
    /^(?:---+|\*\*\*+|___+)$/.test(texto)
  )
}

function itemDaLista(linha: string): ItemListaMarkdownIaPdf | null {
  const tarefa = linha.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/)
  if (tarefa) {
    return {
      texto: textoInlineMarkdownIa(tarefa[3]!),
      tipo: tarefa[2]!.toLowerCase() === "x" ? "tarefaConcluida" : "tarefa",
      nivel: Math.floor(tarefa[1]!.length / 2),
    }
  }

  const marcador = linha.match(/^(\s*)[-*+]\s+(.+)$/)
  if (marcador) {
    return {
      texto: textoInlineMarkdownIa(marcador[2]!),
      tipo: "bullet",
      nivel: Math.floor(marcador[1]!.length / 2),
    }
  }

  const numerado = linha.match(/^(\s*)\d+[.)]\s+(.+)$/)
  if (numerado) {
    return {
      texto: textoInlineMarkdownIa(numerado[2]!),
      tipo: "numero",
      nivel: Math.floor(numerado[1]!.length / 2),
    }
  }

  return null
}

export function blocosMarkdownIaPdf(conteudo: string): BlocoMarkdownIaPdf[] {
  const linhas = normalizarMarkdownIa(conteudo).split("\n")
  const blocos: BlocoMarkdownIaPdf[] = []
  let indice = 0

  while (indice < linhas.length) {
    const linha = linhas[indice]!
    const texto = linha.trim()

    if (!texto) {
      indice += 1
      continue
    }

    if (texto.startsWith("```")) {
      const codigo: string[] = []
      indice += 1
      while (indice < linhas.length && !linhas[indice]!.trim().startsWith("```")) {
        codigo.push(linhas[indice]!)
        indice += 1
      }
      if (indice < linhas.length) indice += 1
      blocos.push({ tipo: "codigo", linhas: codigo })
      continue
    }

    const titulo = texto.match(/^(#{1,6})\s+(.+)$/)
    if (titulo) {
      blocos.push({
        tipo: "titulo",
        nivel: titulo[1]!.length,
        texto: textoInlineMarkdownIa(titulo[2]!),
      })
      indice += 1
      continue
    }

    if (texto.startsWith("|") && ehLinhaSeparadora(linhas[indice + 1] ?? "")) {
      const cabecalhos = celulasDaLinha(linha)
      const linhasTabela: string[][] = []
      indice += 2
      while (indice < linhas.length && linhas[indice]!.trim().startsWith("|")) {
        linhasTabela.push(celulasDaLinha(linhas[indice]!))
        indice += 1
      }
      blocos.push({ tipo: "tabela", cabecalhos, linhas: linhasTabela })
      continue
    }

    const primeiroItem = itemDaLista(linha)
    if (primeiroItem) {
      const itens = [primeiroItem]
      indice += 1
      while (indice < linhas.length) {
        const proximoItem = itemDaLista(linhas[indice]!)
        if (!proximoItem) break
        itens.push(proximoItem)
        indice += 1
      }
      blocos.push({ tipo: "lista", itens })
      continue
    }

    if (/^>\s?/.test(texto)) {
      const citacao: string[] = []
      while (indice < linhas.length && /^>\s?/.test(linhas[indice]!.trim())) {
        citacao.push(textoInlineMarkdownIa(linhas[indice]!.trim().replace(/^>\s?/, "")))
        indice += 1
      }
      blocos.push({ tipo: "citacao", texto: citacao.join(" ") })
      continue
    }

    if (/^(?:---+|\*\*\*+|___+)$/.test(texto)) {
      blocos.push({ tipo: "separador" })
      indice += 1
      continue
    }

    const paragrafos: string[] = []
    while (indice < linhas.length) {
      const atual = linhas[indice]!.trim()
      if (!atual || (paragrafos.length > 0 && ehInicioDeBloco(linhas[indice]!))) break
      paragrafos.push(textoInlineMarkdownIa(atual))
      indice += 1
    }
    if (paragrafos.length > 0) {
      blocos.push({ tipo: "paragrafo", texto: paragrafos.join(" ") })
    }
  }

  return blocos
}
