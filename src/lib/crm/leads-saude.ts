import type {
  AcaoProspeccaoSaudeDetalhe,
  ClienteSaude as ClienteSaudeAcoes,
} from "./acoes-prospeccao-saude"
import type { ClienteSaude as ClienteSaudeVisitas, VisitaSaudeDetalhe } from "./visitas-saude"

export type ClienteSaudeLeads = ClienteSaudeVisitas & ClienteSaudeAcoes

type CamposAcoes = Omit<ClienteSaudeAcoes, keyof ClienteSaudeVisitas>
type CamposVisitas = Omit<ClienteSaudeVisitas, keyof ClienteSaudeAcoes>

export function chaveClienteSaude(item: Pick<ClienteSaudeVisitas, "id" | "tipo">): string {
  return `${item.tipo}:${item.id}`
}

function acoesDerivadasDasVisitas(visita: ClienteSaudeVisitas): CamposAcoes {
  return {
    statusAcoes: [...visita.statusVisitas],
    tiposAcao: [...visita.tiposVisita],
    totalAcoes: visita.totalVisitas,
    acoesRealizadas: visita.visitasRealizadas,
    acoesAgendadas: visita.visitasAgendadas,
    acoesCanceladas: visita.visitasCanceladas,
    ultimaAcao: visita.ultimaVisita,
    proximaAcao: visita.proximaVisita,
    acoesComRelato: visita.visitasComRelato,
    acoesComCheckIn: visita.visitasComCheckIn,
    acoes: visita.visitas.map(
      (item): AcaoProspeccaoSaudeDetalhe => ({
        id: item.id,
        dataAcao: item.dataVisita,
        hora: item.hora,
        tipo: item.tipo,
        status: item.status,
        relato: item.relato,
        checkInTime: item.checkInTime,
        checkOutTime: item.checkOutTime,
        empresaNome: item.empresaNome,
        clienteNome: item.clienteNome,
        nomeAvulso: item.nomeAvulso,
        oportunidadeId: item.oportunidadeId,
        oportunidadeTitulo: item.oportunidadeTitulo,
        oportunidadeStatus: item.oportunidadeStatus,
        oportunidadeValor: item.oportunidadeValor,
        oportunidadeProbabilidade: item.oportunidadeProbabilidade,
        propostaId: item.propostaId,
        propostaTitulo: item.propostaTitulo,
        propostaStatus: item.propostaStatus,
        contatoId: item.contatoId,
        contatoNome: item.contatoNome,
        criadoPorNome: item.criadoPorNome,
        enderecoTexto: item.enderecoTexto,
      })
    ),
  }
}

function visitasDerivadasDasAcoes(acao: ClienteSaudeAcoes): CamposVisitas {
  return {
    statusVisitas: [...acao.statusAcoes],
    tiposVisita: [...acao.tiposAcao],
    totalVisitas: acao.totalAcoes,
    visitasRealizadas: acao.acoesRealizadas,
    visitasAgendadas: acao.acoesAgendadas,
    visitasCanceladas: acao.acoesCanceladas,
    ultimaVisita: acao.ultimaAcao,
    proximaVisita: acao.proximaAcao,
    visitasComRelato: acao.acoesComRelato,
    visitasComCheckIn: acao.acoesComCheckIn,
    visitas: acao.acoes.map(
      (item): VisitaSaudeDetalhe => ({
        id: item.id,
        dataVisita: item.dataAcao,
        hora: item.hora,
        tipo: item.tipo,
        status: item.status,
        relato: item.relato,
        checkInTime: item.checkInTime,
        checkOutTime: item.checkOutTime,
        empresaNome: item.empresaNome,
        clienteNome: item.clienteNome,
        nomeAvulso: item.nomeAvulso,
        oportunidadeId: item.oportunidadeId,
        oportunidadeTitulo: item.oportunidadeTitulo,
        oportunidadeStatus: item.oportunidadeStatus,
        oportunidadeValor: item.oportunidadeValor,
        oportunidadeProbabilidade: item.oportunidadeProbabilidade,
        propostaId: item.propostaId,
        propostaTitulo: item.propostaTitulo,
        propostaStatus: item.propostaStatus,
        contatoId: item.contatoId,
        contatoNome: item.contatoNome,
        criadoPorNome: item.criadoPorNome,
        enderecoTexto: item.enderecoTexto,
      })
    ),
  }
}

export function mesclarSaudeProspeccao(
  visitas: ClienteSaudeVisitas[],
  acoes: ClienteSaudeAcoes[]
): ClienteSaudeLeads[] {
  const mapa = new Map<string, ClienteSaudeLeads>()

  for (const visita of visitas) {
    mapa.set(chaveClienteSaude(visita), {
      ...visita,
      ...acoesDerivadasDasVisitas(visita),
    })
  }

  for (const acao of acoes) {
    const chave = chaveClienteSaude(acao)
    const linha = mapa.get(chave)
    if (linha) {
      mapa.set(chave, { ...linha, ...acao })
      continue
    }
    mapa.set(chave, {
      ...acao,
      ...visitasDerivadasDasAcoes(acao),
    })
  }

  return [...mapa.values()]
}
