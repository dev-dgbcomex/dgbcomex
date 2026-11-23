import {
  calcularResumoEngajamento,
  classificarAlerta,
  type ChaveItemEngajamento,
  type ClienteSaude as ClienteSaudeVisitas,
  type DetalheScore,
  type FiltrosSaude,
  type ItemEngajamento,
  type ResumoConversao,
  type ResumoEngajamento,
  type TipoScore,
} from "./visitas-saude"
import type {
  ClienteSaude as ClienteSaudeAcoes,
  RegistroItemEngajamento,
} from "./acoes-prospeccao-saude"

export type ClienteSaudeLeads = ClienteSaudeVisitas & ClienteSaudeAcoes

type ClienteSaudeComAcoes = ClienteSaudeVisitas & Partial<ClienteSaudeAcoes>

type CamposAcoes = Omit<ClienteSaudeAcoes, keyof ClienteSaudeVisitas>
type CamposVisitas = Omit<ClienteSaudeVisitas, keyof ClienteSaudeAcoes>

const PONTOS_ESFORCO_BASE = 12.5
const PONTOS_ESFORCO_DESTAQUE = 25

const ITENS_ENGAJAMENTO: {
  chave: ChaveItemEngajamento
  rotulo: string
  peso: number
}[] = [
  { chave: "ata", rotulo: "Ata/Relato", peso: 28 / 3 },
  { chave: "checkIn", rotulo: "Check-in/check-out", peso: 28 / 3 },
  { chave: "contato", rotulo: "Contato", peso: 28 / 3 },
  { chave: "proposta", rotulo: "Proposta", peso: 36 },
  { chave: "oportunidade", rotulo: "Oportunidade", peso: 36 },
]

export function chaveClienteSaude(item: Pick<ClienteSaudeVisitas, "id" | "tipo">): string {
  return `${item.tipo}:${item.id}`
}

function acoesZeradas(): CamposAcoes {
  return {
    statusAcoes: [],
    tiposAcao: [],
    totalAcoes: 0,
    acoesRealizadas: 0,
    acoesAgendadas: 0,
    acoesCanceladas: 0,
    ultimaAcao: null,
    proximaAcao: null,
    acoesComRelato: 0,
    acoesComCheckIn: 0,
    acoes: [],
  }
}

function visitasZeradas(): CamposVisitas {
  return {
    statusVisitas: [],
    tiposVisita: [],
    totalVisitas: 0,
    visitasRealizadas: 0,
    visitasAgendadas: 0,
    visitasCanceladas: 0,
    ultimaVisita: null,
    proximaVisita: null,
    visitasComRelato: 0,
    visitasComCheckIn: 0,
    visitas: [],
  }
}

function totals(linha: ClienteSaudeComAcoes) {
  const acoes = linha.acoes ?? []
  return {
    realizadas: linha.visitasRealizadas + (linha.acoesRealizadas ?? acoes.length),
    agendadas: linha.visitasAgendadas + (linha.acoesAgendadas ?? 0),
    relatos: linha.visitasComRelato + (linha.acoesComRelato ?? 0),
    checkIns: linha.visitasComCheckIn + (linha.acoesComCheckIn ?? 0),
    total: linha.totalVisitas + (linha.totalAcoes ?? acoes.length),
  }
}

export function calcularScoresProspeccao(linha: ClienteSaudeComAcoes): {
  scoreEsforco: number
  scoreEngajamento: number
} {
  const { realizadas, agendadas, relatos, checkIns } = totals(linha)
  return {
    scoreEsforco: Math.min(
      100,
      (realizadas > 0 ? PONTOS_ESFORCO_BASE : 0) +
        (relatos > 0 ? PONTOS_ESFORCO_BASE : 0) +
        (checkIns > 0 ? PONTOS_ESFORCO_BASE : 0) +
        (linha.temContato ? PONTOS_ESFORCO_BASE : 0) +
        (linha.temProposta ? PONTOS_ESFORCO_DESTAQUE : 0) +
        (linha.temOportunidade ? PONTOS_ESFORCO_DESTAQUE : 0)
    ),
    scoreEngajamento: Math.min(
      100,
      (realizadas > 0 ? 20 : 0) +
        (agendadas > 0 ? 10 : 0) +
        (linha.propostasNegociadas > 0 ? 20 : 0) +
        (linha.oportunidadesNegociadas > 0 ? 20 : 0) +
        (linha.pedidosVenda > 0 ? 15 : 0) +
        (linha.faturamentos > 0 ? 15 : 0)
    ),
  }
}

