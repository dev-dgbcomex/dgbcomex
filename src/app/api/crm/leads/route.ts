import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq, desc, like, or, sql } from "drizzle-orm"
import { registrarLog, notificar } from "@/lib/notificar"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { digitosDocumento, formatarDocumento, validarDocumento } from "@/lib/documento"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const tarja = searchParams.get("tarja")

    let conditions = []

    if (status) conditions.push(eq(crmLeads.status, status))
    if (tarja === "com") conditions.push(eq(crmLeads.promovidaCliente, true))
    if (tarja === "sem") conditions.push(eq(crmLeads.promovidaCliente, false))
    if (search) {
      conditions.push(
        or(
          like(crmLeads.razaoSocial, `%${search}%`),
          like(crmLeads.nome, `%${search}%`),
          like(crmLeads.nomeFantasia, `%${search}%`),
          like(crmLeads.cnpj, `%${search}%`),
          like(crmLeads.cpf, `%${search}%`)
        )
      )
    }

    const where =
      conditions.length > 0
        ? sql`${conditions.reduce((a: any, b: any) => sql`${a} AND ${b}`)}`
        : undefined

    const lista = await db
      .select({
        id: crmLeads.id,
        tipoPessoa: crmLeads.tipoPessoa,
        nome: crmLeads.nome,
        razaoSocial: crmLeads.razaoSocial,
        nomeFantasia: crmLeads.nomeFantasia,
        cpf: crmLeads.cpf,
        cnpj: crmLeads.cnpj,
        segmento: crmLeads.segmento,
        porte: crmLeads.porte,
        status: crmLeads.status,
        responsavelId: crmLeads.responsavelId,
        responsavelNome: usuarios.name,
        clienteId: crmLeads.clienteId,
        promovidaCliente: crmLeads.promovidaCliente,
        promovidoEm: crmLeads.promovidoEm,
        promovidoPor: crmLeads.promovidoPor,
        promovidoPorNome: crmLeads.promovidoPorNome,
        endereco: crmLeads.endereco,
        numero: crmLeads.numero,
        bairro: crmLeads.bairro,
        cidade: crmLeads.cidade,
        uf: crmLeads.uf,
        cep: crmLeads.cep,
        ativo: crmLeads.ativo,
        createdAt: crmLeads.createdAt,
        updatedAt: crmLeads.updatedAt,
      })
      .from(crmLeads)
      .leftJoin(usuarios, eq(crmLeads.responsavelId, usuarios.id))
      .where(where)
      .orderBy(desc(crmLeads.createdAt))

    return NextResponse.json(lista)
  } catch (error) {
    console.error("[GET /api/crm/empresas]", error)
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
    const tipoPessoa = body.tipoPessoa || "PJ"
    const cnpjDigitado = body.cnpj ? String(body.cnpj) : ""
    const cpfDigitado = body.cpf ? String(body.cpf) : ""

    const erroCnpj = tipoPessoa === "PJ" && cnpjDigitado ? validarDocumento(cnpjDigitado, "CNPJ") : null
    if (erroCnpj) return NextResponse.json({ error: erroCnpj }, { status: 400 })
    const erroCpf = tipoPessoa === "PF" && cpfDigitado ? validarDocumento(cpfDigitado, "CPF") : null
    if (erroCpf) return NextResponse.json({ error: erroCpf }, { status: 400 })

    const cnpj = tipoPessoa === "PJ" && cnpjDigitado ? formatarDocumento(cnpjDigitado, "CNPJ") : null
    const cpf = tipoPessoa === "PF" && cpfDigitado ? formatarDocumento(cpfDigitado, "CPF") : null

    if (cnpj) {
      const [existente] = await db
        .select({ id: crmLeads.id })
        .from(crmLeads)
        .where(sql`regexp_replace(${crmLeads.cnpj}, '\\D', '', 'g') = ${digitosDocumento(cnpj)}`)
        .limit(1)
      if (existente) {
        return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 })
      }
    }

    if (cpf) {
      const [existente] = await db
        .select({ id: crmLeads.id })
        .from(crmLeads)
        .where(sql`regexp_replace(${crmLeads.cpf}, '\\D', '', 'g') = ${digitosDocumento(cpf)}`)
        .limit(1)
      if (existente) {
        return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 })
      }
    }

    const [nova] = await db
      .insert(crmLeads)
      .values({
        tipoPessoa,
        nome: tipoPessoa === "PF" ? body.nome : null,
        razaoSocial: tipoPessoa === "PJ" ? body.razaoSocial : null,
        nomeFantasia: tipoPessoa === "PJ" ? body.nomeFantasia || null : null,
        cpf: tipoPessoa === "PF" ? cpf : null,
        cnpj: tipoPessoa === "PJ" ? cnpj : null,
        segmento: body.segmento || null,
        porte: body.porte || null,
        site: body.site || null,
        telefone: body.telefone || null,
        celular: body.celular || null,
        email: body.email || null,
        emailNf: body.emailNf || null,
        endereco: body.endereco || null,
        numero: body.numero || null,
        complemento: body.complemento || null,
        bairro: body.bairro || null,
        cidade: body.cidade || null,
        uf: body.uf || null,
        cep: body.cep || null,
        observacoes: body.observacoes || null,
        responsavelId: body.responsavelId || userId,
        status: "NOVO",
      })
      .returning()

    await registrarLog({
      tipo: "CADASTRO",
      acao: "criar",
      descricao: `Lead ${tipoPessoa === "PF" ? "Física" : "Jurídica"} criada: ${nova.nome || nova.razaoSocial}`,
      entidade: "CrmLead",
      entidadeId: nova.id,
      usuarioNome: session.user.name,
    })

    const nomeLead = nova.nome || nova.razaoSocial || "Lead"
    await notificar(
      "LEAD_CRIADO",
      `Lead ${nova.tipoPessoa === "PF" ? "Física" : "Jurídica"} criada: ${nomeLead}`,
      `/comercial/crm/leads/${nova.id}`,
      session.user.name
    )

    await notificarAtividadeComercial({
      acao: "cadastrou a lead",
      entidade: "Lead",
      registro: nomeLead,
      link: `/comercial/crm/leads/${nova.id}`,
      usuarioNome: session.user.name,
      usuarioId: userId,
    })

    return NextResponse.json(nova, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "Documento já cadastrado" }, { status: 409 })
    }
    console.error("[POST /api/crm/empresas]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
