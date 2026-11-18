import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { campoVisibilidade } from "@/lib/db/schema/campos-visiveis"
import { handleApiError } from "@/lib/api-error"
import { campoVisibilidadeSchema, validateRequest } from "@/lib/validation"
import { normalizarRolesOcultos } from "@/lib/campos-visiveis"
import {
  CATALOGO_CAMPOS_VISIVEIS,
  ROLES_CAMPO_VISIBILIDADE,
  chaveRegra,
  encontrarCampo,
  roleEhAdministrativa,
} from "@/lib/campos-visiveis/catalogo"

export const dynamic = "force-dynamic"

async function exigirAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || !roleEhAdministrativa(session.user?.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  return session
}

export async function GET() {
  try {
    const autorizacao = await exigirAdmin()
    if (autorizacao instanceof NextResponse) return autorizacao

    const linhas = await db.select().from(campoVisibilidade)
    const regras: Record<string, string[]> = {}
    for (const linha of linhas) {
      regras[chaveRegra(linha.cadastro, linha.campo)] = normalizarRolesOcultos(
        linha.rolesOcultos
      )
    }

    return NextResponse.json({ catalogo: CATALOGO_CAMPOS_VISIVEIS, regras })
  } catch (error) {
    return handleApiError(error, "GET /api/admin/campos-visiveis")
  }
}

export async function PUT(req: NextRequest) {
  try {
    const autorizacao = await exigirAdmin()
    if (autorizacao instanceof NextResponse) return autorizacao

    const corpo = await req.json()
    const validado = validateRequest(campoVisibilidadeSchema, corpo)
    if ("error" in validado) return validado.error

    const { cadastro, campo, rolesOcultos } = validado.data
    if (!encontrarCampo(cadastro, campo)) {
      return NextResponse.json({ error: "Cadastro ou campo inválido" }, { status: 400 })
    }

    const permitidas = new Set<string>(ROLES_CAMPO_VISIBILIDADE)
    if (rolesOcultos.some((role) => !permitidas.has(role) || roleEhAdministrativa(role))) {
      return NextResponse.json({ error: "Perfil inválido para ocultação" }, { status: 400 })
    }

    const roles = normalizarRolesOcultos(rolesOcultos)
    const [existente] = await db
      .select({ id: campoVisibilidade.id })
      .from(campoVisibilidade)
      .where(
        and(eq(campoVisibilidade.cadastro, cadastro), eq(campoVisibilidade.campo, campo))
      )
      .limit(1)

    if (existente) {
      await db
        .update(campoVisibilidade)
        .set({ rolesOcultos: roles, updatedAt: new Date() })
        .where(eq(campoVisibilidade.id, existente.id))
    } else {
      await db.insert(campoVisibilidade).values({ cadastro, campo, rolesOcultos: roles })
    }

    return NextResponse.json({ success: true, regra: { cadastro, campo, rolesOcultos: roles } })
  } catch (error) {
    return handleApiError(error, "PUT /api/admin/campos-visiveis")
  }
}
