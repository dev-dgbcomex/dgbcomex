export type CampoAcaoStatus = {
  nome: string
  label: string
  placeholder?: string
}

export type AcaoStatus = {
  value: string
  label: string
  desc: string
  tipos: string[]
  campos: CampoAcaoStatus[]
}

export const ACOES_STATUS: AcaoStatus[] = [
  {
    value: "VIRAR_CLIENTE",
    label: "Vira cliente",
    desc: "Vincula a pessoa/empresa da oportunidade ao cadastro de Clientes do PDM.",
    tipos: ["OPORTUNIDADE"],
    campos: [],
  },
  {
    value: "CRIAR_PEDIDO_VENDA",
    label: "Cria pedido de venda",
    desc: "Cria um pedido de venda em aberto a partir da oportunidade.",
    tipos: ["OPORTUNIDADE"],
    campos: [
      { nome: "observacao", label: "Observação", placeholder: "Pedido gerado pelo gatilho" },
      { nome: "status", label: "Status do pedido", placeholder: "ABERTO" },
    ],
  },
  {
    value: "NOTIFICAR_RESPONSAVEL",
    label: "Notifica o responsável",
    desc: "Envia uma notificação no sistema para o responsável pelo registro.",
    tipos: ["OPORTUNIDADE", "PROPOSTA"],
    campos: [
      { nome: "mensagem", label: "Mensagem", placeholder: "Registro movido para o novo status" },
    ],
  },
  {
    value: "REGISTRAR_TIMELINE",
    label: "Registra na timeline",
    desc: "Registra um evento na timeline da pessoa relacionada.",
    tipos: ["OPORTUNIDADE", "PROPOSTA"],
    campos: [{ nome: "mensagem", label: "Mensagem", placeholder: "Evento gerado pelo gatilho" }],
  },
]

export function acoesParaTipo(tipo: string): AcaoStatus[] {
  return ACOES_STATUS.filter((a) => a.tipos.includes(tipo))
}

export function acaoPorValor(valor: string): AcaoStatus | undefined {
  return ACOES_STATUS.find((a) => a.value === valor)
}
