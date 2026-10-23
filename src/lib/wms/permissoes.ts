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
