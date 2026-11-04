import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { eq } from "drizzle-orm"
import { registrarLog, notificar } from "@/lib/notificar"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { executarGatilhos, vincularEmpresaComoCliente } from "@/lib/crm/status-gatilhos"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session

    const { id } = await params
    const { status, motivoPerda } = await req.json()

    const [existente] = await db
      .select()
      .from(crmOportunidades)
      .where(eq(crmOportunidades.id, parseInt(id)))
      .limit(1)

    if (!existente) {
      return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 })
    }

    if (status === "FECHADO_PERDIDO" && !motivoPerda) {
      return NextResponse.json({ error: "Motivo da perda é obrigatório" }, { status: 400 })
    }

    const values: Record<string, any> = { status, updatedAt: new Date() }
    if (motivoPerda) values.motivoPerda = motivoPerda

    const [atualizada] = await db
      .update(crmOportunidades)
      .set(values)
      .where(eq(crmOportunidades.id, parseInt(id)))
      .returning()

    await registrarLog({
      tipo: "ATUALIZACAO",
      acao: "mover",
      descricao: `Oportunidade "${existente.titulo}" movida para ${status}`,
      entidade: "CrmOportunidade",
      entidadeId: atualizada.id,
      usuarioNome: session.user.name,
    })

    if (existente.empresaId) {
      await inserirTimelineEvento({
        empresaId: existente.empresaId,
        tipo: "OPORTUNIDADE",
        descricao: `Oportunidade "${existente.titulo}" ${status === "FECHADO_GANHO" ? "GANHA" : status === "FECHADO_PERDIDO" ? "PERDIDA" : `movida para ${status}`}`,
        metadados: {
          oportunidadeId: atualizada.id,
          statusAnterior: existente.status,
          statusNovo: status,
          motivoPerda,
        },
      })

      if (status === "FECHADO_GANHO") {
        await vincularEmpresaComoCliente(existente.empresaId)

        await inserirTimelineEvento({
          empresaId: existente.empresaId,
          tipo: "OPORTUNIDADE",
          descricao: `Empresa vinculada ao cadastro de Clientes PDM`,
          metadados: { oportunidadeId: atualizada.id },
        })
      }
    }

    const gatilhos = await executarGatilhos({
      tipo: "OPORTUNIDADE",
      statusNome: status,
      statusAnterior: existente.status,
      oportunidadeId: atualizada.id,
      empresaId: existente.empresaId,
      responsavelId: existente.responsavelId,
      titulo: existente.titulo,
      usuarioNome: session.user.name,
    })

    await notificar(
      "OPORTUNIDADE_STATUS",
      `Oportunidade "${existente.titulo}" movida para ${status}`,
      `/comercial/crm/oportunidades/${atualizada.id}`,
      session.user.name
    )

    await notificarAtividadeComercial({
      acao: `moveu a oportunidade para ${status}`,
      entidade: "Oportunidade",
      registro: existente.titulo,
      link: `/comercial/crm/oportunidades/${atualizada.id}`,
      usuarioNome: session.user.name,
      usuarioId: auth.userId,
    })

    return NextResponse.json({ ...atualizada, gatilhos })
  } catch (error) {
    console.error("[PATCH /api/crm/oportunidades/[id]/status]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
