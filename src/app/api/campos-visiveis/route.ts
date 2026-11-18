import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { carregarCamposVisiveis } from "@/lib/campos-visiveis"
import { encontrarCadastro } from "@/lib/campos-visiveis/catalogo"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const cadastro = new URL(req.url).searchParams.get("cadastro") ?? ""
    if (!cadastro || !encontrarCadastro(cadastro)) {
      return NextResponse.json({ error: "Cadastro inválido" }, { status: 400 })
    }

    const resultado = await carregarCamposVisiveis(cadastro, auth.session.user?.role)
    return NextResponse.json({
      cadastro,
      campos: resultado.campos,
      falhou: resultado.falhou,
    })
  } catch (error) {
    return handleApiError(error, "GET /api/campos-visiveis")
  }
}
