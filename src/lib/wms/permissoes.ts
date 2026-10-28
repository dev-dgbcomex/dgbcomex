import type { WmsSituacaoPedido } from "./tipos"

const ADMIN = new Set(["ADMIN", "SUDO"])

export function podeMoverParaSituacao(
  role: string | null | undefined,
  situacao: Pick<WmsSituacaoPedido, "perfis">
): boolean {
  if (!role) return false
  const normalizado = role.toUpperCase()
  if (ADMIN.has(normalizado)) return true
  return situacao.perfis.map((perfil) => perfil.toUpperCase()).includes(normalizado)
}

const REORDENAR = new Set(["ADMIN", "SUDO", "COMERCIAL", "EXPEDICAO"])

export function podeReordenarKanban(role: string | null | undefined): boolean {
  if (!role) return false
  return REORDENAR.has(role.toUpperCase())
}

const ARQUIVAR = new Set(["ADMIN", "SUDO", "COMERCIAL", "EXPEDICAO"])

export function podeArquivarWms(role: string | null | undefined): boolean {
  if (!role) return false
  return ARQUIVAR.has(role.toUpperCase())
}

const COLETOR = new Set(["ADMIN", "SUDO", "OPERADOR_ESTOQUE"])

export function podeColetarWms(role: string | null | undefined): boolean {
  if (!role) return false
  return COLETOR.has(role.toUpperCase())
}
