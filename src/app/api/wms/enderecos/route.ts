import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { criarEndereco, listarEnderecos } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"
import { WMS_ENDERECO_TIPO } from "@/lib/wms/tipos"

export const dynamic = "force-dynamic"

const TIPOS = new Set<string>(WMS_ENDERECO_TIPO)

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    return NextResponse.json(await listarEnderecos())
  } catch (error) {
    return erroWms(error, "GET /api/wms/enderecos")
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = (await req.json()) as Record<string, unknown>
    const codigo = typeof body.codigo === "string" ? body.codigo.trim() : ""
    if (!codigo) {
      return NextResponse.json({ error: "Código do endereço é obrigatório" }, { status: 400 })
    }
    const tipo = typeof body.tipo === "string" && TIPOS.has(body.tipo) ? body.tipo : "PULMAO"

    const endereco = await criarEndereco({
      codigo,
      tipo,
      zona: typeof body.zona === "string" ? body.zona : null,
      rua: typeof body.rua === "string" ? body.rua : null,
      predio: typeof body.predio === "string" ? body.predio : null,
      nivel: typeof body.nivel === "string" ? body.nivel : null,
      apto: typeof body.apto === "string" ? body.apto : null,
      capacidade: numero(body.capacidade),
      observacoes: typeof body.observacoes === "string" ? body.observacoes : null,
    })

    return NextResponse.json(endereco, { status: 201 })
  } catch (error) {
    return erroWms(error, "POST /api/wms/enderecos")
  }
}