export function mesclarSaudeProspeccao(
  visitas: ClienteSaudeVisitas[],
  acoes: ClienteSaudeAcoes[]
): ClienteSaudeLeads[] {
  const mapa = new Map<string, ClienteSaudeLeads>()

  for (const visita of visitas) {
    mapa.set(chaveClienteSaude(visita), { ...visita, ...acoesZeradas() })
  }

  for (const acao of acoes) {
    const chave = chaveClienteSaude(acao)
    const linha = mapa.get(chave)
    mapa.set(chave, linha ? { ...linha, ...acao } : { ...acao, ...visitasZeradas() })
  }

  return [...mapa.values()].map((linha) => ({ ...linha, ...calcularScoresProspeccao(linha) }))
}

function pluralizar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

function registrosUnicos(registros: RegistroItemEngajamento[]): RegistroItemEngajamento[] {
  const mapa = new Map<string, RegistroItemEngajamento>()
  for (const registro of registros) {
    const chave = `${registro.href}|${registro.rotulo}`
    if (!mapa.has(chave)) mapa.set(chave, registro)
  }
  return [...mapa.values()]
}

export function calcularItensEngajamentoLeads(cliente: ClienteSaudeVisitas): ItemEngajamento[] {
  const dados: ClienteSaudeComAcoes = cliente
  const visitas = cliente.visitas ?? []
  const acoes = dados.acoes ?? []

  const registrosAta: RegistroItemEngajamento[] = [
    ...visitas
      .filter((visita) => !!visita.relato?.trim())
      .map((visita) => ({
        id: visita.id,
        rotulo: `Visita #${visita.id}`,
        href: `/comercial/crm/visitas/${visita.id}`,
      })),
    ...acoes
      .filter((acao) => !!acao.relato?.trim())
      .map((acao) => ({
        id: acao.id,
        rotulo: `Ação de Prospecção #${acao.id}`,
        href: `/comercial/crm/acoes-prospeccao/${acao.id}`,
      })),
  ]

  const registrosCheckIn: RegistroItemEngajamento[] = [
    ...visitas
      .filter((visita) => !!visita.checkInTime || !!visita.checkOutTime)
      .map((visita) => ({
        id: visita.id,
        rotulo: `Visita #${visita.id}`,
        href: `/comercial/crm/visitas/${visita.id}`,
      })),
    ...acoes
      .filter((acao) => !!acao.checkInTime || !!acao.checkOutTime)
      .map((acao) => ({
        id: acao.id,
        rotulo: `Ação de Prospecção #${acao.id}`,
        href: `/comercial/crm/acoes-prospeccao/${acao.id}`,
      })),
  ]

  const registrosContato = registrosUnicos([
    ...visitas
      .filter((visita) => visita.contatoId != null)
      .map((visita) => ({
        id: visita.contatoId ?? visita.id,
        rotulo: visita.contatoNome ?? `Contato #${visita.contatoId}`,
        href: `/comercial/crm/visitas/${visita.id}`,
      })),
    ...acoes
      .filter((acao) => acao.contatoId != null)
      .map((acao) => ({
        id: acao.contatoId ?? acao.id,
        rotulo: acao.contatoNome ?? `Contato #${acao.contatoId}`,
        href: `/comercial/crm/acoes-prospeccao/${acao.id}`,
      })),
  ])

  const registrosProposta = registrosUnicos([
    ...visitas
      .filter((visita) => visita.propostaId != null)
      .map((visita) => ({
        id: visita.propostaId ?? visita.id,
        rotulo: visita.propostaTitulo ?? `Proposta #${visita.propostaId}`,
        href: `/comercial/crm/propostas/${visita.propostaId}`,
      })),
    ...acoes
      .filter((acao) => acao.propostaId != null)
      .map((acao) => ({
        id: acao.propostaId ?? acao.id,
        rotulo: acao.propostaTitulo ?? `Proposta #${acao.propostaId}`,
        href: `/comercial/crm/propostas/${acao.propostaId}`,
      })),
  ])

  const registrosOportunidade = registrosUnicos([
    ...visitas
      .filter((visita) => visita.oportunidadeId != null)
      .map((visita) => ({
        id: visita.oportunidadeId ?? visita.id,
        rotulo: visita.oportunidadeTitulo ?? `Oportunidade #${visita.oportunidadeId}`,
        href: `/comercial/crm/oportunidades/${visita.oportunidadeId}`,
      })),
    ...acoes
      .filter((acao) => acao.oportunidadeId != null)
      .map((acao) => ({
        id: acao.oportunidadeId ?? acao.id,
        rotulo: acao.oportunidadeTitulo ?? `Oportunidade #${acao.oportunidadeId}`,
        href: `/comercial/crm/oportunidades/${acao.oportunidadeId}`,
      })),
  ])

  const quantidades: Record<ChaveItemEngajamento, number> = {
    ata: registrosAta.length || cliente.visitasComRelato + (dados.acoesComRelato ?? 0),
    checkIn: registrosCheckIn.length || cliente.visitasComCheckIn + (dados.acoesComCheckIn ?? 0),
    contato: registrosContato.length || (cliente.temContato ? 1 : 0),
    proposta: registrosProposta.length || (cliente.temProposta ? 1 : 0),
    oportunidade: registrosOportunidade.length || (cliente.temOportunidade ? 1 : 0),
  }

  const presentes: Record<ChaveItemEngajamento, boolean> = {
    ata: quantidades.ata > 0,
    checkIn: quantidades.checkIn > 0,
    contato: quantidades.contato > 0,
    proposta: quantidades.proposta > 0,
    oportunidade: quantidades.oportunidade > 0,
  }

  const detalhes: Record<ChaveItemEngajamento, string> = {
    ata: quantidades.ata
      ? pluralizar(quantidades.ata, "visita/ação com relato", "visitas/ações com relato")
      : "Sem relato/ata registrado",
    checkIn: quantidades.checkIn
      ? pluralizar(
          quantidades.checkIn,
          "visita/ação com check-in/check-out",
          "visitas/ações com check-in/check-out"
        )
      : "Sem check-in/check-out registrado",
    contato: quantidades.contato
      ? pluralizar(quantidades.contato, "contato vinculado", "contatos vinculados")
      : "Sem contato vinculado",
    proposta: quantidades.proposta
      ? pluralizar(quantidades.proposta, "proposta vinculada", "propostas vinculadas")
      : "Sem proposta vinculada",
    oportunidade: quantidades.oportunidade
      ? pluralizar(quantidades.oportunidade, "oportunidade vinculada", "oportunidades vinculadas")
      : "Sem oportunidade vinculada",
  }

  const registros: Record<ChaveItemEngajamento, RegistroItemEngajamento[]> = {
    ata: registrosAta,
    checkIn: registrosCheckIn,
    contato: registrosContato,
    proposta: registrosProposta,
    oportunidade: registrosOportunidade,
  }

  return ITENS_ENGAJAMENTO.map((item) => ({
    ...item,
    presente: presentes[item.chave],
    quantidade: quantidades[item.chave],
    detalhe: detalhes[item.chave],
    registros: registros[item.chave],
  }))
}

