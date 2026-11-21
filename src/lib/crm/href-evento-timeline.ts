export type EventoTimelineParaHref = {
  id?: number | null
  tipo?: string | null
  metadados?: unknown
}

type MetadadosEvento = Record<string, unknown>

function metadadosEvento(evento: EventoTimelineParaHref): MetadadosEvento {
  const bruto = evento?.metadados
  if (!bruto) return {}
  if (typeof bruto === "string") {
    try {
      const analisado: unknown = JSON.parse(bruto)
      if (analisado && typeof analisado === "object" && !Array.isArray(analisado)) {
        return analisado as MetadadosEvento
      }
      return {}
    } catch {
      return {}
    }
  }
  if (typeof bruto === "object" && !Array.isArray(bruto)) return bruto as MetadadosEvento
  return {}
}

function idMetadado(metadados: MetadadosEvento, ...chaves: string[]): number | null {
  for (const chave of chaves) {
    const valor = metadados[chave]
    if (valor === undefined || valor === null || valor === "") continue
    const numero = Number(valor)
    if (Number.isFinite(numero) && numero > 0) return numero
  }
  return null
}

export function resumoIdEventoTimeline(evento: EventoTimelineParaHref): number | null {
  return idMetadado(metadadosEvento(evento), "resumoId")
}

export function hrefEventoTimeline(evento: EventoTimelineParaHref): string | null {
  const metadados = metadadosEvento(evento)
  switch (evento?.tipo) {
    case "LEAD": {
      const id = idMetadado(metadados, "leadId", "empresaId")
      return id ? `/comercial/crm/leads/${id}` : null
    }
    case "VISITANTE": {
      const id = idMetadado(metadados, "visitanteId")
      return id ? `/comercial/crm/visitantes/${id}` : null
    }
    case "OPORTUNIDADE": {
      const id = idMetadado(metadados, "oportunidadeId")
      return id ? `/comercial/crm/oportunidades/${id}` : null
    }
    case "VISITA": {
      const id = idMetadado(metadados, "visitaId")
      return id ? `/comercial/crm/visitas/${id}` : null
    }
    case "ACAO_PROSPECCAO": {
      const id = idMetadado(metadados, "acaoProspeccaoId")
      return id ? `/comercial/crm/acoes-prospeccao/${id}` : null
    }
    case "TAREFA": {
      const id = idMetadado(metadados, "tarefaId")
      return id ? `/comercial/crm/tarefas?busca=${id}` : null
    }
    case "PROPOSTA": {
      const id = idMetadado(metadados, "propostaId")
      return id ? `/comercial/crm/propostas/${id}` : null
    }
    case "CONVERSAO_CLIENTE": {
      const id = idMetadado(metadados, "clienteId")
      return id ? `/comercial/clientes/${id}` : null
    }
    default:
      return null
  }
}
