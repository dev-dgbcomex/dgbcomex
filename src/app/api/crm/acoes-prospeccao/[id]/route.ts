import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmViagens } from "@/lib/db/schema/crm-viagens"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmAcoesProspeccaoPesquisas } from "@/lib/db/schema/crm-acoes-prospeccao-pesquisas"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq } from "drizzle-orm"
import { registrarLog, notificar, notificarDelecao } from "@/lib/notificar"
import { inserirTimelineEvento, excluirTimelineEventosEntidade } from "@/lib/crm-timeline"
import { handleApiError } from "@/lib/api-error"
import { podeGerenciarRegistro, podeGerenciarTudo } from "@/lib/permissoes"
import { sendCrmEmail } from "@/lib/email"
import { temEndereco, type EnderecoCampos } from "@/lib/crm/endereco"
import { geocodificarCamposEndereco } from "@/lib/crm/geocode"
import { propostaVinculadaAcaoProspeccaoVisivelPara } from "@/lib/campos-visiveis"
import crypto from "crypto"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const [acao] = await db
      .select({
        id: crmAcoesProspeccao.id,
        empresaId: crmAcoesProspeccao.empresaId,
        empresaNome: crmPessoas.razaoSocial,
        empresaEndereco: crmPessoas.endereco,
        empresaNumero: crmPessoas.numero,
        empresaComplemento: crmPessoas.complemento,
        empresaBairro: crmPessoas.bairro,
        empresaCidade: crmPessoas.cidade,
        empresaUf: crmPessoas.uf,
        empresaCep: crmPessoas.cep,
        clienteId: crmAcoesProspeccao.clienteId,
        clienteNome: clientes.nome,
        clienteEndereco: clientes.endereco,
        clienteCidade: clientes.cidade,
        clienteUf: clientes.uf,
        oportunidadeId: crmAcoesProspeccao.oportunidadeId,
        oportunidadeTitulo: crmOportunidades.titulo,
        contatoId: crmAcoesProspeccao.contatoId,
        contatoNome: crmContatos.nome,
        contatoEmail: crmContatos.email,
        viagemId: crmAcoesProspeccao.viagemId,
        viagemTitulo: crmViagens.titulo,
        representanteId: crmAcoesProspeccao.representanteId,
        representanteNome: crmAcoesProspeccao.representanteNome,
        propostaId: crmAcoesProspeccao.propostaId,
        propostaTitulo: crmPropostas.titulo,
        nomeAvulso: crmAcoesProspeccao.nomeAvulso,
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
        cep: crmAcoesProspeccao.cep,
        motivoCancelamento: crmAcoesProspeccao.motivoCancelamento,
        relato: crmAcoesProspeccao.relato,
        fotos: crmAcoesProspeccao.fotos,
        criadoPor: crmAcoesProspeccao.criadoPor,
        criadoPorNome: usuarios.name,
        duracaoEstimada: crmAcoesProspeccao.duracaoEstimada,
        googleEventId: crmAcoesProspeccao.googleEventId,
        checkInTime: crmAcoesProspeccao.checkInTime,
        checkOutTime: crmAcoesProspeccao.checkOutTime,
        checkInLat: crmAcoesProspeccao.checkInLat,
        checkInLng: crmAcoesProspeccao.checkInLng,
        checkOutLat: crmAcoesProspeccao.checkOutLat,
        checkOutLng: crmAcoesProspeccao.checkOutLng,
        createdAt: crmAcoesProspeccao.createdAt,
        updatedAt: crmAcoesProspeccao.updatedAt,
      })
      .from(crmAcoesProspeccao)
      .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
      .leftJoin(crmOportunidades, eq(crmAcoesProspeccao.oportunidadeId, crmOportunidades.id))
      .leftJoin(crmContatos, eq(crmAcoesProspeccao.contatoId, crmContatos.id))
      .leftJoin(crmViagens, eq(crmAcoesProspeccao.viagemId, crmViagens.id))
      .leftJoin(crmPropostas, eq(crmAcoesProspeccao.propostaId, crmPropostas.id))
      .leftJoin(usuarios, eq(crmAcoesProspeccao.criadoPor, usuarios.id))
      .where(eq(crmAcoesProspeccao.id, parseInt(id)))
      .limit(1)

    if (!acao) {
      return NextResponse.json({ error: "Ação de prospecção não encontrada" }, { status: 404 })
    }

    const propostaVisivel = await propostaVinculadaAcaoProspeccaoVisivelPara(
      auth.session.user?.role
    )
    if (!propostaVisivel) {
      const resposta: Record<string, unknown> = { ...acao }
      delete resposta.propostaId
      delete resposta.propostaTitulo
      return NextResponse.json(resposta)
    }

    return NextResponse.json(acao)
  } catch (error) {
    return handleApiError(error, "GET /api/crm/acoes-prospeccao/[id]")
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session

    const { id } = await params
    const body = await req.json()

    const [existente] = await db
      .select()
      .from(crmAcoesProspeccao)
      .where(eq(crmAcoesProspeccao.id, parseInt(id)))
      .limit(1)

    if (!existente) {
      return NextResponse.json({ error: "Ação de prospecção não encontrada" }, { status: 404 })
    }

    const userRole = auth.session.user?.role ?? ""
    if (!podeGerenciarRegistro(userRole, existente.criadoPor, auth.userId)) {
      return NextResponse.json({ error: "Sem permissão para editar" }, { status: 403 })
    }

    const propostaVisivel = await propostaVinculadaAcaoProspeccaoVisivelPara(userRole)

    const values: Record<string, any> = { updatedAt: new Date() }
    if (body.empresaId !== undefined) {
      values.empresaId = body.empresaId
      values.nomeAvulso = null
    }
    if (body.clienteId !== undefined) {
      values.clienteId = body.clienteId
      values.nomeAvulso = null
    }
    if (body.nomeAvulso !== undefined) values.nomeAvulso = body.nomeAvulso
    if (body.oportunidadeId !== undefined) values.oportunidadeId = body.oportunidadeId
    if (body.contatoId !== undefined) values.contatoId = body.contatoId
    if (body.viagemId !== undefined)
      values.viagemId = body.viagemId ? parseInt(body.viagemId) : null
    if (body.representanteId !== undefined)
      values.representanteId = body.representanteId ? parseInt(body.representanteId) : null
    if (body.representanteNome !== undefined)
      values.representanteNome = body.representanteNome || null
    if (propostaVisivel && body.propostaId !== undefined)
      values.propostaId = body.propostaId
        ? typeof body.propostaId === "number"
          ? body.propostaId
          : parseInt(body.propostaId)
        : null
    if (body.dataAcao !== undefined) values.dataAcao = body.dataAcao
    if (body.hora !== undefined) values.hora = body.hora || null
    if (body.tipo !== undefined) values.tipo = body.tipo
    if (body.status !== undefined) values.status = body.status
    if (body.motivoCancelamento !== undefined) values.motivoCancelamento = body.motivoCancelamento
    if (body.endereco !== undefined) values.endereco = body.endereco || null
    if (body.numero !== undefined) values.numero = body.numero || null
    if (body.complemento !== undefined) values.complemento = body.complemento || null
    if (body.bairro !== undefined) values.bairro = body.bairro || null
    if (body.cidade !== undefined) values.cidade = body.cidade || null
    if (body.uf !== undefined) values.uf = body.uf || null
    if (body.cep !== undefined) values.cep = body.cep || null
    if (body.relato !== undefined) values.relato = body.relato
    if (body.fotos !== undefined) values.fotos = body.fotos
    if (body.duracaoEstimada !== undefined) values.duracaoEstimada = body.duracaoEstimada

    const veioEndereco = ["endereco", "numero", "complemento", "bairro", "cidade", "uf"].some(
      (campo) => body[campo] !== undefined
    )
    if (veioEndereco) {
      const coordsEndereco = await buscarCoordenadasDaAcao(existente, body)
      values.enderecoLat = coordsEndereco?.latitude ?? null
      values.enderecoLng = coordsEndereco?.longitude ?? null
    }

    const [atualizada] = await db
      .update(crmAcoesProspeccao)
      .set(values)
      .where(eq(crmAcoesProspeccao.id, parseInt(id)))
      .returning()

    await registrarLog({
      tipo: "ATUALIZACAO",
      acao: "atualizar",
      descricao: `Ação de prospecção #${id} atualizada`,
      entidade: "CrmAcaoProspeccao",
      entidadeId: atualizada.id,
      usuarioNome: session.user.name,
    })

    if (body.status && body.status !== existente.status) {
      if (existente.empresaId) {
        await inserirTimelineEvento({
          empresaId: existente.empresaId,
          tipo: "ACAO_PROSPECCAO",
          descricao: `Ação de prospecção alterada para "${body.status}"${body.status === "REALIZADA" && body.relato ? " — relato registrado" : ""}${body.status === "CANCELADA" && body.motivoCancelamento ? ` — motivo: ${body.motivoCancelamento}` : ""}`,
          metadados: {
            acaoProspeccaoId: atualizada.id,
            statusAnterior: existente.status,
            statusNovo: body.status,
          },
        })
      }

      if (body.status === "REALIZADA") {
        enviarPesquisaSatisfacao(
          atualizada.id,
          existente.empresaId,
          existente.clienteId,
          atualizada.contatoId
        ).catch((err: any) => console.error("[AUTO SURVEY] Erro ao enviar pesquisa:", err.message))
      }
    }

    await notificar(
      "ACAO_PROSPECCAO_ATUALIZADA",
      `Ação de prospecção #${id} ${body.status ? `alterada para ${body.status}` : "atualizada"}`,
      `/comercial/crm/acoes-prospeccao/${atualizada.id}`,
      session.user.name
    )

    return NextResponse.json(atualizada)
  } catch (error) {
    return handleApiError(error, "PUT /api/crm/acoes-prospeccao/[id]")
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeGerenciarTudo(auth.session.user?.role)) {
      return NextResponse.json({ error: "Sem permissão para excluir" }, { status: 403 })
    }

    const { id } = await params
    const acaoId = parseInt(id)

    const [existente] = await db
      .select({
        criadoPor: crmAcoesProspeccao.criadoPor,
        googleEventId: crmAcoesProspeccao.googleEventId,
      })
      .from(crmAcoesProspeccao)
      .where(eq(crmAcoesProspeccao.id, acaoId))
      .limit(1)

    if (existente?.googleEventId) {
      try {
        const accessToken = (auth.session.user as any).accessToken
        if (accessToken) {
          const { deleteCalendarEvent } = await import("@/lib/google-calendar")
          await deleteCalendarEvent(accessToken, existente.googleEventId)
        }
      } catch {}
    }

    await db.transaction(async (tx: any) => {
      await excluirTimelineEventosEntidade(
        { tipo: "ACAO_PROSPECCAO", campo: "acaoProspeccaoId", id: acaoId },
        tx
      )
      await tx.delete(crmAcoesProspeccao).where(eq(crmAcoesProspeccao.id, acaoId))
    })

    await notificarDelecao("Ação de Prospecção CRM", id, auth.session.user.name)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/crm/acoes-prospeccao/[id]")
  }
}

