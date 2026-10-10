import { headers } from "next/headers"

/**
 * Base das URLs absolutas dos metadados (Open Graph, ícones).
 *
 * Usa o host real da requisição em vez de confiar na variável de ambiente: o
 * `NEXT_PUBLIC_APP_URL` estava apontando para outro host, o que fazia o crawler
 * de compartilhamento buscar a imagem num endereço inexistente — e o preview saía
 * sem logo. A variável só entra como último recurso.
 */
export async function urlBase(): Promise<URL> {
  try {
    const h = await headers()
    const host = h.get("x-forwarded-host") ?? h.get("host")
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (process.env.NODE_ENV === "development" ? "http" : "https")
      return new URL(`${proto}://${host}`)
    }
  } catch {
    // Fora do contexto de request (build, teste): cai no fallback.
  }

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