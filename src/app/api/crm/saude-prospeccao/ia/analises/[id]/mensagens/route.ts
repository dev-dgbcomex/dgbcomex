import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import {
  crmSaudeProspeccaoAnalises,
  crmSaudeProspeccaoMensagens,
} from "@/lib/db/schema/crm-saude-prospeccao-ia"
import { carregarAnaliseAutorizada } from "@/lib/crm/saude-prospeccao-acesso"
import {
  chamarAnaliseComConsultas,
  montarMensagensAnalise,
  prepararLinhas,
  buscarTemperaturas,
  medirMensagensIA,
  buscarChaveIAAnalise,
  perfilContextoDaChave,
  type LinhaAnaliseIA,
} from "@/lib/crm/saude-prospeccao-ia"
import { saudeProspeccaoMensagemSchema, validateRequest } from "@/lib/validation"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let usuarioNome: string | null = null
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    usuarioNome = auth.session.user.name ?? null

    const id = Number((await params).id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const analise = await carregarAnaliseAutorizada({
      id,
      userId: auth.userId,
      role: auth.session.user.role,
    })
    if (!analise) return NextResponse.json({ error: "Análise não encontrada" }, { status: 404 })

    const parsed = validateRequest(saudeProspeccaoMensagemSchema, await req.json())
    if ("error" in parsed) return parsed.error
    const { mensagens: historico, pergunta } = parsed.data

    const registros = (analise.contexto as { registros?: LinhaAnaliseIA[] }).registros
    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: "Contexto da análise indisponível" }, { status: 422 })
    }

    const temperaturas = await buscarTemperaturas(registros)
    const linhas = prepararLinhas(registros, temperaturas)
    const chave = await buscarChaveIAAnalise()
    const perfil = perfilContextoDaChave(chave)
    const mensagens = montarMensagensAnalise({
      linhas,
      filtros: analise.filtros,
      historico,
      pergunta,
      perfil,
    })

    const { conteudo, resultado, consultas, fatiamento } = await chamarAnaliseComConsultas({
      mensagens,
      chaveId: chave?.id,
      perfil,
      dadosFonte: {
        linhas,
        filtros: analise.filtros,
        pergunta,
        historico,
      },
    })
    const { enviadoChars, estTokensAprox } = medirMensagensIA(mensagens)

    if (resultado.codigo === "PAYLOAD_TOO_LARGE") {
      return NextResponse.json(
        {
          error: "Dados demais para a IA processar de uma vez",
          detalhe: "Reduza o tamanho da pergunta ou o histórico da conversa e tente novamente.",
          enviadoChars,
          estTokensAprox,
          fatiamento,
        },
        {
          status: 413,
          headers: {
            "X-Enviado-Chars": String(enviadoChars),
            "X-Est-Tokens-Aprox": String(estTokensAprox),
          },
        }
      )
    }

    if (resultado.provedor === "nenhum") {
      return NextResponse.json(
        { error: "Nenhum provedor de IA disponível no momento", detalhe: resultado.erro ?? "provedor nao encontrado", fatiamento },
        { status: 503 }
      )
    }

    const criadas = await db.transaction(async (tx: typeof db) => {
      const inseridas = await tx
        .insert(crmSaudeProspeccaoMensagens)
        .values([
          {
            analiseId: id,
            papel: "usuario",
            conteudo: pergunta,
            dadosUsados: {},
          },
          {
            analiseId: id,
            papel: "assistente",
            conteudo,
            dadosUsados: { consultas, fatiamento },
          },
        ])
        .returning()

      await tx
        .update(crmSaudeProspeccaoAnalises)
        .set({ updatedAt: new Date() })
        .where(eq(crmSaudeProspeccaoAnalises.id, id))

      return inseridas
    })

    return NextResponse.json({ mensagens: criadas, fatiamento })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/saude-prospeccao/ia/analises/[id]/mensagens", usuarioNome)
  }
}
