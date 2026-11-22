import { NextRequest, NextResponse } from "next/server"
import { and, count, eq, notInArray } from "drizzle-orm"
import { z } from "zod"
import { handleApiError } from "@/lib/api-error"
import { requireAuth } from "@/lib/auth"
import { processarAutomacaoCRM, type DecisaoAutomacao } from "@/lib/crm/automacoes-crm"
import { clienteIdDaPessoa } from "@/lib/crm/cliente-relacionamentos"
import { db } from "@/lib/db"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { registrarLog, notificar } from "@/lib/notificar"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { carregarItensTemperatura } from "@/lib/crm/temperatura-server"
import { planoDaTransicao } from "@/lib/crm/temperatura"
import { validateRequest } from "@/lib/validation"

export const dynamic = "force-dynamic"

const moverSchema = z.object({
  id: z.string().min(1),
  destino: z.enum(["QUENTE", "MORNO", "FRIO"]),
  escolhas: z
    .object({
      oportunidadeId: z.union([z.number().int().positive(), z.literal("nova")]).optional(),
      oportunidadesParaBaixarIds: z.array(z.number().int().positive()).optional(),
      oportunidadesParaPerderIds: z.array(z.number().int().positive()).optional(),
      motivoPerda: z.string().trim().max(500).optional(),
    })
    .default({}),
  decisao: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const validado = validateRequest(moverSchema, await req.json())
    if ("error" in validado) return validado.error

    const { id, destino, escolhas, decisao } = validado.data
    const { itens } = await carregarItensTemperatura()
    const item = itens.find((candidato) => candidato.id === id)

    if (!item) {
      return NextResponse.json({ error: "Lead ou cliente não encontrado." }, { status: 404 })
    }

    const resultadoPlano = planoDaTransicao(item, destino, escolhas)
    if (!resultadoPlano.ok) {
      return NextResponse.json({ error: resultadoPlano.erro }, { status: 422 })
    }

    const { plano } = resultadoPlano
    if (plano.acoes.length === 0) {
      const atualizado = (await carregarItensTemperatura()).itens.find(
        (candidato) => candidato.id === id
      )
      return NextResponse.json({
        ok: true,
        item: atualizado,
        avisos: plano.avisos,
        acoes: 0,
      })
    }

    const perdas = plano.acoes.filter((acao) => acao.tipo === "PERDER_OPORTUNIDADE")
    const idsPerdidos = perdas.map((acao) =>
      acao.tipo === "PERDER_OPORTUNIDADE" ? acao.oportunidadeId : 0
    )

    if (!decisao && idsPerdidos.length > 0) {
      for (const oportunidadeId of idsPerdidos) {
        const [oportunidade] = await db
          .select()
          .from(crmOportunidades)
          .where(eq(crmOportunidades.id, oportunidadeId))
          .limit(1)
        if (!oportunidade?.empresaId) continue

        const [lead] = await db
          .select()
          .from(crmLeads)
          .where(eq(crmLeads.id, oportunidade.empresaId))
          .limit(1)
        if (!lead || lead.promovidaCliente || lead.arquivado) continue

        const filtros = [eq(crmOportunidades.empresaId, lead.id)]
        if (idsPerdidos.length > 0) filtros.push(notInArray(crmOportunidades.id, idsPerdidos))
        const [totais] = await db
          .select({ total: count() })
          .from(crmOportunidades)
          .where(and(...filtros))

        if (Number(totais?.total ?? 0) === 0) {
          return NextResponse.json(
            {
              error: `Esta é a última oportunidade da lead ${lead.nome || lead.razaoSocial || "sem nome"}. O que deseja fazer?`,
              decisaoPendente: {
                codigo: "PERDA_ULTIMA_OPORTUNIDADE",
                mensagem: `Esta é a última oportunidade da lead ${lead.nome || lead.razaoSocial || "sem nome"}. O que deseja fazer?`,
                opcoes: [
                  {
                    valor: "PERDER_LEAD",
                    rotulo: "Perder a lead",
                    descricao: "A lead ficará com status Perdido e continuará visível para consulta.",
                  },
                  {
                    valor: "NOVA_OPORTUNIDADE",
                    rotulo: "Manter Qualificado",
                    descricao: "O sistema cria uma nova oportunidade e mantém a lead qualificada.",
                  },
                ],
                contexto: { leadId: lead.id, oportunidadeId },
              },
            },
            { status: 409 }
          )
        }
      }
    }

    const autor = { id: auth.userId, nome: auth.session.user.name ?? undefined }
    const resultados: unknown[] = []

    for (const acao of plano.acoes) {
      if (acao.tipo === "CRIAR_OPORTUNIDADE") {
        const empresaId = item.tipo === "lead" ? item.entidadeId : null
        const clienteId = item.tipo === "cliente" ? item.entidadeId : await clienteIdDaPessoa(item.entidadeId)
        const [nova] = await db
          .insert(crmOportunidades)
          .values({
            titulo: acao.titulo,
            status: acao.status,
            empresaId,
            clienteId: clienteId || null,
            responsavelId: auth.userId,
            probabilidade: acao.status === "NEGOCIACAO" ? 70 : 30,
          })
          .returning()

        const automacao = await processarAutomacaoCRM({
          entidade: "OPORTUNIDADE",
          entidadeId: nova.id,
          acao: "CRIAR",
          statusNovo: acao.status,
          autor,
          origem: "API",
          contexto: { empresaId: nova.empresaId, clienteId: nova.clienteId },
        })

        await registrarLog({
          tipo: "CADASTRO",
          acao: "criar",
          descricao: `Oportunidade criada pelo kanban de temperatura: ${nova.titulo}`,
          entidade: "CrmOportunidade",
          entidadeId: nova.id,
          usuarioNome: autor.nome,
        })
        await inserirTimelineEvento({
          empresaId: nova.empresaId,
          clienteId: nova.clienteId,
          tipo: "OPORTUNIDADE",
          descricao: `Oportunidade "${nova.titulo}" criada pelo kanban de temperatura`,
          metadados: { oportunidadeId: nova.id },
        })
        await notificar(
          "OPORTUNIDADE_CRIADA",
          `Oportunidade criada: ${nova.titulo}`,
          `/comercial/crm/oportunidades/${nova.id}`,
          autor.nome
        )
        await notificarAtividadeComercial({
          acao: "criou a oportunidade",
          entidade: "Oportunidade",
          registro: nova.titulo,
          link: `/comercial/crm/oportunidades/${nova.id}`,
          usuarioNome: autor.nome,
          usuarioId: auth.userId,
        })
        resultados.push(automacao)
        continue
      }

      const automacao = await processarAutomacaoCRM({
        entidade: "OPORTUNIDADE",
        entidadeId: acao.oportunidadeId,
        acao: "ALTERAR_STATUS",
        statusNovo: acao.tipo === "PERDER_OPORTUNIDADE" ? "FECHADO_PERDIDO" : acao.status,
        motivoPerda: acao.tipo === "PERDER_OPORTUNIDADE" ? acao.motivoPerda : undefined,
        decisao: decisao as DecisaoAutomacao | undefined,
        autor,
        origem: "API",
      })

      if (!automacao.ok) {
        return NextResponse.json(
          {
            error: automacao.bloqueio || automacao.decisaoPendente?.mensagem || "Operação bloqueada",
            decisaoPendente: automacao.decisaoPendente,
            parcial: true,
          },
          { status: automacao.decisaoPendente ? 409 : 400 }
        )
      }

      resultados.push(automacao)
    }

    const atual = await carregarItensTemperatura()
    const itemAtualizado = atual.itens.find((candidato) => candidato.id === id)

    return NextResponse.json({
      ok: true,
      item: itemAtualizado,
      contagem: atual.contagem,
      acoes: plano.acoes.length,
      avisos: plano.avisos,
      automacoes: resultados,
    })
  } catch (error) {
    return handleApiError(error, "mover card de temperatura")
  }
}
