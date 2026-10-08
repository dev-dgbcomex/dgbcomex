import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api-error"
export const dynamic = "force-dynamic"

function idsValidos(lista: unknown): number[] {
  if (!Array.isArray(lista)) return []
  return [...new Set(lista.filter((n): n is number => Number.isInteger(n) && n > 0))]
}

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const [user] = await db
      .select({ biOrdemCards: usuarios.biOrdemCards })
      .from(usuarios)
      .where(eq(usuarios.id, auth.userId))

    return NextResponse.json({ ids: idsValidos(user?.biOrdemCards ?? []) })
  } catch (error) {
    return handleApiError(error, "IntegracaoOrdemGet")
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json().catch(() => null)
    const ids = idsValidos(body?.ids)
    if (ids.length === 0) {
      return NextResponse.json({ error: "Lista de ids inválida" }, { status: 400 })
    }

    await db.update(usuarios).set({ biOrdemCards: ids }).where(eq(usuarios.id, auth.userId))

    return NextResponse.json({ success: true, ids })
  } catch (error) {
    return handleApiError(error, "IntegracaoOrdemPut")
  }
}