import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { campoVisibilidade } from "@/lib/db/schema/campos-visiveis"
import {
  CAMPO_PROPOSTA_VINCOLADA,
  CADASTRO_VISITA_DETALHE,
  CADASTRO_ACAO_PROSPECCAO_DETALHE,
  ROLES_CAMPO_VISIBILIDADE,
  chaveRegra,
  encontrarCadastro,
  roleEhAdministrativa,
} from "./campos-visiveis/catalogo"

export interface ResultadoCamposVisiveis {
  campos: Record<string, boolean>
  falhou: boolean
}

export function normalizarRolesOcultos(roles: unknown): string[] {
  if (!Array.isArray(roles)) return []
  const permitidas = new Set<string>(ROLES_CAMPO_VISIBILIDADE)
  return Array.from(
    new Set(
      roles.filter(
        (role): role is string =>
          typeof role === "string" && permitidas.has(role) && !roleEhAdministrativa(role)
      )
    )
  )
}

export function campoEstaVisivel(role: string | null | undefined, rolesOcultos: string[]): boolean {
  if (roleEhAdministrativa(role)) return true
  return !normalizarRolesOcultos(rolesOcultos).includes(role ?? "")
}

export function camposVisiveisPara(
  cadastro: string,
  role: string | null | undefined,
  regras: Record<string, string[]>
): Record<string, boolean> {
  const definicao = encontrarCadastro(cadastro)
  if (!definicao) return {}
  return Object.fromEntries(
    definicao.campos.map((campo) => [
      campo.campo,
      campoEstaVisivel(role, regras[chaveRegra(cadastro, campo.campo)] ?? []),
    ])
  )
}

export async function carregarRegrasCamposVisiveis(
  cadastro?: string
): Promise<Record<string, string[]>> {
  const consulta = db
    .select({
      cadastro: campoVisibilidade.cadastro,
      campo: campoVisibilidade.campo,
      rolesOcultos: campoVisibilidade.rolesOcultos,
    })
    .from(campoVisibilidade)
  const linhas = await (cadastro
    ? consulta.where(eq(campoVisibilidade.cadastro, cadastro)).orderBy(campoVisibilidade.campo)
    : consulta.orderBy(campoVisibilidade.cadastro, campoVisibilidade.campo))

  return Object.fromEntries(
    linhas.map((linha: { cadastro: string; campo: string; rolesOcultos: unknown }) => [
      chaveRegra(linha.cadastro, linha.campo),
      normalizarRolesOcultos(linha.rolesOcultos),
    ])
  )
}

export async function carregarCamposVisiveis(
  cadastro: string,
  role: string | null | undefined
): Promise<ResultadoCamposVisiveis> {
  const definicao = encontrarCadastro(cadastro)
  if (!definicao) return { campos: {}, falhou: false }

  try {
    const regras = await carregarRegrasCamposVisiveis(cadastro)
    return { campos: camposVisiveisPara(cadastro, role, regras), falhou: false }
  } catch (error) {
    console.error("[campos-visiveis] Falha ao carregar regras", error)
    return {
      campos: Object.fromEntries(
        definicao.campos.map((campo) => [campo.campo, roleEhAdministrativa(role)])
      ),
      falhou: true,
    }
  }
}

export async function propostaVinculadaVisivelPara(
  role: string | null | undefined
): Promise<boolean> {
  const resultado = await carregarCamposVisiveis(CADASTRO_VISITA_DETALHE, role)
  return resultado.campos[CAMPO_PROPOSTA_VINCOLADA] === true
}

export async function propostaVinculadaAcaoProspeccaoVisivelPara(
  role: string | null | undefined
): Promise<boolean> {
  const resultado = await carregarCamposVisiveis(CADASTRO_ACAO_PROSPECCAO_DETALHE, role)
  return resultado.campos[CAMPO_PROPOSTA_VINCOLADA] === true
}