async function buscarCoordenadasDaAcao(
  existente: Record<string, any>,
  body: Record<string, any>
): Promise<{ latitude: number; longitude: number } | null> {
  const efetivo: EnderecoCampos = {
    endereco: body.endereco !== undefined ? body.endereco : existente.endereco,
    numero: body.numero !== undefined ? body.numero : existente.numero,
    complemento: body.complemento !== undefined ? body.complemento : existente.complemento,
    bairro: body.bairro !== undefined ? body.bairro : existente.bairro,
    cidade: body.cidade !== undefined ? body.cidade : existente.cidade,
    uf: body.uf !== undefined ? body.uf : existente.uf,
  }

  let campos: EnderecoCampos | null = temEndereco(efetivo) ? efetivo : null

  if (!campos && existente.empresaId) {
    const [pessoa] = await db
      .select({
        endereco: crmPessoas.endereco,
        numero: crmPessoas.numero,
        complemento: crmPessoas.complemento,
        bairro: crmPessoas.bairro,
        cidade: crmPessoas.cidade,
        uf: crmPessoas.uf,
      })
      .from(crmPessoas)
      .where(eq(crmPessoas.id, existente.empresaId))
      .limit(1)
    if (temEndereco(pessoa || {})) campos = pessoa as EnderecoCampos
  }

  if (!campos && existente.clienteId) {
    const [cliente] = await db
      .select({ endereco: clientes.endereco, cidade: clientes.cidade, uf: clientes.uf })
      .from(clientes)
      .where(eq(clientes.id, existente.clienteId))
      .limit(1)
    if (temEndereco(cliente || {})) campos = cliente as EnderecoCampos
  }

  if (!campos) return null
  return geocodificarCamposEndereco(campos)
}