export function obterEngajamentoLeads(cliente: ClienteSaudeVisitas): {
  itens: ItemEngajamento[]
  resumo: ResumoEngajamento
} {
  const itens = calcularItensEngajamentoLeads(cliente)
  return { itens, resumo: calcularResumoEngajamento(itens) }
}

export function calcularConversaoLeads(cliente: ClienteSaudeVisitas): ResumoConversao {
  const { total } = totals(cliente)
  const convertidos = cliente.pedidosVenda + cliente.faturamentos
  const percentual = total > 0 ? Math.min(100, Math.round((convertidos / total) * 100)) : 0
  const tom =
    percentual === 0 ? "vermelho" : percentual < 25 ? "amarelo" : percentual < 50 ? "azul" : "verde"
  const rotulo =
    total === 0
      ? "Sem prospecção"
      : percentual === 0
        ? "Sem conversão"
        : percentual < 25
          ? "Baixa"
          : percentual < 50
            ? "Parcial"
            : "Alta"

  return { percentual, rotulo, tom, total, rotuloTotal: "registros de prospecção" }
}

export function obterDetalheScoreLeads(
  cliente: ClienteSaudeVisitas,
  tipo: TipoScore
): DetalheScore {
  const { realizadas, agendadas, relatos, checkIns } = totals(cliente)
  const componentes =
    tipo === "Esforço"
      ? [
          {
            rotulo: "Visita/ação realizada",
            descricao: `${realizadas} visitas/ações realizadas no período`,
            pontos: realizadas > 0 ? PONTOS_ESFORCO_BASE : 0,
            presente: realizadas > 0,
          },
          {
            rotulo: "Relato/ata",
            descricao: `${relatos} visitas/ações com relato preenchido`,
            pontos: relatos > 0 ? PONTOS_ESFORCO_BASE : 0,
            presente: relatos > 0,
          },
          {
            rotulo: "Check-in",
            descricao: `${checkIns} visitas/ações com check-in/check-out`,
            pontos: checkIns > 0 ? PONTOS_ESFORCO_BASE : 0,
            presente: checkIns > 0,
          },
          {
            rotulo: "Contato",
            descricao: cliente.temContato
              ? "Contato vinculado às visitas/ações"
              : "Sem contato vinculado",
            pontos: cliente.temContato ? PONTOS_ESFORCO_BASE : 0,
            presente: cliente.temContato,
          },
          {
            rotulo: "Proposta",
            descricao: cliente.temProposta ? "Proposta vinculada" : "Sem proposta vinculada",
            pontos: cliente.temProposta ? PONTOS_ESFORCO_DESTAQUE : 0,
            presente: cliente.temProposta,
          },
          {
            rotulo: "Oportunidade",
            descricao: cliente.temOportunidade ? "Oportunidade vinculada" : "Sem oportunidade vinculada",
            pontos: cliente.temOportunidade ? PONTOS_ESFORCO_DESTAQUE : 0,
            presente: cliente.temOportunidade,
          },
        ]
      : [
          {
            rotulo: "Visita/ação realizada",
            descricao: `${realizadas} visitas/ações realizadas no período`,
            pontos: realizadas > 0 ? 20 : 0,
            presente: realizadas > 0,
          },
          {
            rotulo: "Visita/ação agendada",
            descricao: `${agendadas} visitas/ações agendadas`,
            pontos: agendadas > 0 ? 10 : 0,
            presente: agendadas > 0,
          },
          {
            rotulo: "Proposta negociada",
            descricao: `${cliente.propostasNegociadas} propostas negociadas para frente`,
            pontos: cliente.propostasNegociadas > 0 ? 20 : 0,
            presente: cliente.propostasNegociadas > 0,
          },
          {
            rotulo: "Oportunidade negociada",
            descricao: `${cliente.oportunidadesNegociadas} oportunidades negociadas para frente`,
            pontos: cliente.oportunidadesNegociadas > 0 ? 20 : 0,
            presente: cliente.oportunidadesNegociadas > 0,
          },
          {
            rotulo: "Pedido de venda",
            descricao: `${cliente.pedidosVenda} pedidos de venda vinculados`,
            pontos: cliente.pedidosVenda > 0 ? 15 : 0,
            presente: cliente.pedidosVenda > 0,
          },
          {
            rotulo: "Faturamento",
            descricao: `${cliente.faturamentos} faturamentos vinculados`,
            pontos: cliente.faturamentos > 0 ? 15 : 0,
            presente: cliente.faturamentos > 0,
          },
        ]

  return {
    componentes,
    total: Math.min(
      100,
      componentes.reduce((soma, componente) => soma + componente.pontos, 0)
    ),
  }
}

