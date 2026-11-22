import type { FaixaConversao } from "@/lib/crm/faixa-conversao"

export type TipoEntidadeTemperatura = "lead" | "cliente"

export type OportunidadeResumidaTemperatura = {
  id: number
  titulo: string
  status: string
  valorEstimado?: number | string | null
}

export type TemperaturaItem = {
  id: string
  tipo: TipoEntidadeTemperatura
  entidadeId: number
  nome: string
  subtitulo?: string | null
  documento?: string | null
  status?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
  cpf?: string | null
  cnpj?: string | null
  segmento?: string | null
  responsavelNome?: string | null
  contato?: string | null
  email?: string | null
  telefone?: string | null
  celular?: string | null
  cidade?: string | null
  uf?: string | null
  faixaConversao: FaixaConversao
  totalOportunidades: number
  totalOportunidadesProposta: number
  totalOportunidadesNegociacao: number
  totalPedidos: number
  totalVisitas: number
  totalAcoes: number
  temGanhoMes: boolean
  temGanhoTrimestre: boolean
  temPedidoMes: boolean
  temPedidoTrimestre: boolean
  oportunidades: OportunidadeResumidaTemperatura[]
  href: string
}

export type TemperaturaFiltros = {
  busca: string
  tipo: "todos" | "lead" | "cliente"
  comOportunidade: boolean
  comPedido: boolean
}

export const TEMPERATURA_FILTROS_VAZIOS: TemperaturaFiltros = {
  busca: "",
  tipo: "todos",
  comOportunidade: false,
  comPedido: false,
}

export type AcaoTemperatura =
  | { tipo: "CRIAR_OPORTUNIDADE"; status: "PROPOSTA" | "NEGOCIACAO"; titulo: string }
  | { tipo: "ALTERAR_STATUS_OPORTUNIDADE"; oportunidadeId: number; status: "PROPOSTA" | "NEGOCIACAO" }
  | { tipo: "PERDER_OPORTUNIDADE"; oportunidadeId: number; motivoPerda: string }

export type PlanoTemperatura = {
  destino: FaixaConversao
  acoes: AcaoTemperatura[]
  avisos: string[]
}

export type EscolhasTemperatura = {
  oportunidadeId?: number | "nova"
  oportunidadesParaBaixarIds?: number[]
  oportunidadesParaPerderIds?: number[]
  motivoPerda?: string
}

export type ResultadoPlanoTemperatura =
  | { ok: true; plano: PlanoTemperatura }
  | { ok: false; erro: string }

function normalizarTexto(valor: unknown): string {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function digitosDocumento(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "")
}

function camposBusca(item: TemperaturaItem): unknown[] {
  return [
    item.nome,
    item.razaoSocial,
    item.nomeFantasia,
    item.cpf,
    item.cnpj,
    item.documento,
    item.segmento,
    item.responsavelNome,
    item.contato,
    item.email,
    item.telefone,
    item.celular,
    item.cidade,
    item.uf,
  ]
}

export function filtrarItensTemperatura(
  itens: TemperaturaItem[],
  filtros: TemperaturaFiltros
): TemperaturaItem[] {
  const termo = normalizarTexto(filtros.busca)
  const digitos = digitosDocumento(filtros.busca)

  return itens.filter((item) => {
    if (filtros.tipo !== "todos" && item.tipo !== filtros.tipo) return false
    if (filtros.comOportunidade && item.totalOportunidades <= 0) return false
    if (filtros.comPedido && item.totalPedidos <= 0) return false
    if (!termo) return true

    const documentos = [item.cpf, item.cnpj, item.documento].map(digitosDocumento).join(" ")
    if (digitos.length >= 3 && documentos.includes(digitos)) return true

    return normalizarTexto(camposBusca(item).map(normalizarTexto).join(" ")).includes(termo)
  })
}

export function oportunidadesCandidatas(
  item: TemperaturaItem,
  status: "PROPOSTA" | "NEGOCIACAO"
): OportunidadeResumidaTemperatura[] {
  return item.oportunidades.filter(
    (oportunidade) =>
      !["FECHADO_GANHO", "FECHADO_PERDIDO", "GANHO"].includes(oportunidade.status) &&
      oportunidade.status !== status
  )
}

export function temFiltrosTemperaturaAtivos(filtros: TemperaturaFiltros): boolean {
  return Boolean(
    filtros.busca.trim() ||
      filtros.tipo !== "todos" ||
      filtros.comOportunidade ||
      filtros.comPedido
  )
}

