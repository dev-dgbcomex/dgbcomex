import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmAcoesProspeccaoPesquisas } from "@/lib/db/schema/crm-acoes-prospeccao-pesquisas"
import { crmAcoesProspeccaoPesquisasRespostas } from "@/lib/db/schema/crm-acoes-prospeccao-pesquisas-respostas"
import { crmPesquisasRespostas } from "@/lib/db/schema/crm-pesquisas-respostas"
import { crmPesquisasSatisfacao } from "@/lib/db/schema/crm-pesquisas-satisfacao"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { handleApiError } from "@/lib/api-error"
import { validateRequest } from "@/lib/validation"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

const respostasSchema = z.object({
  respostas: z
    .array(
      z.object({
        pergunta: z.string().trim().min(1, "Pergunta obrigatória").max(200),
        tipo: z.string().trim().max(20).optional(),
        resposta: z.string().nullable().optional(),
      })
    )
    .min(1, "Respostas obrigatórias"),
})

type DadosPesquisa = {
  id: number
  email: string
  nome: string | null
  status: string
  enviadoEm: Date | null
  abertoEm: Date | null
  respondidoEm: Date | null
  createdAt: Date | null
}

type VinculoPesquisa = {
  origem: "acao" | "visita"
  visitaId?: number | null
  acaoId?: number | null
  dataVisita?: string | null
  dataAcao?: string | null
}

function serializarPesquisa(pesquisa: DadosPesquisa, vinculo: VinculoPesquisa) {
  return {
    id: pesquisa.id,
    email: pesquisa.email,
    nome: pesquisa.nome,
    status: pesquisa.status,
    enviadoEm: pesquisa.enviadoEm,
    abertoEm: pesquisa.abertoEm,
    respondidoEm: pesquisa.respondidoEm,
    createdAt: pesquisa.createdAt,
    empresaNome: null,
    origem: vinculo.origem,
    visitaId: vinculo.visitaId ?? null,
    acaoId: vinculo.acaoId ?? null,
    dataVisita: vinculo.dataVisita ?? null,
    dataAcao: vinculo.dataAcao ?? null,
  }
}

function statusAceito(status: string) {
  return status === "ENVIADO" || status === "ABERTO"
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    const [pesquisaAcao] = await db
      .select()
      .from(crmAcoesProspeccaoPesquisas)
      .where(eq(crmAcoesProspeccaoPesquisas.token, token))
      .limit(1)

    if (pesquisaAcao) {
      const resposta = serializarPesquisa(pesquisaAcao, {
        origem: "acao",
        acaoId: pesquisaAcao.acaoId,
      })

      if (pesquisaAcao.status === "RESPONDIDO") {
        return NextResponse.json({ ...resposta, alreadyAnswered: true })
      }

      if (!statusAceito(pesquisaAcao.status)) {
        return NextResponse.json({ error: "Pesquisa inválida" }, { status: 400 })
      }

      if (pesquisaAcao.status === "ENVIADO") {
        await db
          .update(crmAcoesProspeccaoPesquisas)
          .set({ abertoEm: new Date(), status: "ABERTO" })
          .where(eq(crmAcoesProspeccaoPesquisas.id, pesquisaAcao.id))
      }

      const [acao] = await db
        .select()
        .from(crmAcoesProspeccao)
        .where(eq(crmAcoesProspeccao.id, pesquisaAcao.acaoId))
        .limit(1)

      return NextResponse.json({
        ...resposta,
        dataAcao: acao?.dataAcao ?? null,
      })
    }

    const [pesquisa] = await db
      .select()
      .from(crmPesquisasSatisfacao)
      .where(eq(crmPesquisasSatisfacao.token, token))
      .limit(1)

    if (!pesquisa) {
      return NextResponse.json({ error: "Pesquisa não encontrada" }, { status: 404 })
    }

    const resposta = serializarPesquisa(pesquisa, {
      origem: "visita",
      visitaId: pesquisa.visitaId,
    })

    if (pesquisa.status === "RESPONDIDO") {
      return NextResponse.json({ ...resposta, alreadyAnswered: true })
    }

    if (!statusAceito(pesquisa.status)) {
      return NextResponse.json({ error: "Pesquisa inválida" }, { status: 400 })
    }

    if (pesquisa.status === "ENVIADO") {
      await db
        .update(crmPesquisasSatisfacao)
        .set({ abertoEm: new Date(), status: "ABERTO" })
        .where(eq(crmPesquisasSatisfacao.id, pesquisa.id))
    }

    const [visita] = await db
      .select()
      .from(crmVisitas)
      .where(eq(crmVisitas.id, pesquisa.visitaId))
      .limit(1)

    return NextResponse.json({
      ...resposta,
      dataVisita: visita?.dataVisita ?? null,
    })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/pesquisa/[token]")
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json()
    const parsed = validateRequest(respostasSchema, body)
    if ("error" in parsed) return parsed.error
    const { respostas } = parsed.data

    const valores = respostas.map((resposta) => ({
      pergunta: resposta.pergunta,
      tipo: resposta.tipo || "ALTERNATIVA",
      resposta: resposta.resposta ?? null,
    }))

    const [pesquisaAcao] = await db
      .select()
      .from(crmAcoesProspeccaoPesquisas)
      .where(eq(crmAcoesProspeccaoPesquisas.token, token))
      .limit(1)

    if (pesquisaAcao) {
      if (pesquisaAcao.status === "RESPONDIDO") {
        return NextResponse.json({ error: "Pesquisa já respondida" }, { status: 400 })
      }

      if (!statusAceito(pesquisaAcao.status)) {
        return NextResponse.json({ error: "Pesquisa inválida" }, { status: 400 })
      }

      await db.insert(crmAcoesProspeccaoPesquisasRespostas).values(
        valores.map((resposta) => ({ ...resposta, pesquisaId: pesquisaAcao.id }))
      )

      await db
        .update(crmAcoesProspeccaoPesquisas)
        .set({ respondidoEm: new Date(), status: "RESPONDIDO" })
        .where(eq(crmAcoesProspeccaoPesquisas.id, pesquisaAcao.id))

      return NextResponse.json({ success: true })
    }

    const [pesquisa] = await db
      .select()
      .from(crmPesquisasSatisfacao)
      .where(eq(crmPesquisasSatisfacao.token, token))
      .limit(1)

    if (!pesquisa) {
      return NextResponse.json({ error: "Pesquisa não encontrada" }, { status: 404 })
    }

    if (pesquisa.status === "RESPONDIDO") {
      return NextResponse.json({ error: "Pesquisa já respondida" }, { status: 400 })
    }

    if (!statusAceito(pesquisa.status)) {
      return NextResponse.json({ error: "Pesquisa inválida" }, { status: 400 })
    }

    await db.insert(crmPesquisasRespostas).values(
      valores.map((resposta) => ({ ...resposta, pesquisaId: pesquisa.id }))
    )

    await db
      .update(crmPesquisasSatisfacao)
      .set({ respondidoEm: new Date(), status: "RESPONDIDO" })
      .where(eq(crmPesquisasSatisfacao.id, pesquisa.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/pesquisa/[token]")
  }
}
