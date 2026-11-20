import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { eq, sql } from "drizzle-orm"
import { crmVisitantes } from "@/lib/db/schema/crm-visitantes"
import { crmWhatsappMensagens } from "@/lib/db/schema/crm-whatsapp"
import { crmWhatsappConversas } from "@/lib/db/schema/crm-whatsapp-conversas"

function extrairNumero(remoteJid: string): string {
  return remoteJid.replace(/@s\.whatsapp\.net$/, "").replace(/\D/g, "")
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const remoteJid = req.nextUrl.searchParams.get("remoteJid")
    if (!remoteJid) {
      return NextResponse.json({ error: "remoteJid obrigatório" }, { status: 400 })
    }

    let conversa = await db
      .select()
      .from(crmWhatsappConversas)
      .where(eq(crmWhatsappConversas.remoteJid, remoteJid))
      .limit(1)
      .then((r: any) => r[0] || null)

    if (!conversa) {
      const numero = extrairNumero(remoteJid)

      const leadExistente = await db
        .select({
          id: crmVisitantes.id,
          nome: crmVisitantes.nome,
          celular: crmVisitantes.celular,
          empresaNome: crmVisitantes.empresaNome,
          tipoPessoa: crmVisitantes.tipoPessoa,
          status: crmVisitantes.status,
        })
        .from(crmVisitantes)
        .where(
          sql`(${eq(crmVisitantes.idIntegracao, `whatsapp:${remoteJid}`)} OR ${eq(crmVisitantes.celular, numero)}) AND ${crmVisitantes.status} != 'CONVERTIDO'`
        )
        .limit(1)
        .then((r: any) => r[0] || null)

      if (leadExistente) {
        const dados: Record<string, any> = {}
        if (leadExistente.empresaNome) dados.razaoSocial = leadExistente.empresaNome
        if (leadExistente.nome) dados.nomeContato = leadExistente.nome
        if (leadExistente.tipoPessoa) dados.tipoPessoa = leadExistente.tipoPessoa

        const estado = "AGUARDANDO_REPRESENTANTE"

        const [nova] = await db
          .insert(crmWhatsappConversas)
          .values({ remoteJid, estado, dados })
          .returning()
        return NextResponse.json({ ...nova, isNew: false })
      }

      const [nova] = await db
        .insert(crmWhatsappConversas)
        .values({ remoteJid, estado: "SAUDACAO", dados: {} })
        .returning()
      return NextResponse.json({ ...nova, isNew: true })
    }

    return NextResponse.json({ ...conversa, isNew: false })
  } catch (error) {
    console.error("[GET /api/crm/whatsapp/conversa]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { remoteJid, estado, dados, msg, resposta, pushName } = await req.json()

    if (!remoteJid) {
      return NextResponse.json({ error: "remoteJid obrigatório" }, { status: 400 })
    }

    const [atualizada] = await db
      .insert(crmWhatsappConversas)
      .values({ remoteJid, estado: estado || "SAUDACAO", dados: dados || {} })
      .onConflictDoUpdate({
        target: crmWhatsappConversas.remoteJid,
        set: { estado: sql`EXCLUDED.estado`, dados: sql`EXCLUDED.dados`, updatedAt: sql`NOW()` },
      })
      .returning()

    // Save user message to crmWhatsappMensagens
    if (msg && msg.trim()) {
      await db.insert(crmWhatsappMensagens).values({
        mensagem: msg,
        tipo: "RECEBIDA",
        status: "RECEBIDA",
        remoteJid,
      })
    }

    // Save AI response to crmWhatsappMensagens
    if (resposta && resposta.trim()) {
      await db.insert(crmWhatsappMensagens).values({
        mensagem: resposta,
        tipo: "ENVIADA",
        status: "ENVIADA",
        remoteJid,
      })
    }

    let lead = null
    if ((estado === "CONFIRMACAO" || estado === "ENCERRADO") && dados?.nome) {
      const existing = await db
        .select({ id: crmVisitantes.id })
        .from(crmVisitantes)
        .where(eq(crmVisitantes.idIntegracao, `whatsapp:${remoteJid}`))
        .limit(1)
        .then((r: any) => r[0] || null)

      if (!existing) {
        const numero = extrairNumero(remoteJid)
        const descricaoParts: string[] = []
        if (dados.documento) descricaoParts.push(`Documento: ${dados.documento}`)
        if (dados.tipoPessoa) descricaoParts.push(`Tipo: ${dados.tipoPessoa}`)
        if (dados.finalizado) descricaoParts.push("Lead finalizado via WhatsApp")

        const [novo] = await db
          .insert(crmVisitantes)
          .values({
            nome: dados.nome,
            celular: numero,
            documento: dados.documento || null,
            tipoPessoa: dados.tipoPessoa || null,
            origem: "WHATSAPP",
            descricao: descricaoParts.length > 0 ? descricaoParts.join(" | ") : null,
            idIntegracao: `whatsapp:${remoteJid}`,
          })
          .returning()

        lead = novo
      }
    }

    return NextResponse.json({ ...atualizada, lead })
  } catch (error) {
    console.error("[POST /api/crm/whatsapp/conversa]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
