export type ValidacaoCamposObrigatoriosOportunidade = {
  valido: boolean
  campos: string[]
  mensagem: string
}

const STATUS_SEM_CAMPOS_OBRIGATORIOS = new Set(["NOVO", "QUALIFICACAO"])

export function statusExigeCamposObrigatorios(status: string | null | undefined): boolean {
  if (!status) return false
  return !STATUS_SEM_CAMPOS_OBRIGATORIOS.has(status.toUpperCase())
}

export function normalizarStatusOportunidade(status: string | null | undefined): string | null {
  if (!status) return null
  const s = status.toUpperCase()
  if (s === "GANHO") return "FECHADO_GANHO"
  return s
}

export function validarCamposObrigatoriosOportunidade(params: {
  status?: string | null
  valorEstimado?: unknown
  probabilidade?: unknown
}): ValidacaoCamposObrigatoriosOportunidade {
  const status = normalizarStatusOportunidade(params.status)
  if (!statusExigeCamposObrigatorios(status)) {
    return { valido: true, campos: [], mensagem: "" }
  }

  const campos: string[] = []
  const valor = Number(params.valorEstimado ?? null)
  if (!Number.isFinite(valor) || valor <= 1) {
    campos.push("valorEstimado")
  }

  const probabilidade = Number(params.probabilidade ?? null)
  if (!Number.isFinite(probabilidade) || probabilidade <= 1) {
    campos.push("probabilidade")
  }

  if (campos.length > 0) {
    return {
      valido: false,
      campos,
      mensagem: "Informe Valor Estimado e Probabilidade maiores que 1 para este estágio",
    }
  }

  return { valido: true, campos: [], mensagem: "" }
}
