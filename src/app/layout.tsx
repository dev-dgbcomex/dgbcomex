import type { Metadata, Viewport } from "next"
import "./globals.css"
import "leaflet/dist/leaflet.css"
import { cn } from "@/lib/utils"
import { urlBase } from "@/lib/branding"

const TITULO = "DGBCOMEX"
const DESCRICAO = "Sistema de operações Comex"

/**
 * Metadados com os logos da marca em `public/`.
 *
 * São arquivos locais em vez do logo cadastrado no banco porque o preview de
 * compartilhamento depende de a imagem estar no mesmo host da aplicação — buscar
 * o logo de fora quebrava o preview.
 *
 * `favicon.svg` é adaptativo: troca o logo preto pelo branco conforme o tema
 * claro/escuro do navegador. As duas imagens estão **embutidas** no próprio SVG —
 * o Chrome bloqueia referência a recurso externo em favicon SVG, e com `href="/x.png"`
 * a aba fica vazia. Um PNG serve de fallback para quem não renderiza SVG.
 *
 * `metadataBase` é montado a partir do host real da requisição, e não de variável
 * de ambiente — que estava apontando para outro host e fazia o crawler buscar a
 * imagem no endereço errado.
 */
export async function generateMetadata(): Promise<Metadata> {
  const base = await urlBase()
  const absoluta = (caminho: string) => new URL(caminho, base).toString()
  const svg = absoluta("/favicon.svg")
  const png = absoluta("/favicon-claro.png")
  const imagem = absoluta("/logodgbcomexpreto002.png")

  return {
    metadataBase: base,
    title: TITULO,
    description: DESCRICAO,
    applicationName: TITULO,
    icons: {
      // SVG primeiro (é o adaptativo); o PNG cobre quem não renderiza SVG de favicon.
      icon: [
        { url: svg, type: "image/svg+xml" },
        { url: png, type: "image/png", sizes: "128x74" },
      ],
      apple: absoluta("/apple-icon.png"),
      shortcut: svg,
    },
    openGraph: {
      type: "website",
      siteName: TITULO,
      title: TITULO,
      description: DESCRICAO,
      locale: "pt_BR",
      images: [{ url: imagem, width: 1294, height: 744, alt: TITULO }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITULO,
      description: DESCRICAO,
      images: [imagem],
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
}

import { Providers } from "@/components/providers"
import { QueryProvider } from "@/components/query-provider"

import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="font-sans" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Providers>
          <QueryProvider>{children}</QueryProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}