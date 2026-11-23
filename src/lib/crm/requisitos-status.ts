import { validarCamposObrigatoriosOportunidade, normalizarStatusOportunidade } from "./validacao-oportunidade"

export type RequisitoStatusOportunidade = {
  exigeCamposObrigatorios?: boolean
  exigePedidoErp?: boolean
  exigeMotivoPerda?: boolean
}

export type RequisitoStatusLead = {
  exigeOportunidade?: boolean
  exigeOportunidadeAceitaPossivelCliente?: boolean
  exigeCnpj?: boolean
  exigeDecisao?: boolean
}

export type ResultadoRequisito = {
  ok: boolean
  bloqueio?: string
  campos?: string[]
  mensagem?: string
}

export const STATUS_OPORTUNIDADE_SEM_CAMPOS = new Set(["NOVO", "QUALIFICACAO"])

export const STATUS_OPORTUNIDADE_ACEITA_POSSIVEL_CLIENTE = new Set([
  "NEGOCIACAO",
  "FECHADO_GANHO",
  "GANHO",
])

export const REQUISITOS_OPORTUNIDADE: Record<string, RequisitoStatusOportunidade> = {
  NOVO: {},
  QUALIFICACAO: {},
  PROPOSTA: { exigeCamposObrigatorios: true },
  NEGOCIACAO: { exigeCamposObrigatorios: true },
  FECHADO_GANHO: { exigeCamposObrigatorios: true, exigePedidoErp: true },
  FECHADO_PERDIDO: { exigeCamposObrigatorios: true, exigeMotivoPerda: true },
}

export const REQUISITOS_LEAD: Record<string, RequisitoStatusLead> = {
  NOVO: {},
  QUALIFICADO: { exigeOportunidade: true },
  POSSIVEL_CLIENTE: { exigeOportunidadeAceitaPossivelCliente: true },
  PERDIDO: {},
  INATIVO: {},
  CONVERTIDO_CLIENTE: { exigeCnpj: true, exigeDecisao: true },
}

export function statusOportunidadeExigeRequisitos(status: string | null | undefined): boolean {
  const s = normalizarStatusOportunidade(status)
  if (!s) return false
  return !STATUS_OPORTUNIDADE_SEM_CAMPOS.has(s) || !!REQUISITOS_OPORTUNIDADE[s]?.exigePedidoErp || !!REQUISITOS_OPORTUNIDADE[s]?.exigeMotivoPerda
}

export function validarRequisitosOportunidade(params: {
  status?: string | null
  valorEstimado?: unknown
  probabilidade?: unknown
  totalPedidosErp?: number
  motivoPerda?: string | null
}): ResultadoRequisito {
  const status = normalizarStatusOportunidade(params.status)
  const requisito = REQUISITOS_OPORTUNIDADE[status ?? ""]

  if (status === "FECHADO_GANHO" && (params.totalPedidosErp ?? 0) === 0) {
    return {
      ok: false,
      bloqueio: "Vincule um pedido do ERP antes de marcar a oportunidade como ganha",
      campos: [],
      mensagem: "Vincule um pedido do ERP antes de marcar a oportunidade como ganha",
    }
  }

  if (status === "FECHADO_PERDIDO" && !params.motivoPerda) {
    return {
      ok: false,
      bloqueio: "Motivo da perda é obrigatório",
      campos: ["motivoPerda"],
      mensagem: "Motivo da perda é obrigatório",
    }
  }

  if (requisito?.exigeCamposObrigatorios) {
    const camposObrigatorios = validarCamposObrigatoriosOportunidade({
      status,
      valorEstimado: params.valorEstimado,
      probabilidade: params.probabilidade,
    })
    if (!camposObrigatorios.valido) {
      return {
        ok: false,
        bloqueio: camposObrigatorios.mensagem,
        campos: camposObrigatorios.campos,
        mensagem: camposObrigatorios.mensagem,
      }
    }
  }

  return { ok: true }
}

export function validarRequisitosLead(params: {
  statusNovo?: string | null
  totalOportunidades?: number
  totalOportunidadesAceitaPossivelCliente?: number
  temCnpj?: boolean
  decisao?: string | null
}): ResultadoRequisito {
  const statusNovo = params.statusNovo ? String(params.statusNovo).toUpperCase() : null
  const requisito = REQUISITOS_LEAD[statusNovo ?? ""]

  if (statusNovo === "QUALIFICADO" && (params.totalOportunidades ?? 0) === 0) {
    return {
      ok: false,
      bloqueio: "Crie uma oportunidade antes de qualificar esta lead",
      campos: [],
      mensagem: "Crie uma oportunidade antes de qualificar esta lead",
    }
  }

  if (
    statusNovo === "POSSIVEL_CLIENTE" &&
    (params.totalOportunidadesAceitaPossivelCliente ?? 0) === 0
  ) {
    return {
      ok: false,
      bloqueio: "A lead só vai para Possível Cliente com uma oportunidade em negociação ou ganha",
      campos: [],
      mensagem: "A lead só vai para Possível Cliente com uma oportunidade em negociação ou ganha",
    }
  }

  if (statusNovo === "CONVERTIDO_CLIENTE") {
    if (params.decisao !== "CONVERTER") {
      return {
        ok: false,
        bloqueio: "Use o botão Tornar cliente para converter a lead",
        campos: [],
        mensagem: "Use o botão Tornar cliente para converter a lead",
      }
    }
    if (requisito?.exigeCnpj && !params.temCnpj) {
      return {
        ok: false,
        bloqueio: "A lead precisa ter CNPJ cadastrado para virar cliente",
        campos: ["cnpj"],
        mensagem: "A lead precisa ter CNPJ cadastrado para virar cliente",
      }
    }
  }

  return { ok: true }
}

export function contarOportunidadesAceitaPossivelCliente(oportunidades: Array<{ status: string | null | undefined }>): number {
  return oportunidades.filter((o) => {
    const s = normalizarStatusOportunidade(o.status)
    return s ? STATUS_OPORTUNIDADE_ACEITA_POSSIVEL_CLIENTE.has(s) : false
  }).length
}
