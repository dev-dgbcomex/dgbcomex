import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"
import { chamarIA } from "@/lib/ai"
import { handleApiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { clientes } from "@/lib/db/schema/clientes"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmResumosIa } from "@/lib/db/schema/crm-resumos-ia"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"
import { buscarContextoResumoIA, montarMensagensResumo } from "@/lib/crm/resumo-ia-contexto"
import { parseRespostaResumoIa } from "@/lib/crm/resumo-ia-parser"
import { resumoIaConsultaSchema, resumoIaSchema, validateRequest } from "@/lib/validation"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  let usuarioNome: string | null = null
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    usuarioNome = auth.session.user.name ?? null

    const { searchParams } = new URL(req.url)
    const parsed = validateRequest(resumoIaConsultaSchema, {
      tipo: searchParams.get("tipo"),
      id: searchParams.get("id"),
    })
    if ("error" in parsed) return parsed.error

    const { tipo, id } = parsed.data
    const resumos = await db
      .select()
      .from(crmResumosIa)
      .where(and(eq(crmResumosIa.entidadeTipo, tipo), eq(crmResumosIa.entidadeId, id)))
      .orderBy(desc(crmResumosIa.createdAt))
      .limit(50)

    return NextResponse.json({ resumos })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/ia/resumos", usuarioNome)
  }
}

async function entidadeExiste(tipo: "lead" | "cliente", id: number) {
  if (tipo === "lead") {
    const [registro] = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.id, id)).limit(1)
    return Boolean(registro)
  }
  const [registro] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, id)).limit(1)
  return Boolean(registro)
}

export async function POST(req: NextRequest) {
  let usuarioNome: string | null = null
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    usuarioNome = auth.session.user.name ?? null

    const body = await req.json()
    const parsed = validateRequest(resumoIaSchema, body)
    if ("error" in parsed) return parsed.error

    const { tipo, id } = parsed.data
    if (!(await entidadeExiste(tipo, id))) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    }

    const contexto = await buscarContextoResumoIA({ tipo, id })
    const mensagens = montarMensagensResumo(contexto)
    const resultado = await chamarIA(
      [
        { role: "system", content: mensagens.system },
        { role: "user", content: mensagens.user },
      ],
      { temperatura: 0, maxTokens: 700 }
    )

    if (resultado.provedor === "nenhum") {
      return NextResponse.json({ error: "Nenhum provedor de IA disponível no momento" }, { status: 503 })
    }

    let resposta: ReturnType<typeof parseRespostaResumoIa>
    try {
      resposta = parseRespostaResumoIa(resultado.conteudo)
    } catch {
      return NextResponse.json({ error: "Não foi possível interpretar a resposta da IA" }, { status: 502 })
    }

    const descricao = `${resposta.classificacao}: ${resposta.resumo.replace(/\s+/g, " ").slice(0, 140)}`

    const registro = await db.transaction(async (tx: any) => {
      const [criado] = await tx
        .insert(crmResumosIa)
        .values({
          entidadeTipo: tipo,
          entidadeId: id,
          resumo: resposta.resumo,
          insights: resposta.insights,
          sugestoes: resposta.sugestoes,
          classificacao: resposta.classificacao,
          motivoClassificacao: resposta.motivoClassificacao,
          contexto: contexto as unknown as Record<string, unknown>,
          provedor: resultado.provedor,
          modelo: resultado.modelo,
          tentativas: resultado.tentativas,
          criadoPor: auth.userId,
          criadoPorNome: usuarioNome,
        })
        .returning()

      await tx.insert(crmTimelineEventos).values({
        empresaId: tipo === "lead" ? id : null,
        clienteId: tipo === "cliente" ? id : null,
        tipo: "RESUMO_IA",
        descricao,
        metadados: { resumoId: criado.id, classificacao: resposta.classificacao },
        dataEvento: new Date(),
      })

      if (tipo === "lead") {
        await tx
          .update(crmLeads)
          .set({ resumoIa: resposta.resumo, sugestaoIa: resposta.sugestoes, dataResumoIa: new Date() })
          .where(eq(crmLeads.id, id))
      }

      return criado
    })

    return NextResponse.json({ resumo: registro }, { status: 201 })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/ia/resumos", usuarioNome)
  }
}
