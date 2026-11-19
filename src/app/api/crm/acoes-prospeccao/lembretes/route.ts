import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq, and } from "drizzle-orm"
import { sendEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

const CRON_SECRET = process.env.CRON_SECRET

async function autorizado(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization")
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true
  const auth = await requireAuth()
  return !(auth instanceof NextResponse)
}

function obterDataHojeBR(): string {
  return new Date().toISOString().split("T")[0]
}

function obterDataAmanhaBR(): string {
  const agora = new Date()
  agora.setDate(agora.getDate() + 1)
  return agora.toISOString().split("T")[0]
}

function montarHtmlLembrete(
  tipo: "dia-anterior" | "dia-da-acao",
  acao: any,
  usuario: any
): string {
  const dataFormatada = new Date(acao.dataAcao + "T00:00:00").toLocaleDateString("pt-BR")
  const clienteOuPessoa =
    acao.clienteNome || acao.empresaNome || acao.nomeAvulso || "-"
  const endereco =
    [acao.endereco, acao.numero, acao.bairro, acao.cidade, acao.uf].filter(Boolean).join(", ") ||
    "-"

  const isDiaAnterior = tipo === "dia-anterior"

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">
          ${isDiaAnterior ? "Lembrete de Ação de Prospecção - Amanhã" : "Lembrete de Ação de Prospecção - Hoje"}
        </h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Olá, <strong>${usuario?.name || "usuário"}</strong>. Você tem uma ação de prospecção agendada${isDiaAnterior ? " para amanhã" : " para hoje"}.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; color: #334155;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 35%;">Data</td>
            <td style="padding: 8px 0;">${dataFormatada}</td>
          </tr>
          ${acao.hora ? `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Horário</td><td style="padding: 8px 0;">${acao.hora}</td></tr>` : ""}
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Tipo</td>
            <td style="padding: 8px 0;">${acao.tipo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Status</td>
            <td style="padding: 8px 0;">${acao.status}</td>
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
          Este é um lembrete automático do sistema PDM Têxtil. Boa ação de prospecção!
        </p>
      </div>
    </div>
  `
}

async function processarLembretes(tipo: "dia-anterior" | "dia-da-acao") {
  const hoje = obterDataHojeBR()
  const amanha = obterDataAmanhaBR()

  const dataAlvo = tipo === "dia-anterior" ? amanha : hoje
  const colunaFlag =
    tipo === "dia-anterior"
      ? crmAcoesProspeccao.lembreteDiaAnteriorEnviado
      : crmAcoesProspeccao.lembreteDiaAcaoEnviado

  const acoes = await db
    .select({
      id: crmAcoesProspeccao.id,
      dataAcao: crmAcoesProspeccao.dataAcao,
      hora: crmAcoesProspeccao.hora,
      tipo: crmAcoesProspeccao.tipo,
      status: crmAcoesProspeccao.status,
      endereco: crmAcoesProspeccao.endereco,
      numero: crmAcoesProspeccao.numero,
      complemento: crmAcoesProspeccao.complemento,
      bairro: crmAcoesProspeccao.bairro,
      cidade: crmAcoesProspeccao.cidade,
      uf: crmAcoesProspeccao.uf,
      clienteId: crmAcoesProspeccao.clienteId,
      empresaId: crmAcoesProspeccao.empresaId,
      nomeAvulso: crmAcoesProspeccao.nomeAvulso,
      criadoPor: crmAcoesProspeccao.criadoPor,
    })
    .from(crmAcoesProspeccao)
    .where(
      and(
        eq(crmAcoesProspeccao.dataAcao, dataAlvo),
        eq(crmAcoesProspeccao.status, "AGENDADA"),
        eq(colunaFlag, false)
      )
    )

  let enviados = 0
  let erros = 0

  for (const acao of acoes) {
    let usuario = null
    if (acao.criadoPor) {
      const [u] = await db
        .select({ email: usuarios.email, name: usuarios.name })
        .from(usuarios)
        .where(eq(usuarios.id, acao.criadoPor))
        .limit(1)
      usuario = u
    }

    if (!usuario?.email) {
      erros++
      continue
    }

    const assunto =
      tipo === "dia-anterior"
        ? `Lembrete: ação de prospecção agendada para amanhã (${new Date(acao.dataAcao + "T00:00:00").toLocaleDateString("pt-BR")})`
        : `Lembrete: ação de prospecção hoje (${new Date(acao.dataAcao + "T00:00:00").toLocaleDateString("pt-BR")})`

    const html = montarHtmlLembrete(tipo, acao, usuario)

    const resultado = await sendEmail({
      to: usuario.email,
      subject: assunto,
      html,
    })

    if (resultado.error) {
      erros++
      console.error(
        `[LEMBRETE-ACAO-PROSPECCAO] Erro ao enviar para ação ${acao.id}:`,
        resultado.error
      )
    } else {
      enviados++
    }

    await db
      .update(crmAcoesProspeccao)
      .set(tipo === "dia-anterior" ? { lembreteDiaAnteriorEnviado: true } : { lembreteDiaAcaoEnviado: true })
      .where(eq(crmAcoesProspeccao.id, acao.id))
  }

  return { total: acoes.length, enviados, erros }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await autorizado(req))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tipo = (searchParams.get("tipo") || "dia-da-acao") as
      | "dia-anterior"
      | "dia-da-acao"

    if (tipo !== "dia-anterior" && tipo !== "dia-da-acao") {
      return NextResponse.json(
        { error: 'tipo deve ser "dia-anterior" ou "dia-da-acao"' },
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
    console.error("[POST /api/crm/acoes-prospeccao/lembretes]", error)
    return NextResponse.json(
      { error: "Erro interno ao processar lembretes" },
      { status: 500 }
    )
  }
}
