import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api-error"
export const dynamic = "force-dynamic"

/**
 * Ids válidos de cada painel, em paridade com o front. A ordem default do painel
 * é a daqui: o front completa a que falta quando a salva vem incompleta.
 */
const GRAFICOS = {
  faturamento: ["mes", "clientes", "produtos", "participacao"],
  "contas-pagas": ["mes", "fornecedor", "banco", "empresa", "departamento"],
} as const

type Painel = keyof typeof GRAFICOS

/** Recusa painel desconhecido em vez de salvar uma lista que a tela não entende. */
function painelDe(valor: unknown): Painel {
  return valor === "contas-pagas" ? "contas-pagas" : "faturamento"
}

function idsValidos(painel: Painel, lista: unknown): string[] {
  if (!Array.isArray(lista)) return []
  const validos = GRAFICOS[painel]
  return [...new Set(lista.filter((id): id is string => validos.includes(id as never)))]
}

/**
 * A coluna guardava um array simples (só faturamento). Passou a guardar um objeto
 * por painel, então quem já tem o array antigo é lido como o painel de faturamento
 * — sem migração e sem perder a ordem que a pessoa já tinha customized.
 */
function lerOrdem(
  guardado: unknown,
  painel: Painel
): string[] {
  if (Array.isArray(guardado)) {
    return painel === "faturamento" ? idsValidos(painel, guardado) : []
  }
  if (guardado && typeof guardado === "object") {
    return idsValidos(painel, (guardado as Record<string, unknown>)[painel])
  }
  return []
}

function gravarOrdem(guardado: unknown, painel: Painel, ids: string[]): Record<string, string[]> {
  const base: Record<string, string[]> = Array.isArray(guardado)
    ? { faturamento: idsValidos("faturamento", guardado) }
    : { ...((guardado as Record<string, string[]>) ?? {}) }
  base[painel] = ids
  return base
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const painel = painelDe(req.nextUrl.searchParams.get("painel"))
    const [user] = await db
      .select({ biOrdemGraficos: usuarios.biOrdemGraficos })
      .from(usuarios)
      .where(eq(usuarios.id, auth.userId))

    return NextResponse.json({ ids: lerOrdem(user?.biOrdemGraficos ?? [], painel) })
  } catch (error) {
    return handleApiError(error, "BiOrdemGraficosGet")
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json().catch(() => null)
    const painel = painelDe(body?.painel ?? req.nextUrl.searchParams.get("painel"))
    const ids = idsValidos(painel, body?.ids)
    if (ids.length === 0) {
      return NextResponse.json({ error: "Lista de ids inválida" }, { status: 400 })
    }

    const [user] = await db
      .select({ biOrdemGraficos: usuarios.biOrdemGraficos })
      .from(usuarios)
      .where(eq(usuarios.id, auth.userId))

    await db
      .update(usuarios)
      .set({ biOrdemGraficos: gravarOrdem(user?.biOrdemGraficos ?? [], painel, ids) })
      .where(eq(usuarios.id, auth.userId))

    return NextResponse.json({ success: true, painel, ids })
  } catch (error) {
    return handleApiError(error, "BiOrdemGraficosPut")
  }
}
