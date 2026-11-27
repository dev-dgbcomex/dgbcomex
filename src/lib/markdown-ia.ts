const CELULA_SEPARADORA = /^:?-{3,}:?$/

function removerCercas(conteudo: string): string {
  return conteudo
    .replace(/^\s*```(?:markdown|md)?\s*\n/i, "")
    .replace(/\n```\s*$/i, "")
}

function quebrarTabelasInline(conteudo: string): string {
  return conteudo
    .split("\n")
    .map((linha) => {
      if (!linha.trim().startsWith("|")) return linha

      const partes = linha.split("|").map((parte) => parte.trim())
      const inicioSeparador = partes.findIndex((parte) => CELULA_SEPARADORA.test(parte))
      if (inicioSeparador <= 1) return linha

      let fimSeparador = inicioSeparador
      while (fimSeparador < partes.length && CELULA_SEPARADORA.test(partes[fimSeparador]!)) {
        fimSeparador += 1
      }

      const colunas = fimSeparador - inicioSeparador
      if (colunas < 2) return linha

      const cabecalho: string[] = []
      for (let indice = inicioSeparador - 1; indice > 0 && cabecalho.length < colunas; indice -= 1) {
        const parte = partes[indice]!
        if (parte) cabecalho.unshift(parte)
      }
      if (cabecalho.length !== colunas) return linha

      const celulasRestantes = partes.slice(fimSeparador).filter((parte) => parte.length > 0)
      if (celulasRestantes.length < colunas) return linha

      const linhas: string[][] = [cabecalho, partes.slice(inicioSeparador, fimSeparador)]
      for (let indice = 0; indice < celulasRestantes.length; indice += colunas) {
        linhas.push(celulasRestantes.slice(indice, indice + colunas))
      }

      return `\n\n${linhas.map((celulas) => `| ${celulas.join(" | ")} |`).join("\n")}\n\n`
    })
    .join("\n")
}

export function normalizarMarkdownIa(conteudo: string): string {
  const semCercas = removerCercas(conteudo)
    .replace(/^([ \t]*)\[([ xX])\][ \t]+/gm, "$1- [$2] ")
    .replace(/\n{3,}/g, "\n\n")
  return quebrarTabelasInline(semCercas).trim()
}

export function markdownIaParaTexto(conteudo: string): string {
  return normalizarMarkdownIa(conteudo)
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^([ \t]*)- \[([ xX])\][ \t]+/gm, "$1[$2] ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^>\s?/gm, "")
}
