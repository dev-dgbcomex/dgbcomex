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

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Troca os marcadores `{param}` da URL base pelos valores recebidos na query.
 * `{data}` sem valor cai em hoje — é o caso dos cards do BI (`/faturamento/{data}`).
 */
function resolverUrlBase(
  baseUrl: string,
  searchParams: URLSearchParams
): { url: string; extras: [string, string][] } {
  let base = baseUrl
  const extras: [string, string][] = []
  searchParams.forEach((value, key) => {
    if (key === "tela") return
    const token = `{${key}}`
    if (base.includes(token)) {
      base = base.split(token).join(encodeURIComponent(value))
    } else {
      extras.push([key, value])
    }
  })
  if (base.includes("{data}")) {
    base = base.split("{data}").join(hoje())
  }
  return { url: base, extras }
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

    // O mesmo login das demais rotas (`/executar`, proxy de detalhe): assim o botão
    // "Executar" funciona também nas integrações com `tipoAuth = "login"`, que são
    // as do BI e do WMS — antes elas iam sem Authorization e a API devolvia 401.
    const resultado = await autenticarIntegracao(integracao)
    if (!resultado.ok) {
      return NextResponse.json({
        success: false,
        status: resultado.status,
        time: Date.now() - startTime,
        error: resultado.erro,
        request: { url: integracao.baseUrl, method: "GET" },
      })
    }
    const headers = resultado.headers

    const { searchParams } = new URL(req.url)
    const { url: baseResolvida, extras } = resolverUrlBase(integracao.baseUrl, searchParams)

    let url: URL
    try {
      url = new URL(baseResolvida)
    } catch {
      return NextResponse.json({ error: "URL base inválida" }, { status: 400 })
    }
    for (const [key, value] of extras) {
      url.searchParams.set(key, value)
    }

    if (integracao.tipoAuth === "api_key") {
      const location = (authConfig.in as string) || "header"
      if (location === "query") {
        const keyName = (authConfig.key_name as string) || "api_key"
        url.searchParams.set(keyName, (authConfig.key as string) || "")
      }
    }

    // build requestDetails for debug (mask sensitive values)
    const requestHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === "authorization") {
        const parts = v.split(" ")
        requestHeaders[k] = parts[0] + " " + (parts[1] ? maskSensitive(parts[1]) : "")
      } else {
        requestHeaders[k] = v
      }
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(15000),
      })

      const elapsed = Date.now() - startTime
      const responseText = await response.text()

      let responseJson: unknown = null
      try {
        responseJson = JSON.parse(responseText)
      } catch {
        // not JSON
      }

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        time: elapsed,
        responseBody: responseJson || responseText.slice(0, 2000),
        request: { url: url.toString(), method: "GET" },
        requestHeaders,
      })
    } catch (fetchError: unknown) {
      const elapsed = Date.now() - startTime
      const message = fetchError instanceof Error ? fetchError.message : "Erro de conexão"
      return NextResponse.json({
        success: false,
        status: 0,
        time: elapsed,
        error: `Falha na requisição: ${message}`,
        request: { url: url.toString(), method: "GET" },
        requestHeaders,
      })
    }
  } catch (error) {
    console.error("[GET /api/admin/integracoes/testar]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