async function enviarPesquisaSatisfacao(
  acaoId: number,
  empresaId: number | null,
  clienteId: number | null,
  contatoId: number | null
) {
  try {
    const destinatarios: string[] = []
    const nomes: string[] = []

    if (empresaId) {
      const [pessoa] = await db
        .select({
          email: crmPessoas.email,
          nome: crmPessoas.razaoSocial,
          nomeFantasia: crmPessoas.nomeFantasia,
        })
        .from(crmPessoas)
        .where(eq(crmPessoas.id, empresaId))
        .limit(1)
      if (pessoa?.email && pessoa.email.includes("@")) {
        destinatarios.push(pessoa.email)
        nomes.push(pessoa.nomeFantasia || pessoa.nome || "Cliente")
      }
    }

    if (clienteId) {
      const [cliente] = await db
        .select({ email: clientes.email, nome: clientes.nome })
        .from(clientes)
        .where(eq(clientes.id, clienteId))
        .limit(1)
      if (cliente?.email && cliente.email.includes("@")) {
        destinatarios.push(cliente.email)
        nomes.push(cliente.nome || "Cliente")
      }
    }

    if (contatoId) {
      const [contato] = await db
        .select({ email: crmContatos.email, nome: crmContatos.nome })
        .from(crmContatos)
        .where(eq(crmContatos.id, contatoId))
        .limit(1)
      if (contato?.email && contato.email.includes("@") && !destinatarios.includes(contato.email)) {
        destinatarios.push(contato.email)
        nomes.push(contato.nome || "Contato")
      }
    }

    if (destinatarios.length === 0) return

    const [acao] = await db
      .select({ dataAcao: crmAcoesProspeccao.dataAcao })
      .from(crmAcoesProspeccao)
      .where(eq(crmAcoesProspeccao.id, acaoId))
      .limit(1)

    const token = crypto.randomBytes(32).toString("hex")
    const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/comercial/crm/pesquisa/${token}`

    await db.insert(crmAcoesProspeccaoPesquisas).values({
      acaoId,
      email: destinatarios[0],
      nome: nomes[0],
      token,
      enviadoEm: new Date(),
      status: "ENVIADO",
    })

    const dataAcaoFormatada = acao?.dataAcao
      ? new Date(acao.dataAcao + "T12:00:00").toLocaleDateString("pt-BR")
      : "data recente"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #073fb8; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Pesquisa de Satisfação</h1>
          <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">PDM PRO TEXTIL</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 14px; color: #334155; margin: 0 0 15px;">
            Olá ${nomes[0]},
          </p>
          <p style="font-size: 14px; color: #334155; margin: 0 0 15px;">
            Agradecemos pela ação de prospecção realizada em ${dataAcaoFormatada}.
          </p>
          <p style="font-size: 14px; color: #334155; margin: 0 0 20px;">
            Sua opinião é muito importante para nós! Por favor, responda nossa pesquisa de satisfação.
          </p>
          <a href="${surveyUrl}" style="display: inline-block; background: #073fb8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">
            Responder Pesquisa
          </a>
          <p style="font-size: 12px; color: #94a3b8; margin: 20px 0 0;">
            Se o botão não funcionar, copie e cole o link no navegador:<br/>
            <a href="${surveyUrl}" style="color: #073fb8;">${surveyUrl}</a>
          </p>
        </div>
      </div>
    `

    await sendCrmEmail({
      to: destinatarios,
      subject: "Pesquisa de Satisfação - PDM PRO TEXTIL",
      html,
    })
  } catch (err: any) {
    console.error("[AUTO SURVEY] Erro:", err.message)
  }
}
