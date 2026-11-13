import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq, and, gte, lte } from "drizzle-orm"
import { sendEmail } from "@/lib/email"
export const dynamic = "force-dynamic"

const CRON_SECRET = process.env.CRON_SECRET

function autorizado(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization")
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true
  return false
}

function obterDataHojeBR(): string {
  const agora = new Date()
  return agora.toISOString().split("T")[0]
}

function obterDataAmanhaBR(): string {
  const agora = new Date()
  agora.setDate(agora.getDate() + 1)
  return agora.toISOString().split("T")[0]
}

function montarHtmlLembrete(
  tipo: "dia-anterior" | "dia-da-visita",
  visita: any,
  usuario: any
): string {
  const dataFormatada = new Date(visita.dataVisita + "T00:00:00").toLocaleDateString(
    "pt-BR"
  )
  const clienteOuPessoa =
    visita.clienteNome || visita.empresaNome || visita.nomeAvulso || "—"
  const endereco = [visita.endereco, visita.numero, visita.bairro, visita.cidade, visita.uf]
    .filter(Boolean)
    .join(", ") || "—"

  const isDiaAnterior = tipo === "dia-anterior"

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">
          ${isDiaAnterior ? "Lembrete de Visita — Amanhã" : "Lembrete de Visita — Hoje"}
        </h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Olá, <strong>${usuario?.name || "usuário"}</strong>. Você tem uma visita agendada${
            isDiaAnterior ? " para amanhã" : " para hoje"
          }.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; color: #334155;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 35%;">Data</td>
            <td style="padding: 8px 0;">${dataFormatada}</td>
          </tr>
          ${visita.hora ? `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Horário</td><td style="padding: 8px 0;">${visita.hora}</td></tr>` : ""}
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Tipo</td>
            <td style="padding: 8px 0;">${visita.tipo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Status</td>
            <td style="padding: 8px 0;">${visita.status}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Cliente / Pessoa</td>
            <td style="padding: 8px 0;">${clienteOuPessoa}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Endereço</td>
            <td style="padding: 8px 0;">${endereco}</td>
          </tr>
        </table>

        <p style="color: #64748b; font-size: 13px;">
          Este é um lembrete automático do sistema PDM Têxtil. Boa visita!
        </p>
      </div>
    </div>
  `
}

async function processarLembretes(tipo: "dia-anterior" | "dia-da-visita") {
  const hoje = obterDataHojeBR()
  const amanha = obterDataAmanhaBR()

  const dataAlvo = tipo === "dia-anterior" ? amanha : hoje
  const coluna =
    tipo === "dia-anterior"
      ? "lembrete_dia_anterior_enviado"
      : "lembrete_dia_visita_enviado"

  const visitas = await db
    .select({
      id: crmVisitas.id,
      dataVisita: crmVisitas.dataVisita,
      hora: crmVisitas.hora,
      tipo: crmVisitas.tipo,
      status: crmVisitas.status,
      endereco: crmVisitas.endereco,
      numero: crmVisitas.numero,
      complemento: crmVisitas.complemento,
      bairro: crmVisitas.bairro,
      cidade: crmVisitas.cidade,
      uf: crmVisitas.uf,
      clienteId: crmVisitas.clienteId,
      empresaId: crmVisitas.empresaId,
      nomeAvulso: crmVisitas.nomeAvulso,
      criadoPor: crmVisitas.criadoPor,
    })
    .from(crmVisitas)
    .where(
      and(
        eq(crmVisitas.dataVisita, dataAlvo),
        eq(crmVisitas.status, "AGENDADA"),
        eq(crmVisitas[coluna as keyof typeof crmVisitas], false)
      )
    )

  let enviados = 0
  let erros = 0

  for (const visita of visitas) {
    let usuario = null
    if (visita.criadoPor) {
      const [u] = await db
        .select({ email: usuarios.email, name: usuarios.name })
        .from(usuarios)
        .where(eq(usuarios.id, visita.criadoPor))
        .limit(1)
      usuario = u
    }

    if (!usuario?.email) {
      erros++
      continue
    }

    const assunto =
      tipo === "dia-anterior"
        ? `Lembrete: visita agendada para amanhã (${new Date(visita.dataVisita + "T00:00:00").toLocaleDateString("pt-BR")})`
        : `Lembrete: visita hoje (${new Date(visita.dataVisita + "T00:00:00").toLocaleDateString("pt-BR")})`

    const html = montarHtmlLembrete(tipo, visita, usuario)

    const resultado = await sendEmail({
      to: usuario.email,
      subject: assunto,
      html,
    })

    if (resultado.error) {
      erros++
      console.error(
        `[LEMBRETE-VISITA] Erro ao enviar para visita ${visita.id}:`,
        resultado.error
      )
    } else {
      enviados++
    }

    await db
      .update(crmVisitas)
      .set({ [coluna]: true })
      .where(eq(crmVisitas.id, visita.id))
  }

  return { total: visitas.length, enviados, erros }
}

export async function POST(req: NextRequest) {
  try {
    if (!autorizado(req)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tipo = (searchParams.get("tipo") || "dia-da-visita") as
      | "dia-anterior"
      | "dia-da-visita"

    if (tipo !== "dia-anterior" && tipo !== "dia-da-visita") {
      return NextResponse.json(
        { error: 'tipo deve ser "dia-anterior" ou "dia-da-visita"' },
        { status: 400 }
      )
    }

    const resultado = await processarLembretes(tipo)

    return NextResponse.json({
      ok: true,
      tipo,
      ...resultado,
    })
  } catch (error) {
    console.error("[POST /api/crm/visitas/lembretes]", error)
    return NextResponse.json(
      { error: "Erro interno ao processar lembretes" },
      { status: 500 }
    )
  }
}
