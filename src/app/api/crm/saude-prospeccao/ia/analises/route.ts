import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, ilike, lt, or } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { aiChaves } from "@/lib/db/schema/ai-chaves"
import {
  crmSaudeProspeccaoAnalises,
  crmSaudeProspeccaoMensagens,
} from "@/lib/db/schema/crm-saude-prospeccao-ia"
import { podeVerTodasAnalises } from "@/lib/crm/saude-prospeccao-acesso"
import { chamarAnaliseComConsultas, contextoInicial } from "@/lib/crm/saude-prospeccao-ia"
import { saudeProspeccaoAnaliseSchema, validateRequest } from "@/lib/validation"

export const dynamic = "force-dynamic"

export async function GET() {
  let usuarioNome: string | null = null
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    usuarioNome = auth.session.user.name ?? null

    const analises = await db
      .select()
      .from(crmSaudeProspeccaoAnalises)
      .orderBy(desc(crmSaudeProspeccaoAnalises.createdAt))
      .limit(100)

    const visiveis = podeVerTodasAnalises(auth.session.user.role)
      ? analises
      : analises.filter((analise: (typeof analises)[number]) => analise.criadoPor === auth.userId)

    return NextResponse.json({ analises: visiveis })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/saude-prospeccao/ia/analises", usuarioNome)
  }
}

export async function POST(req: NextRequest) {
  let usuarioNome: string | null = null
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    usuarioNome = auth.session.user.name ?? null

    const parsed = validateRequest(saudeProspeccaoAnaliseSchema, await req.json())
    if ("error" in parsed) return parsed.error

    const { titulo, linhas, filtros } = parsed.data

    let chaveId: number | undefined
    const [chaveIA] = await db
      .select({ id: aiChaves.id })
      .from(aiChaves)
      .where(
        and(
          eq(aiChaves.ativo, true),
          lt(aiChaves.failCount, 5),
          eq(aiChaves.provedor, "openai_compatible"),
          or(ilike(aiChaves.nome, "%nvidia%"), ilike(aiChaves.modelo, "%nemotron%"))
        )
      )
      .orderBy(aiChaves.ordem)
      .limit(1)
    if (chaveIA) chaveId = chaveIA.id

    const { linhas: preparadas, mensagens } = await contextoInicial(linhas, filtros)
    const { conteudo, resultado, consultas } = await chamarAnaliseComConsultas({ mensagens, chaveId })

    if (resultado.provedor === "nenhum") {
      return NextResponse.json(
        { error: "Nenhum provedor de IA disponível no momento", detalhe: resultado.erro },
        { status: 503 }
      )
    }

    const resumo = conteudo.replace(/[#*`>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240)
    const contexto = { registros: preparadas, consultas }

    const criado = await db.transaction(async (tx: typeof db) => {
      const [analise] = await tx
        .insert(crmSaudeProspeccaoAnalises)
        .values({
          titulo: titulo?.trim() || `Análise de ${new Date().toLocaleString("pt-BR")}`,
          analise: conteudo,
          resumo,
          contexto,
          filtros,
          provedor: resultado.provedor,
          modelo: resultado.modelo,
          criadoPor: auth.userId,
          criadoPorNome: auth.session.user.name ?? null,
          criadoPorEmail: auth.session.user.email ?? null,
        })
        .returning()

      await tx.insert(crmSaudeProspeccaoMensagens).values({
        analiseId: analise.id,
        papel: "assistente",
        conteudo,
        dadosUsados: { consultas },
      })

      return analise
    })

    return NextResponse.json({ analise: criado }, { status: 201 })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/saude-prospeccao/ia/analises", usuarioNome)
  }
}