export function classificarAlertaLeads(linha: ClienteSaudeVisitas) {
  return classificarAlerta(linha)
}

function normalizar(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function filtrarClientesSaudeLeads<T extends ClienteSaudeVisitas>(
  linhas: T[],
  filtros: FiltrosSaude
): T[] {
  const dados: ClienteSaudeComAcoes[] = linhas
  const busca = normalizar(filtros.busca)
  return linhas.filter((linha, indice) => {
    const acoes = dados[indice]
    if (
      busca &&
      !normalizar(linha.nome).includes(busca) &&
      !normalizar(linha.documento).includes(busca) &&
      !normalizar(linha.segmento).includes(busca)
    ) {
      return false
    }
    if (filtros.segmento && linha.segmento !== filtros.segmento) return false
    if (filtros.porte && linha.porte !== filtros.porte) return false
    if (filtros.responsavel && !linha.responsaveis.includes(filtros.responsavel)) return false
    if (
      filtros.statusVisita &&
      !linha.statusVisitas.includes(filtros.statusVisita) &&
      !acoes.statusAcoes?.includes(filtros.statusVisita)
    ) {
      return false
    }
    if (
      filtros.statusOportunidade &&
      !linha.statusOportunidades.includes(filtros.statusOportunidade)
    ) {
      return false
    }
    if (
      filtros.tipoVisita &&
      !linha.tiposVisita.includes(filtros.tipoVisita) &&
      !acoes.tiposAcao?.includes(filtros.tipoVisita)
    ) {
      return false
    }
    if (filtros.apenasAlertas && classificarAlertaLeads(linha).rotulo === "BEC") return false
    return true
  })
}
