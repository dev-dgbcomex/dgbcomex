import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmWhatsappMensagens } from "@/lib/db/schema/crm-whatsapp"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { eq, desc, and, or, inArray } from "drizzle-orm"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { enviarMensagem, evolutionConfigurado } from "@/lib/evolution-api"
import { handleApiError } from "@/lib/api-error"
import { idsContatosDoCliente, idsPessoasDoCliente } from "@/lib/crm/cliente-relacionamentos"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get("empresaId")
    const clienteId = searchParams.get("clienteId")
    const remoteJid = searchParams.get("remoteJid")

    const conditions: any[] = []
    if (empresaId) conditions.push(eq(crmWhatsappMensagens.empresaId, Number(empresaId)))
    if (clienteId) {
      // Conversa do cliente: mensagens do proprio cliente + das pessoas do CRM
      // que viraram este cliente + dos contatos vinculados a ele.
      const cliente = Number(clienteId)
      const [pessoas, contatos] = await Promise.all([
        idsPessoasDoCliente(cliente),
        idsContatosDoCliente(cliente),
      ])
      const partes: any[] = [eq(crmWhatsappMensagens.clienteId, cliente)]
      if (pessoas.length > 0) partes.push(inArray(crmWhatsappMensagens.empresaId, pessoas))
      if (contatos.length > 0) partes.push(inArray(crmWhatsappMensagens.contatoId, contatos))
      conditions.push(or(...partes))
    }
    if (remoteJid) conditions.push(eq(crmWhatsappMensagens.remoteJid, remoteJid))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const lista = await db
      .select()
      .from(crmWhatsappMensagens)
      .where(where)
      .orderBy(desc(crmWhatsappMensagens.createdAt))
      .limit(50)

    return NextResponse.json(lista)
  } catch (error) {
    return handleApiError(error, "GET /api/crm/whatsapp")
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json()

    let remoteJid = body.remoteJid || null
    let contatoId = body.contatoId || null
    let empresaId = body.empresaId || null
    let clienteId = body.clienteId || null

    if (body.clienteId && !remoteJid) {
      // Cliente: usa o contato principal (ou o primeiro contato com WhatsApp).
      const contatos = await db
        .select()
        .from(crmContatos)
        .where(eq(crmContatos.clienteId, Number(body.clienteId)))
        .orderBy(crmContatos.principal)
        .limit(5)
        .then((r: any) => r || [])

      const contato =
        contatos.find((c: any) => c.principal && c.whatsapp) ||
        contatos.find((c: any) => c.whatsapp)

      if (contato?.whatsapp) {
        remoteJid = contato.whatsapp
        contatoId = contato.id
        empresaId = contato.empresaId || null
      }
    }

    if (!remoteJid && body.empresaId && evolutionConfigurado()) {
      const contato = await db
        .select()
        .from(crmContatos)
        .where(
          and(eq(crmContatos.empresaId, Number(body.empresaId)), eq(crmContatos.principal, true))
        )
        .limit(1)
        .then((r: any) => r[0] || null)

      if (contato?.whatsapp) {
        remoteJid = contato.whatsapp
        contatoId = contato.id
      }
    }

    const [nova] = await db
      .insert(crmWhatsappMensagens)
      .values({
        empresaId,
        clienteId,
        contatoId: contatoId,
        mensagem: body.mensagem,
        tipo: "ENVIADA",
        status: "ENVIADA",
        remoteJid: remoteJid,
        externalId: null,
      })
      .returning()

    let statusEnvio = "ENVIADA"

    if (remoteJid && evolutionConfigurado()) {
      const result = await enviarMensagem(remoteJid, body.mensagem)
      if (result.sucesso && result.externalId) {
        await db
          .update(crmWhatsappMensagens)
          .set({ externalId: result.externalId, status: "ENTREGUE" })
          .where(eq(crmWhatsappMensagens.id, nova.id))
        statusEnvio = "ENTREGUE"
      } else {
        console.warn("[Evolution] Falha ao enviar:", result.erro)
        await db
          .update(crmWhatsappMensagens)
          .set({ status: "ERRO" })
          .where(eq(crmWhatsappMensagens.id, nova.id))
        statusEnvio = "ERRO"
      }
    }

    if (nova.empresaId || nova.clienteId) {
      await inserirTimelineEvento({
        empresaId: nova.empresaId,
        clienteId: nova.clienteId,
        tipo: "WHATSAPP",
        descricao: `Mensagem ${statusEnvio === "ENTREGUE" ? "enviada" : "tentativa de envio"}: "${nova.mensagem.substring(0, 100)}"`,
        metadados: { whatsappId: nova.id, status: statusEnvio },
      })
    }

    return NextResponse.json({ ...nova, status: statusEnvio }, { status: 201 })
  } catch (error) {
    return handleApiError(error, "POST /api/crm/whatsapp")
  }
}
