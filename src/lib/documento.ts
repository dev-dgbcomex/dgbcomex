export type TipoDocumento = "CPF" | "CNPJ"

export function digitosDocumento(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "")
}

export function formatarDocumento(
  valor: string | null | undefined,
  tipo?: TipoDocumento
): string | null {
  const texto = (valor ?? "").trim()
  if (!texto) return null

  const digitos = digitosDocumento(texto)
  const tipoDocumento = tipo ?? (digitos.length === 11 ? "CPF" : digitos.length === 14 ? "CNPJ" : null)

  if (tipoDocumento === "CPF" && digitos.length === 11) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
  }

  if (tipoDocumento === "CNPJ" && digitos.length === 14) {
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`
  }

  return texto
}

export function documentoEstaPontuado(valor: string | null | undefined): boolean {
  const texto = (valor ?? "").trim()
  if (!texto) return false
  const formatado = formatarDocumento(texto)
  return formatado !== null && formatado === texto
}

export function validarDocumento(
  valor: string | null | undefined,
  tipo: TipoDocumento
): string | null {
  const digitos = digitosDocumento(valor)
  const tamanho = tipo === "CPF" ? 11 : 14
  if (digitos.length !== tamanho) {
    return `${tipo} deve ter ${tamanho} dígitos`
  }
  return null
}
