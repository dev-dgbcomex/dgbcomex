import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { integracoes } from "@/lib/db/schema/integracoes"
import { eq } from "drizzle-orm"
import { autenticarIntegracao } from "@/lib/integracao/autenticar"

export const dynamic = "force-dynamic"

const TIMEOUT_MS = 180000

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ nome: string; caminho: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { nome, caminho } = await params
    if (!nome) {
      return NextResponse.json({ error: "nome inválido" }, { status: 400 })
    }

    const [integracao] = await db.select().from(integracoes).where(eq(integracoes.nome, nome))
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

    const caminhoStr = caminho?.length ? caminho.join("/") : ""
    const destino = new URL(base.origin)
    destino.pathname = base.pathname.replace(/\/$/, "") + (caminhoStr ? "/" + caminhoStr.replace(/^\//, "") : "")
    
    for (const [chave, valor] of req.nextUrl.searchParams) {
      if (chave !== "tela") destino.searchParams.set(chave, valor)
    }

    const corpoTexto = req.method === "POST" || req.method === "PUT" || req.method === "DELETE" ? await req.text() : undefined
    const response = await fetch(destino.toString(), {
      method: req.method,
      headers: {
        ...resultado.headers,
        ...(corpoTexto && !Object.keys(resultado.headers).some(k => k.toLowerCase() === "content-type") ? { "Content-Type": "application/json" } : {}),
        ...((corpoTexto && Object.keys(resultado.headers).some(k => k.toLowerCase() === "content-type")) ? {} : {}),
      },
      body: corpoTexto || undefined,
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ nome: string; caminho: string[] }> }) {
  return handler(req, ctx)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ nome: string; caminho: string[] }> }) {
  return handler(req, ctx)
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ nome: string; caminho: string[] }> }) {
  return handler(req, ctx)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ nome: string; caminho: string[] }> }) {
  return handler(req, ctx)
}
