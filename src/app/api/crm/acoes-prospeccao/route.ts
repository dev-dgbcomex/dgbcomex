import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmViagens } from "@/lib/db/schema/crm-viagens"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq, desc, like, or, and, count, gte, lte, inArray } from "drizzle-orm"
import { registrarLog, notificar, notificarErro } from "@/lib/notificar"
import { notificarAtividadeAcaoProspeccao } from "@/lib/crm/notificar-atividade"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { temEndereco, type EnderecoCampos } from "@/lib/crm/endereco"
import { geocodificarCamposEndereco } from "@/lib/crm/geocode"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get("empresaId")
    const status = searchParams.get("status")
    const mine = searchParams.get("mine")
    const q = searchParams.get("q")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
    const all = searchParams.get("all") === "true"
    const dataInicio = searchParams.get("dataInicio")
    const dataFim = searchParams.get("dataFim")

    const conditions = []
    if (empresaId) conditions.push(eq(crmAcoesProspeccao.empresaId, parseInt(empresaId)))
    if (status) conditions.push(eq(crmAcoesProspeccao.status, status))
    if (mine === "true") {
      conditions.push(eq(crmAcoesProspeccao.criadoPor, auth.userId))
    }
    if (q) {
      const searchPattern = `%${q}%`
      conditions.push(
        or(
          like(crmPessoas.razaoSocial, searchPattern),
          like(clientes.nome, searchPattern),
          like(crmOportunidades.titulo, searchPattern),
          like(crmAcoesProspeccao.nomeAvulso, searchPattern)
        )!
      )
    }
    if (searchParams.get("avulsas") === "true") {
      conditions.push(
        and(
          eq(crmAcoesProspeccao.empresaId, null as any),
          eq(crmAcoesProspeccao.clienteId, null as any)
        )!
      )
    }
    if (dataInicio) conditions.push(gte(crmAcoesProspeccao.dataAcao, dataInicio))
    if (dataFim) conditions.push(lte(crmAcoesProspeccao.dataAcao, dataFim))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const baseQuery = db
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
        cep: crmAcoesProspeccao.cep,
        relato: crmAcoesProspeccao.relato,
        nomeAvulso: crmAcoesProspeccao.nomeAvulso,
        empresaId: crmAcoesProspeccao.empresaId,
        empresaNome: crmPessoas.razaoSocial,
        clienteId: crmAcoesProspeccao.clienteId,
        clienteNome: clientes.nome,
        oportunidadeId: crmAcoesProspeccao.oportunidadeId,
        oportunidadeTitulo: crmOportunidades.titulo,
        contatoId: crmAcoesProspeccao.contatoId,
        viagemId: crmAcoesProspeccao.viagemId,
        viagemTitulo: crmViagens.titulo,
        representanteId: crmAcoesProspeccao.representanteId,
        representanteNome: crmAcoesProspeccao.representanteNome,
        propostaId: crmAcoesProspeccao.propostaId,
        propostaTitulo: crmPropostas.titulo,
        criadoPor: crmAcoesProspeccao.criadoPor,
        criadoPorNome: usuarios.name,
        duracaoEstimada: crmAcoesProspeccao.duracaoEstimada,
        googleEventId: crmAcoesProspeccao.googleEventId,
        fotos: crmAcoesProspeccao.fotos,
        motivoCancelamento: crmAcoesProspeccao.motivoCancelamento,
        createdAt: crmAcoesProspeccao.createdAt,
      })
      .from(crmAcoesProspeccao)
      .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
      .leftJoin(crmOportunidades, eq(crmAcoesProspeccao.oportunidadeId, crmOportunidades.id))
      .leftJoin(crmViagens, eq(crmAcoesProspeccao.viagemId, crmViagens.id))
      .leftJoin(crmPropostas, eq(crmAcoesProspeccao.propostaId, crmPropostas.id))
      .leftJoin(usuarios, eq(crmAcoesProspeccao.criadoPor, usuarios.id))
      .where(where)

    if (all) {
      const lista = await baseQuery.orderBy(desc(crmAcoesProspeccao.dataAcao))
      return NextResponse.json(lista)
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(crmAcoesProspeccao)
      .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
      .leftJoin(crmOportunidades, eq(crmAcoesProspeccao.oportunidadeId, crmOportunidades.id))
      .where(where)

    const lista = await baseQuery
      .orderBy(desc(crmAcoesProspeccao.dataAcao))
      .limit(limit)
      .offset((page - 1) * limit)

    return NextResponse.json({
      data: lista,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    })
  } catch (error) {
    console.error("[GET /api/crm/acoes-prospeccao]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session
    const userId = auth.userId

    const body = await req.json()

    const baseValues = {
      nomeAvulso: body.nomeAvulso || null,
      empresaId: body.empresaId || null,
      clienteId: body.clienteId || null,
      oportunidadeId: body.oportunidadeId || null,
      contatoId: body.contatoId || null,
      viagemId: body.viagemId || null,
      representanteId: body.representanteId || null,
      representanteNome: body.representanteNome || null,
      propostaId: body.propostaId || null,
      hora: body.hora || null,
      tipo: body.tipo || "PRESENCIAL",
      status: "AGENDADA" as const,
      endereco: body.endereco || null,
      numero: body.numero || null,
      complemento: body.complemento || null,
      bairro: body.bairro || null,
      cidade: body.cidade || null,
      uf: body.uf || null,
      cep: body.cep || null,
      relato: body.relato || null,
      fotos: body.fotos || [],
      duracaoEstimada: body.duracaoEstimada || null,
      criadoPor: userId,
    }

    const datas: string[] = [body.dataAcao]

    if (body.recorrencia && body.recorrenciaFim) {
      const interval =
        body.recorrencia === "semanal" ? 7 : body.recorrencia === "quinzenal" ? 14 : 30
      const start = new Date(body.dataAcao + "T12:00:00")
      const end = new Date(body.recorrenciaFim + "T12:00:00")
      const current = new Date(start)
      while (true) {
        current.setDate(current.getDate() + interval)
        if (current > end) break
        datas.push(current.toISOString().split("T")[0])
      }
    }

    const inserted = await db
      .insert(crmAcoesProspeccao)
      .values(datas.map((d: any) => ({ ...baseValues, dataAcao: d })))
      .returning()

    const primeira = inserted[0]

    const coordsEndereco = await buscarCoordenadasDaAcao(baseValues)
    if (coordsEndereco) {
      await db
        .update(crmAcoesProspeccao)
        .set({ enderecoLat: coordsEndereco.latitude, enderecoLng: coordsEndereco.longitude })
        .where(
          inArray(
            crmAcoesProspeccao.id,
            inserted.map((v: any) => v.id)
          )
        )
      for (const v of inserted) {
        v.enderecoLat = coordsEndereco.latitude
        v.enderecoLng = coordsEndereco.longitude
      }
    }

    await registrarLog({
      tipo: "CADASTRO",
      acao: "criar",
      descricao: `Ação de prospecção criada para empresa ID ${body.empresaId} em ${body.dataAcao}${datas.length > 1 ? ` (${datas.length} recorrências)` : ""}`,
      entidade: "CrmAcaoProspeccao",
      entidadeId: primeira.id,
      usuarioNome: session.user.name,
    })

    if (primeira.empresaId) {
      await inserirTimelineEvento({
        empresaId: primeira.empresaId,
        tipo: "ACAO_PROSPECCAO",
        descricao: `Ação de prospecção ${primeira.tipo} agendada para ${new Date(primeira.dataAcao + "T12:00:00").toLocaleDateString("pt-BR")}${datas.length > 1 ? ` (${datas.length} recorrências)` : ""}`,
        metadados: {
          acaoProspeccaoId: primeira.id,
          tipo: primeira.tipo,
          dataAcao: primeira.dataAcao,
        },
      })
    }

    await notificar(
      "ACAO_PROSPECCAO_CRIADA",
      `Ação de prospecção ${primeira.tipo} agendada para ${new Date(primeira.dataAcao + "T12:00:00").toLocaleDateString("pt-BR")}${datas.length > 1 ? ` (${datas.length} recorrências)` : ""}`,
      `/comercial/crm/acoes-prospeccao/${primeira.id}`,
      session.user.name
    )

    await notificarAtividadeAcaoProspeccao({
      acao: `agendou uma ação de prospecção ${primeira.tipo.toLowerCase()}`,

      registro: new Date(primeira.dataAcao + "T12:00:00").toLocaleDateString("pt-BR"),
      link: `/comercial/crm/acoes-prospeccao/${primeira.id}`,
      usuarioNome: session.user.name,
      usuarioId: userId,
    })

    return NextResponse.json({ acao: primeira, total: inserted.length }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/crm/acoes-prospeccao]", error)
    await notificarErro("POST /api/crm/acoes-prospeccao", error)
    return NextResponse.json(
      { error: "Erro ao criar ação de prospecção. A equipe de suporte foi notificada." },
      { status: 500 }
    )
  }
}

async function buscarCoordenadasDaAcao(
  baseValues: Record<string, any>
): Promise<{ latitude: number; longitude: number } | null> {
  const enderecoAcao: EnderecoCampos = {
    endereco: baseValues.endereco || null,
    numero: baseValues.numero || null,
    complemento: baseValues.complemento || null,
    bairro: baseValues.bairro || null,
    cidade: baseValues.cidade || null,
    uf: baseValues.uf || null,
  }

  let campos: EnderecoCampos | null = temEndereco(enderecoAcao) ? enderecoAcao : null

  if (!campos && baseValues.empresaId) {
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
      .where(eq(crmPessoas.id, baseValues.empresaId))
      .limit(1)
    if (temEndereco(pessoa || {})) campos = pessoa as EnderecoCampos
  }

  if (!campos && baseValues.clienteId) {
    const [cliente] = await db
      .select({ endereco: clientes.endereco, cidade: clientes.cidade, uf: clientes.uf })
      .from(clientes)
      .where(eq(clientes.id, baseValues.clienteId))
      .limit(1)
    if (temEndereco(cliente || {})) campos = cliente as EnderecoCampos
  }

  if (!campos) return null
  return geocodificarCamposEndereco(campos)
}
