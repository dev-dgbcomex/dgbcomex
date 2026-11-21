export const ROLES_ACESSO_TOTAL = ["ADMIN", "SUDO", "COMERCIAL", "CRM"] as const

export function podeGerenciarTudo(role?: string | null): boolean {
  return !!role && (ROLES_ACESSO_TOTAL as readonly string[]).includes(role)
}

export function podeGerenciarRegistro(
  role: string | null | undefined,
  criadoPor: number | null | undefined,
  userId: number
): boolean {
  return podeGerenciarTudo(role) || criadoPor === userId
}
