import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import {
  contextoInicial,
  buscarChaveIAAnalise,
  dividirLinhasEmFatias,
  medirMensagensIA,
  perfilContextoDaChave,
} from "@/lib/crm/saude-prospeccao-ia"
import { saudeProspeccaoAnaliseSchema, validateRequest } from "@/lib/validation"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let usuarioNome: string | null = null
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    usuarioNome = auth.session.user.name ?? null

    const parsed = validateRequest(saudeProspeccaoAnaliseSchema, await req.json())
    if ("error" in parsed) return parsed.error

    const { linhas, filtros } = parsed.data
    const chave = await buscarChaveIAAnalise()
    const { linhas: preparadas, mensagens, compactacao } = await contextoInicial(
      linhas,
      filtros,
      perfilContextoDaChave(chave)
    )
    const { enviadoChars, estTokensAprox } = medirMensagensIA(mensagens)
    const fatias = dividirLinhasEmFatias(preparadas, filtros)
    const fatiamentoPrevisto =
      fatias.length > 1 ? { total: preparadas.length, fatias: fatias.length } : null

    return NextResponse.json(
      {
        payload: {
          titulo: `Análise de saúde da prospecção — ${new Date().toLocaleString("pt-BR")}`,
          linhas,
          filtros,
        },
        mensagens,
        chave: chave ?? null,
        enviadoChars,
        estTokensAprox,
        compactacao: compactacao ?? null,
        fatiamentoPrevisto,
      },
      { headers: { "X-Enviado-Chars": String(enviadoChars), "X-Est-Tokens-Aprox": String(estTokensAprox) } }
    )
  } catch (error) {
    return handleApiError(error, "POST /api/crm/saude-prospeccao/ia/analises/preview", usuarioNome)
  }
}
