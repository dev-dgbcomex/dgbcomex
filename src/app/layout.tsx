import type { Metadata, Viewport } from "next"
import "./globals.css"
import "leaflet/dist/leaflet.css"
import { cn } from "@/lib/utils"
import { ROTA_LOGO, getLogoDaEmpresa, urlBase } from "@/lib/branding"

const TITULO = "DGBCOMEX"
const DESCRICAO = "Sistema de gestão de desenvolvimento de produtos têxteis"

/**
 * Metadados com o logo da empresa.
 *
 * `generateMetadata` em vez de `metadata` fixo porque o ícone precisa vir do
 * cadastro de Configuração > Empresa: quando o admin troca o logo, a aba do
 * navegador e o preview de link compartilhado acompanham. Se não houver logo
 * cadastrado, cai no `favicon.ico` estático do app.
 *
 * `metadataBase` é obrigatório para o Next resolver imagens relativas do Open
 * Graph — sem ele o preview de link sai sem imagem.
 */
export async function generateMetadata(): Promise<Metadata> {
  const base = urlBase()
  // Dupla proteção: `getLogoDaEmpresa` já trata a falha, mas se ela escapar mesmo
  // assim o layout não pode quebrar por causa de um logo.
  const temLogo = await getLogoDaEmpresa().then(Boolean, () => false)
  const imagem = temLogo ? new URL(ROTA_LOGO, base).toString() : undefined

  return {
    metadataBase: base,
    title: TITULO,
    description: DESCRICAO,
    applicationName: TITULO,
    icons: {
      ...(imagem ? { icon: imagem, apple: imagem } : {}),
    },
    openGraph: {
      type: "website",
      siteName: TITULO,
      title: TITULO,
      description: DESCRICAO,
      locale: "pt_BR",
      ...(imagem ? { images: [{ url: imagem, width: 512, height: 512, alt: TITULO }] } : {}),
    },
    twitter: {
      card: imagem ? "summary" : "summary_large_image",
      title: TITULO,
      description: DESCRICAO,
      ...(imagem ? { images: [imagem] } : {}),
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