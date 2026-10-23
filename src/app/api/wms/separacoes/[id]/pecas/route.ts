import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { adicionarPecas } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"
import type { PecaRef } from "@/lib/wms/tipos"

export const dynamic = "force-dynamic"

function pecasDoCorpo(valor: unknown): PecaRef[] {
  if (!Array.isArray(valor)) return []
  return valor
    .map((entrada): PecaRef | null => {
      const peca = entrada as Record<string, unknown>
      const nroRolo = typeof peca?.nroRolo === "string" ? peca.nroRolo.trim() : ""
      const nroPeca = typeof peca?.nroPeca === "string" ? peca.nroPeca.trim() : ""
      if (!nroRolo || !nroPeca) return null
      return {
        empresa: typeof peca.empresa === "string" ? peca.empresa : null,
        nroRolo,
        nroPeca,
      }
    })
    .filter((peca): peca is PecaRef => peca !== null)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const separacaoId = Number(id)
    if (!Number.isInteger(separacaoId) || separacaoId <= 0) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const item = Number(body.item)
    if (!Number.isInteger(item) || item <= 0) {
      return NextResponse.json({ error: "Item é obrigatório" }, { status: 400 })
    }

    const pecas = pecasDoCorpo(body.pecas)
    if (pecas.length === 0) {
      return NextResponse.json(
        { error: "Selecione ao menos uma peça" },
        { status: 400 }
      )
    }

    const resultado = await adicionarPecas(separacaoId, {
      item,
      pecas,
      usuarioId: auth.userId,
    })
    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    return erroWms(error, "POST /api/wms/separacoes/[id]/pecas")
  }
}
