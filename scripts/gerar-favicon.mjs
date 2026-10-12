/**
 * Gera `public/favicon.svg` com as duas versoes embutidas como data URI.
 *
 * O Chrome bloqueia referencia a recurso externo dentro de SVG de favicon, entao
 * `href="/logo.png"` resulta em aba vazia. A imagem precisa ir inline.
 *
 *   node scripts/gerar-favicon.mjs
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const raiz = process.cwd()
const dataUri = (arquivo) =>
  `data:image/png;base64,${readFileSync(join(raiz, "public", arquivo)).toString("base64")}`

const claro = dataUri("favicon-claro.png")
const escuro = dataUri("favicon-escuro.png")

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 74" role="img" aria-label="DGBCOMEX">
  <style>
    @media (prefers-color-scheme: dark) { .claro { display: none } }
    @media (prefers-color-scheme: light) { .escuro { display: none } }
  </style>
  <image class="escuro" href="${escuro}" x="0" y="0" width="128" height="69" preserveAspectRatio="xMidYMid meet" />
  <image class="claro" href="${claro}" x="0" y="0" width="128" height="74" preserveAspectRatio="xMidYMid meet" />
</svg>
`

writeFileSync(join(raiz, "public", "favicon.svg"), svg, "utf8")
console.log(
  `favicon.svg gerado: ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB (claro ${(
    claro.length / 1024
  ).toFixed(1)} KB, escuro ${(escuro.length / 1024).toFixed(1)} KB)`
)