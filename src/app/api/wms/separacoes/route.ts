import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { criarSeparacao, listarSeparacoes } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const limite = Number(searchParams.get("limite") ?? 50)
    const offset = Number(searchParams.get("offset") ?? 0)

    return NextResponse.json(
      await listarSeparacoes({
        status: searchParams.get("status") ?? "",
        busca: searchParams.get("busca") ?? "",
        limite: Number.isFinite(limite) ? limite : 50,
        offset: Number.isFinite(offset) ? offset : 0,
      })
    )
  } catch (error) {
    return erroWms(error, "GET /api/wms/separacoes")
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = (await req.json()) as Record<string, unknown>
    const empresa = typeof body.empresa === "string" ? body.empresa.trim() : ""
    const pedido = typeof body.pedido === "string" ? body.pedido.trim() : ""
    if (!empresa || !pedido) {
      return NextResponse.json(
        { error: "Empresa e pedido são obrigatórios" },
        { status: 400 }
      )
    }

    const separacao = await criarSeparacao({
      empresa,
      pedido,
      observacao: typeof body.observacao === "string" ? body.observacao : null,
      usuarioId: auth.userId,
    })
    return NextResponse.json(separacao, { status: 201 })
  } catch (error) {
    return erroWms(error, "POST /api/wms/separacoes")
  }
}
