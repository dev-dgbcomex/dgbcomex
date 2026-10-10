import { NextResponse } from "next/server"
import { getLogoDaEmpresa } from "@/lib/branding"
export const dynamic = "force-dynamic"

/**
 * Logo da empresa servido sem sessão.
 *
 * O favicon e a imagem do Open Graph são pedidos pelo navegador e pelos crawlers de
 * compartilhamento **sem cookie de sessão**, então a rota autenticada de
 * configuração de empresa não serve para isso. Esta rota lê o mesmo cadastro e
 * re-serve os bytes.
 *
 * A URL cadastrada é texto livre (o admin pode colar um link do Google Drive, por
 * exemplo), por isso a proteção anti-SSRF é a mesma do `/api/proxy-image`.
 */

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "169.254.169.254",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254.nip.io",
]

function isPrivateIP(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "")
  if (clean.includes(":")) return true
  const parts = clean.split(".")
  if (parts.length !== 4) return false
  const nums = parts.map(Number)
  if (nums.some(isNaN)) return false
  if (nums[0] === 10) return true
  if (nums[0] === 127) return true
  if (nums[0] === 192 && nums[1] === 168) return true
  if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return true
  if (nums[0] === 169 && nums[1] === 254) return true
  if (nums[0] === 0) return true
  return false
}

/** 404 sem imagem: o browser e o crawler caem no favicon estático do app. */
function semLogo() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  })
}

export async function GET() {
  const logoUrl = await getLogoDaEmpresa()
  if (!logoUrl) return semLogo()

  let parsed: URL
  try {
    parsed = new URL(logoUrl)
  } catch {
    return semLogo()
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return semLogo()
  const hostname = parsed.hostname.toLowerCase()
  if (BLOCKED_HOSTS.includes(hostname) || isPrivateIP(hostname)) return semLogo()

  try {
    const res = await fetch(logoUrl, { redirect: "follow" })
    if (!res.ok) return semLogo()
    const contentType = res.headers.get("content-type") || "image/png"
    // Só re-serve imagem: a rota não deve virar um proxy genérico.
    if (!contentType.startsWith("image/")) return semLogo()

    return new NextResponse(await res.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch {
    return semLogo()
  }
}