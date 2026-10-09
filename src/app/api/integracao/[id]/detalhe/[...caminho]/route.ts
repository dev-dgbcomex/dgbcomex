import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { integracoes } from "@/lib/db/schema/integracoes"
import { eq } from "drizzle-orm"
import { autenticarIntegracao } from "@/lib/integracao/autenticar"
export const dynamic = "force-dynamic"

// A carga do detalhe lê 12 meses do ERP ao vivo e pode demorar bem mais que um request
// comum de card; o proxy por isso usa um timeout maior que o do `/executar`.
const TIMEOUT_MS = 180000

/**
 * Proxy para a API de detalhe do BI (`/faturamento-detalhe/*`): faz o login da integração
 * (mesmo cache do `/executar`), monta a URL a partir do `baseUrl` e repassa GET/POST.
 *
 * As telas de detalhe leem do IndexedDB do navegador e usam este proxy só para o estado,
 * a carga e o sync — então a resposta aqui é o corpo JSON da API de origem, sem embrulho.
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; caminho: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id: idStr, caminho } = await params
    const id = Number(idStr)
    if (!id) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 })
    }
    if (!caminho?.length) {
      return NextResponse.json({ error: "caminho vazio" }, { status: 400 })
    }

    const [integracao] = await db.select().from(integracoes).where(eq(integracoes.id, id))
    if (!integracao) {
      return NextResponse.json({ error: "Integração não encontrada" }, { status: 404 })
    }

    const resultado = await autenticarIntegracao(integracao)
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.erro, status: resultado.status },
        { status: 502 }
      )
    }

    let base: URL
    try {
      base = new URL(integracao.baseUrl)
    } catch {
      return NextResponse.json({ error: "URL base inválida" }, { status: 400 })
    }
    const destino = new URL(`${base.origin}/${caminho.join("/")}`)
    for (const [chave, valor] of req.nextUrl.searchParams) {
      if (chave !== "tela") destino.searchParams.set(chave, valor)
    }

    const corpoTexto = req.method === "POST" ? await req.text() : undefined
    const response = await fetch(destino.toString(), {
      method: req.method,
      headers: {
        ...resultado.headers,
        ...(corpoTexto ? { "Content-Type": "application/json" } : {}),
      },
      body: corpoTexto,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const contentType = response.headers.get("content-type") || ""
    const corpo: unknown = contentType.includes("application/json")
      ? await response.json()
      : await response.text()
    return NextResponse.json(corpo, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno", detalhes: error instanceof Error ? error.message : null },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; caminho: string[] }> }) {
  return handler(req, ctx)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; caminho: string[] }> }) {
  return handler(req, ctx)
}