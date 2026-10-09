import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { integracoes } from "@/lib/db/schema/integracoes"
import { eq } from "drizzle-orm"
import { autenticarIntegracao } from "@/lib/integracao/autenticar"
export const dynamic = "force-dynamic"

function maskSensitive(value: string): string {
  if (value.length <= 6) return value.slice(0, 2) + "****"
  return value.slice(0, 4) + "****" + value.slice(-4)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!id) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 })
    }

    const [integracao] = await db.select().from(integracoes).where(eq(integracoes.id, id))
    if (!integracao) {
      return NextResponse.json({ error: "Integração não encontrada" }, { status: 404 })
    }

    const authConfig = (integracao.authConfig || {}) as Record<string, unknown>
    const resultado = await autenticarIntegracao(integracao)
    if (!resultado.ok) {
      return NextResponse.json({
        success: false,
        error: resultado.erro,
        status: resultado.status,
        time: Date.now() - startTime,
      })
    }
    const headers = resultado.headers

    const { searchParams: reqParams } = new URL(req.url)
    let baseUrl = integracao.baseUrl
    const extras: [string, string][] = []
    reqParams.forEach((value: any, key: any) => {
      if (key === "tela") return
      const token = `{${key}}`
      if (baseUrl.includes(token)) {
        baseUrl = baseUrl.split(token).join(encodeURIComponent(value))
      } else {
        extras.push([key, value])
      }
    })
    let url: URL
    try {
      url = new URL(baseUrl)
    } catch {
      return NextResponse.json({ error: "URL base inválida" }, { status: 400 })
    }
    for (const [key, value] of extras) {
      url.searchParams.set(key, value)
    }

    if (integracao.tipoAuth === "api_key") {
      const key = authConfig.key as string
      const location = (authConfig.in as string) || "header"
      if (location === "query") {
        const keyName = (authConfig.key_name as string) || "api_key"
        url.searchParams.set(keyName, key || "")
      }
    }

    const requestHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === "authorization") {
        const parts = v.split(" ")
        requestHeaders[k] = parts[0] + " " + (parts[1] ? maskSensitive(parts[1]) : "")
      } else {
        requestHeaders[k] = v
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    })

    const elapsed = Date.now() - startTime
    let responseBody: unknown = null
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      responseBody = await response.json()
    } else {
      responseBody = await response.text()
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      time: elapsed,
      responseBody,
      request: {
        url: url.toString(),
        method: "GET",
      },
      requestHeaders,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Erro interno",
      status: 0,
      time: Date.now() - startTime,
    })
  }
}