function planoVazio(destino: FaixaConversao, aviso?: string): ResultadoPlanoTemperatura {
  return {
    ok: true,
    plano: { destino, acoes: [], avisos: aviso ? [aviso] : [] },
  }
}

function planoPromocao(
  item: TemperaturaItem,
  status: "PROPOSTA" | "NEGOCIACAO",
  destino: FaixaConversao,
  escolhas: EscolhasTemperatura
): ResultadoPlanoTemperatura {
  const titulo = `${status === "PROPOSTA" ? "Proposta" : "Negociação"} — ${item.nome}`
  const escolhida = escolhas.oportunidadeId

  if (escolhida === undefined) {
    return { ok: false, erro: "Escolha uma oportunidade ou a criação de uma nova." }
  }

  if (escolhida === "nova") {
    return {
      ok: true,
      plano: {
        destino,
        acoes: [{ tipo: "CRIAR_OPORTUNIDADE", status, titulo }],
        avisos: [],
      },
    }
  }

  const oportunidade = oportunidadesCandidatas(item, status).find(
    (candidata) => candidata.id === escolhida
  )

  if (!oportunidade) {
    return { ok: false, erro: "A oportunidade escolhida não está disponível para esta faixa." }
  }

  return {
    ok: true,
    plano: {
      destino,
      acoes: [
        { tipo: "ALTERAR_STATUS_OPORTUNIDADE", oportunidadeId: oportunidade.id, status },
      ],
      avisos: [],
    },
  }
}

export function planoDaTransicao(
  item: TemperaturaItem,
  destino: FaixaConversao,
  escolhas: EscolhasTemperatura = {}
): ResultadoPlanoTemperatura {
  if (item.faixaConversao === destino) {
    return planoVazio(destino, "O item já está nesta faixa.")
  }

  if (destino === "QUENTE") {
    if (item.temGanhoMes || item.temPedidoMes) {
      return planoVazio(destino, "Já existe ganho ou pedido neste mês; a faixa já é Quente.")
    }
    return planoPromocao(item, "NEGOCIACAO", destino, escolhas)
  }

  if (destino === "MORNO") {
    if (item.temGanhoMes || item.temPedidoMes) {
      return {
        ok: false,
        erro: "Não é possível mover para Morno: existe ganho ou pedido neste mês.",
      }
    }

    if (item.faixaConversao === "QUENTE") {
      const negociacoes = item.oportunidades.filter((o) => o.status === "NEGOCIACAO")
      const selecionadas = escolhas.oportunidadesParaBaixarIds ?? []
      if (negociacoes.length === 0) {
        return planoVazio(destino, "Não há oportunidades em Negociação para rebaixar.")
      }
      if (!negociacoes.every((oportunidade) => selecionadas.includes(oportunidade.id))) {
        return { ok: false, erro: "Selecione todas as oportunidades em Negociação." }
      }
      return {
        ok: true,
        plano: {
          destino,
          acoes: negociacoes.map((oportunidade) => ({
            tipo: "ALTERAR_STATUS_OPORTUNIDADE" as const,
            oportunidadeId: oportunidade.id,
            status: "PROPOSTA" as const,
          })),
          avisos: [],
        },
      }
    }

    return planoPromocao(item, "PROPOSTA", destino, escolhas)
  }

  if (item.temGanhoTrimestre || item.temPedidoTrimestre) {
    return {
      ok: false,
      erro: "Não é possível mover para Frio: existe ganho ou pedido neste trimestre.",
    }
  }

  const oportunidadesAbertas = item.oportunidades.filter((oportunidade) =>
    ["PROPOSTA", "NEGOCIACAO"].includes(oportunidade.status)
  )
  const selecionadas = escolhas.oportunidadesParaPerderIds ?? []
  const motivo = escolhas.motivoPerda?.trim()

  if (!motivo) {
    return { ok: false, erro: "Informe o motivo da perda." }
  }

  if (
    oportunidadesAbertas.length > 0 &&
    !oportunidadesAbertas.every((oportunidade) => selecionadas.includes(oportunidade.id))
  ) {
    return { ok: false, erro: "Selecione todas as oportunidades em Proposta ou Negociação." }
  }

  return {
    ok: true,
    plano: {
      destino,
      acoes: oportunidadesAbertas.map((oportunidade) => ({
        tipo: "PERDER_OPORTUNIDADE" as const,
        oportunidadeId: oportunidade.id,
        motivoPerda: motivo,
      })),
      avisos:
        oportunidadesAbertas.length === 0
          ? ["Não havia oportunidades abertas para perder."]
          : [],
    },
  }
}
