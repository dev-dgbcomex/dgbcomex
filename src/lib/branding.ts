import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"
import { configEmpresa } from "@/lib/db/schema/config-empresa"
import { desc } from "drizzle-orm"

/** URL pública que re-serve os bytes do logo cadastrado em Configuração > Empresa. */
export const ROTA_LOGO = "/api/public/empresa/logo"

/** Mesma heurística usada pelos geradores de PDF: default primeiro, senão o primeiro. */
export function escolherEmpresa<T extends { isDefault?: boolean | null }>(lista: T[]): T | null {
  if (!lista.length) return null
  return lista.find((e) => e.isDefault) ?? lista[0]
}

/**
 * Lê o logo da empresa. `unstable_cache` porque isto roda no `generateMetadata`,
 * ou seja, a cada requisição do servidor — sem cache seria uma consulta ao banco
 * só para montar a aba do navegador.
 */
const carregarLogo = async (): Promise<string | null> => {
  try {
    const lista: { logoUrl: string | null; isDefault: boolean | null }[] = await db
      .select({ logoUrl: configEmpresa.logoUrl, isDefault: configEmpresa.isDefault })
      .from(configEmpresa)
      .orderBy(desc(configEmpresa.isDefault), desc(configEmpresa.id))
    // Mesma heurística dos geradores de PDF, escrita aqui para o tipo do SELECT do
    // Drizzle não se perder na inferência do genérico.
    const escolhida = lista.find((e) => e.isDefault) ?? lista[0]
    return escolhida?.logoUrl?.trim() || null
  } catch {
    // Falha de banco não pode derrubar o layout inteiro.
    return null
  }
}

export const logoDaEmpresa = unstable_cache(carregarLogo, ["config-empresa-logo"], {
  revalidate: 300,
  tags: ["config-empresa"],
})

export async function getLogoDaEmpresa(): Promise<string | null> {
  try {
    return await logoDaEmpresa()
  } catch {
    return null
  }
}

/**
 * `metadataBase` é obrigatório para o Next resolver imagens relativas do Open Graph;
 * sem isso o preview de link compartilhado sai sem imagem. O mesmo fallback de URL
 * do `notificar.ts` é usado aqui.
 */
export function urlBase(): URL {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://dgbcomex.vercel.app")
  try {
    return new URL(raw)
  } catch {
    return new URL("http://localhost:3000")
  }
}