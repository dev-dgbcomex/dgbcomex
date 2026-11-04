import { db } from "@/lib/db"
import { logs } from "@/lib/db/schema/logs"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { crmTarefas } from "@/lib/db/schema/crm-tarefas"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { clientes } from "@/lib/db/schema/clientes"
import { usuarios } from "@/lib/db/schema/usuarios"
import { listarConversoes } from "@/lib/crm/historico-promocao"
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm"

export type PeriodoKey = "dia" | "semana" | "mes" | "periodo"

export type Intervalo = {
  de: Date
  ate: Date
  rotulo: string
}

export const PERIODOS: { value: PeriodoKey; label: string }[] = [
  { value: "dia", label: "Hoje" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "periodo", label: "Período personalizado" },
]

export const CATEGORIAS_CRM = [
  { value: "pessoas", label: "Pessoas", entidade: "CrmPessoa" },
  { value: "oportunidades", label: "Oportunidades", entidade: "CrmOportunidade" },
  { value: "propostas", label: "Propostas", entidade: "CrmProposta" },
  { value: "visitas", label: "Visitas", entidade: "CrmVisita" },
  { value: "tarefas", label: "Tarefas", entidade: "CrmTarefa" },
  { value: "leads", label: "Leads", entidade: "CrmLead" },
  { value: "contatos", label: "Contatos", entidade: "CrmContato" },
] as const

export type CategoriaCrm = (typeof CATEGORIAS_CRM)[number]["value"]

export type FiltrosRelatorio = {
  periodo?: string | null
  de?: string | null
  ate?: string | null
  usuario?: string | null
  status?: string | null
  tipo?: string | null
  segmento?: string | null
  /** "com" = somente pessoas com tarja de cliente · "sem" = somente sem tarja. */
  tarja?: string | null
}

function inicioDoDia(data: Date): Date {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return d
}

function fimDoDia(data: Date): Date {
  const d = new Date(data)
  d.setHours(23, 59, 59, 999)
  return d
}

function inicioDoMes(data: Date): Date {
  const d = new Date(data)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Resolve o intervalo do período escolhido (dia, semana, mês ou personalizado). */
export function resolverIntervalo(
  periodo?: string | null,
  de?: string | null,
  ate?: string | null
): Intervalo {
  const agora = new Date()

  if (periodo === "periodo") {
    const inicio = de ? new Date(`${de}T00:00:00`) : inicioDoDia(agora)
    const fim = ate ? fimDoDia(new Date(`${ate}T00:00:00`)) : fimDoDia(agora)
    const rotulo = `${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`
    return { de: inicio, ate: fim, rotulo }
  }

  if (periodo === "semana") {
    const inicio = new Date(agora)
    inicio.setDate(inicio.getDate() - 6)
    return {
      de: inicioDoDia(inicio),
      ate: fimDoDia(agora),
      rotulo: "Últimos 7 dias",
    }
  }

  if (periodo === "mes") {
    return {
      de: inicioDoMes(agora),
      ate: fimDoDia(agora),
      rotulo: "Mês atual",
    }
  }

  return { de: inicioDoDia(agora), ate: fimDoDia(agora), rotulo: "Hoje" }
}

/** Intervalos comparativos (dia, semana e mês) usados nos cards de atividade. */
export function intervalosComparativos(): Record<Exclude<PeriodoKey, "periodo">, Intervalo> {
  return {
    dia: resolverIntervalo("dia"),
    semana: resolverIntervalo("semana"),
    mes: resolverIntervalo("mes"),
  }
}

function categoriaDaEntidade(entidade: string | null): CategoriaCrm | null {
  const achada = CATEGORIAS_CRM.find((c) => c.entidade === entidade)
  return achada ? achada.value : null
}

export type ContagemAtividades = {
  pessoas: number
  oportunidades: number
  propostas: number
  visitas: number
  tarefas: number
  leads: number
  contatos: number
  total: number
}

export type LinhaAtividade = {
  id: number
  dataHora: string
  usuario: string
  acao: string
  entidade: string
  categoria: CategoriaCrm | null
  descricao: string
  pessoa: string | null
  cliente: string | null
}

function contagemVazia(): ContagemAtividades {
  return {
    pessoas: 0,
    oportunidades: 0,
    propostas: 0,
    visitas: 0,
    tarefas: 0,
    leads: 0,
    contatos: 0,
    total: 0,
  }
}

function somarNaContagem(contagem: ContagemAtividades, categoria: CategoriaCrm) {
  contagem[categoria] += 1
  contagem.total += 1
}

/**
 * Atividades registradas na tabela de logs (tudo que o usuário fez no CRM),
 * já enriquecidas com a pessoa e o cliente envolvidos.
 */
export async function consultarAtividades(filtros: FiltrosRelatorio) {
  const intervalo = resolverIntervalo(filtros.periodo, filtros.de, filtros.ate)
  const comparativos = intervalosComparativos()

  const entidades = CATEGORIAS_CRM.map((c) => c.entidade)

  const condicoes = [
    gte(logs.createdAt, intervalo.de),
    lte(logs.createdAt, intervalo.ate),
    inArray(logs.entidade, entidades as unknown as string[]),
  ]
  if (filtros.usuario) {
    condicoes.push(eq(logs.usuarioNome, filtros.usuario))
  }

  const registros: any[] = await db
    .select({
      id: logs.id,
      createdAt: logs.createdAt,
      usuarioNome: logs.usuarioNome,
      acao: logs.acao,
      entidade: logs.entidade,
      descricao: logs.descricao,
      entidadeId: logs.entidadeId,
      usuarioId: logs.usuarioId,
    })
    .from(logs)
    .where(and(...condicoes))
    .orderBy(desc(logs.createdAt))
    .limit(2000)

  const linhaPorEntidade = await enriquecerEntidades(registros)

  const atividades: LinhaAtividade[] = registros.map((r: any) => {
    const envolve = linhaPorEntidade.get(`${r.entidade}:${r.entidadeId}`)
    return {
      id: r.id,
      dataHora: new Date(r.createdAt).toISOString(),
      usuario: r.usuarioNome || "Usuário não identificado",
      acao: r.acao,
      entidade: r.entidade || "",
      categoria: categoriaDaEntidade(r.entidade),
      descricao: r.descricao || "",
      pessoa: envolve?.pessoa || null,
      cliente: envolve?.cliente || null,
    }
  })

  const contarPorCategoria = (linhas: LinhaAtividade[], acao?: string) => {
    const contagem = contagemVazia()
    for (const linha of linhas) {
      if (!linha.categoria) continue
      if (acao && linha.acao !== acao) continue
      somarNaContagem(contagem, linha.categoria)
    }
    return contagem
  }

  // Contagens comparativas (criação de registros) por usuário
  const usuariosLista = Array.from(
    new Set(atividades.map((a) => a.usuario).filter((u) => !!u))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"))

  const dentroDoIntervalo = (dataHora: string, intervaloAlvo: Intervalo) => {
    const data = new Date(dataHora)
    return data >= intervaloAlvo.de && data <= intervaloAlvo.ate
  }

  const porUsuario = usuariosLista.map((usuario) => {
    const doUsuario = atividades.filter((a) => a.usuario === usuario)
    const doIntervalo = (intervaloAlvo: Intervalo) =>
      contarPorCategoria(
        doUsuario.filter((a) => dentroDoIntervalo(a.dataHora, intervaloAlvo)),
        "criar"
      )
    return {
      usuario,
      dia: doIntervalo(comparativos.dia),
      semana: doIntervalo(comparativos.semana),
      mes: doIntervalo(comparativos.mes),
      periodo: doIntervalo(intervalo),
    }
  })

  const porIntervalo = (intervaloAlvo: Intervalo) =>
    contarPorCategoria(
      atividades.filter((a) => dentroDoIntervalo(a.dataHora, intervaloAlvo)),
      "criar"
    )

  const totalAtividadesIntervalo = atividades.length

  return {
    periodo: {
      de: intervalo.de.toISOString(),
      ate: intervalo.ate.toISOString(),
      rotulo: intervalo.rotulo,
    },
    resumo: {
      dia: porIntervalo(comparativos.dia),
      semana: porIntervalo(comparativos.semana),
      mes: porIntervalo(comparativos.mes),
      periodo: porIntervalo(intervalo),
      totalAtividades: totalAtividadesIntervalo,
    },
    porUsuario,
    atividades,
  }
}

async function enriquecerEntidades(registros: any[]) {
  const mapa = new Map<string, { pessoa: string | null; cliente: string | null }>()

  const ids = (entidade: string) =>
    registros
      .filter((r) => r.entidade === entidade && r.entidadeId)
      .map((r) => r.entidadeId as number)

  const idsPessoa = ids("CrmPessoa")
  if (idsPessoa.length > 0) {
    const pessoas: any[] = await db
      .select({
        id: crmPessoas.id,
        nome: crmPessoas.nome,
        razaoSocial: crmPessoas.razaoSocial,
        nomeFantasia: crmPessoas.nomeFantasia,
        clienteId: crmPessoas.clienteId,
      })
      .from(crmPessoas)
      .where(inArray(crmPessoas.id, idsPessoa))
    const clienteIds = pessoas.map((p) => p.clienteId).filter((c): c is number => !!c)
    const nomesClientes: any[] = clienteIds.length
      ? await db
          .select({ id: clientes.id, nome: clientes.nome })
          .from(clientes)
          .where(inArray(clientes.id, clienteIds))
      : []
    const mapaClientes = new Map<number, string>(nomesClientes.map((c) => [c.id, c.nome as string]))
    for (const pessoa of pessoas) {
      mapa.set(`CrmPessoa:${pessoa.id}`, {
        pessoa: (pessoa.nome || pessoa.nomeFantasia || pessoa.razaoSocial || "Pessoa") as string,
        cliente: pessoa.clienteId ? mapaClientes.get(pessoa.clienteId) || null : null,
      })
    }
  }

  const idsOportunidade = ids("CrmOportunidade")
  if (idsOportunidade.length > 0) {
    const oportunidades: any[] = await db
      .select({
        id: crmOportunidades.id,
        titulo: crmOportunidades.titulo,
        empresaId: crmOportunidades.empresaId,
        clienteId: crmOportunidades.clienteId,
      })
      .from(crmOportunidades)
      .where(inArray(crmOportunidades.id, idsOportunidade))
    const nomes = await nomesPessoasEClientes(
      oportunidades.map((o) => o.empresaId),
      oportunidades.map((o) => o.clienteId)
    )
    for (const oportunidade of oportunidades) {
      mapa.set(`CrmOportunidade:${oportunidade.id}`, {
        pessoa: nomes.pessoas.get(oportunidade.empresaId || 0) || oportunidade.titulo,
        cliente: nomes.clientes.get(oportunidade.clienteId || 0) || null,
      })
    }
  }

  const idsProposta = ids("CrmProposta")
  if (idsProposta.length > 0) {
    const propostas: any[] = await db
      .select({
        id: crmPropostas.id,
        titulo: crmPropostas.titulo,
        empresaId: crmPropostas.empresaId,
        clienteId: crmPropostas.clienteId,
      })
      .from(crmPropostas)
      .where(inArray(crmPropostas.id, idsProposta))
    const nomes = await nomesPessoasEClientes(
      propostas.map((p) => p.empresaId),
      propostas.map((p) => p.clienteId)
    )
    for (const proposta of propostas) {
      mapa.set(`CrmProposta:${proposta.id}`, {
        pessoa: nomes.pessoas.get(proposta.empresaId || 0) || proposta.titulo,
        cliente: nomes.clientes.get(proposta.clienteId || 0) || null,
      })
    }
  }

  const idsVisita = ids("CrmVisita")
  if (idsVisita.length > 0) {
    const visitas: any[] = await db
      .select({
        id: crmVisitas.id,
        empresaId: crmVisitas.empresaId,
        clienteId: crmVisitas.clienteId,
        nomeAvulso: crmVisitas.nomeAvulso,
      })
      .from(crmVisitas)
      .where(inArray(crmVisitas.id, idsVisita))
    const nomes = await nomesPessoasEClientes(
      visitas.map((v) => v.empresaId),
      visitas.map((v) => v.clienteId)
    )
    for (const visita of visitas) {
      mapa.set(`CrmVisita:${visita.id}`, {
        pessoa: nomes.pessoas.get(visita.empresaId || 0) || visita.nomeAvulso || "Visita avulsa",
        cliente: nomes.clientes.get(visita.clienteId || 0) || null,
      })
    }
  }

  const idsContato = ids("CrmContato")
  if (idsContato.length > 0) {
    const contatos: any[] = await db
      .select({
        id: crmContatos.id,
        nome: crmContatos.nome,
        empresaId: crmContatos.empresaId,
        clienteId: crmContatos.clienteId,
      })
      .from(crmContatos)
      .where(inArray(crmContatos.id, idsContato))
    const nomes = await nomesPessoasEClientes(
      contatos.map((c) => c.empresaId),
      contatos.map((c) => c.clienteId)
    )
    for (const contato of contatos) {
      mapa.set(`CrmContato:${contato.id}`, {
        pessoa: nomes.pessoas.get(contato.empresaId || 0) || contato.nome,
        cliente: nomes.clientes.get(contato.clienteId || 0) || null,
      })
    }
  }

  const idsTarefa = ids("CrmTarefa")
  if (idsTarefa.length > 0) {
    const tarefas: any[] = await db
      .select({
        id: crmTarefas.id,
        titulo: crmTarefas.titulo,
        empresaId: crmTarefas.empresaId,
      })
      .from(crmTarefas)
      .where(inArray(crmTarefas.id, idsTarefa))
    const nomes = await nomesPessoasEClientes(
      tarefas.map((t) => t.empresaId),
      []
    )
    for (const tarefa of tarefas) {
      mapa.set(`CrmTarefa:${tarefa.id}`, {
        pessoa: nomes.pessoas.get(tarefa.empresaId || 0) || tarefa.titulo,
        cliente: null,
      })
    }
  }

  const idsLead = ids("CrmLead")
  if (idsLead.length > 0) {
    const leads: any[] = await db
      .select({
        id: crmLeads.id,
        nome: crmLeads.nome,
        empresaNome: crmLeads.empresaNome,
        pessoaId: crmLeads.pessoaId,
      })
      .from(crmLeads)
      .where(inArray(crmLeads.id, idsLead))
    const nomes = await nomesPessoasEClientes(
      leads.map((l) => l.pessoaId),
      []
    )
    for (const lead of leads) {
      mapa.set(`CrmLead:${lead.id}`, {
        pessoa: lead.empresaNome || nomes.pessoas.get(lead.pessoaId || 0) || lead.nome,
        cliente: null,
      })
    }
  }

  return mapa
}

async function nomesPessoasEClientes(empresaIds: (number | null)[], clienteIds: (number | null)[]) {
  const idsPessoa = Array.from(new Set(empresaIds.filter((id): id is number => !!id)))
  const idsCliente = Array.from(new Set(clienteIds.filter((id): id is number => !!id)))

  const pessoas: any[] = idsPessoa.length
    ? await db
        .select({
          id: crmPessoas.id,
          nome: crmPessoas.nome,
          razaoSocial: crmPessoas.razaoSocial,
          nomeFantasia: crmPessoas.nomeFantasia,
        })
        .from(crmPessoas)
        .where(inArray(crmPessoas.id, idsPessoa))
    : []

  const listaClientes: any[] = idsCliente.length
    ? await db
        .select({ id: clientes.id, nome: clientes.nome })
        .from(clientes)
        .where(inArray(clientes.id, idsCliente))
    : []

  return {
    pessoas: new Map<number, string>(
      pessoas.map((p) => [p.id, (p.nome || p.nomeFantasia || p.razaoSocial || "Pessoa") as string])
    ),
    clientes: new Map<number, string>(listaClientes.map((c) => [c.id, c.nome as string])),
  }
}

/** Relatório de oportunidades do CRM. */
export async function consultarOportunidades(filtros: FiltrosRelatorio) {
  const intervalo = resolverIntervalo(filtros.periodo, filtros.de, filtros.ate)

  const condicoes = [
    gte(crmOportunidades.createdAt, intervalo.de),
    lte(crmOportunidades.createdAt, intervalo.ate),
  ]
  if (filtros.status) condicoes.push(eq(crmOportunidades.status, filtros.status))
  if (filtros.usuario) condicoes.push(eq(crmOportunidades.responsavelId, Number(filtros.usuario)))

  const linhas: any[] = await db
    .select({
      id: crmOportunidades.id,
      titulo: crmOportunidades.titulo,
      status: crmOportunidades.status,
      valorEstimado: crmOportunidades.valorEstimado,
      probabilidade: crmOportunidades.probabilidade,
      createdAt: crmOportunidades.createdAt,
      updatedAt: crmOportunidades.updatedAt,
      empresaId: crmOportunidades.empresaId,
      clienteId: crmOportunidades.clienteId,
      responsavelId: crmOportunidades.responsavelId,
      responsavelNome: usuarios.name,
    })
    .from(crmOportunidades)
    .leftJoin(usuarios, eq(crmOportunidades.responsavelId, usuarios.id))
    .where(and(...condicoes))
    .orderBy(desc(crmOportunidades.createdAt))
    .limit(1000)

  const nomes = await nomesPessoasEClientes(
    linhas.map((l) => l.empresaId),
    linhas.map((l) => l.clienteId)
  )

  const dados = linhas.map((l: any) => ({
    id: l.id,
    dataHora: new Date(l.createdAt).toISOString(),
    titulo: l.titulo,
    pessoa: nomes.pessoas.get(l.empresaId || 0) || null,
    cliente: nomes.clientes.get(l.clienteId || 0) || null,
    responsavel: l.responsavelNome || null,
    status: l.status,
    valor: l.valorEstimado ? Number(l.valorEstimado) : 0,
    probabilidade: l.probabilidade || 0,
  }))

  const total = dados.length
  const ganhas = dados.filter((d) => d.status === "FECHADO_GANHO")
  const perdidas = dados.filter((d) => d.status === "FECHADO_PERDIDO")
  const emAberto = dados.filter(
    (d) => d.status !== "FECHADO_GANHO" && d.status !== "FECHADO_PERDIDO"
  )
  const valorTotal = dados.reduce((acc, d) => acc + d.valor, 0)

  return {
    periodo: {
      de: intervalo.de.toISOString(),
      ate: intervalo.ate.toISOString(),
      rotulo: intervalo.rotulo,
    },
    cards: {
      total,
      emAberto: emAberto.length,
      ganhas: ganhas.length,
      perdidas: perdidas.length,
      valorTotal,
      valorGanho: ganhas.reduce((acc, d) => acc + d.valor, 0),
      taxaConversao: total > 0 ? Number(((ganhas.length / total) * 100).toFixed(1)) : 0,
      mediaValor: total > 0 ? Number((valorTotal / total).toFixed(2)) : 0,
    },
    linhas: dados,
  }
}

/** Relatório de propostas do CRM. */
export async function consultarPropostas(filtros: FiltrosRelatorio) {
  const intervalo = resolverIntervalo(filtros.periodo, filtros.de, filtros.ate)

  const condicoes = [
    gte(crmPropostas.createdAt, intervalo.de),
    lte(crmPropostas.createdAt, intervalo.ate),
  ]
  if (filtros.status) condicoes.push(eq(crmPropostas.status, filtros.status))
  if (filtros.usuario) condicoes.push(eq(crmPropostas.criadoPor, Number(filtros.usuario)))

  const linhas: any[] = await db
    .select({
      id: crmPropostas.id,
      titulo: crmPropostas.titulo,
      status: crmPropostas.status,
      valor: crmPropostas.valor,
      createdAt: crmPropostas.createdAt,
      dataEnvio: crmPropostas.dataEnvio,
      dataResposta: crmPropostas.dataResposta,
      empresaId: crmPropostas.empresaId,
      clienteId: crmPropostas.clienteId,
      criadoPor: crmPropostas.criadoPor,
      responsavelNome: usuarios.name,
    })
    .from(crmPropostas)
    .leftJoin(usuarios, eq(crmPropostas.criadoPor, usuarios.id))
    .where(and(...condicoes))
    .orderBy(desc(crmPropostas.createdAt))
    .limit(1000)

  const nomes = await nomesPessoasEClientes(
    linhas.map((l) => l.empresaId),
    linhas.map((l) => l.clienteId)
  )

  const dados = linhas.map((l: any) => ({
    id: l.id,
    dataHora: new Date(l.createdAt).toISOString(),
    titulo: l.titulo,
    pessoa: nomes.pessoas.get(l.empresaId || 0) || null,
    cliente: nomes.clientes.get(l.clienteId || 0) || null,
    responsavel: l.responsavelNome || null,
    status: l.status,
    valor: l.valor ? Number(l.valor) : 0,
    dataResposta: l.dataResposta ? new Date(l.dataResposta).toISOString() : null,
  }))

  const total = dados.length
  const aceitas = dados.filter((d) => d.status === "ACEITA")
  const recusadas = dados.filter((d) => d.status === "RECUSADA")
  const valorTotal = dados.reduce((acc, d) => acc + d.valor, 0)

  return {
    periodo: {
      de: intervalo.de.toISOString(),
      ate: intervalo.ate.toISOString(),
      rotulo: intervalo.rotulo,
    },
    cards: {
      total,
      aceitas: aceitas.length,
      recusadas: recusadas.length,
      pendentes: total - aceitas.length - recusadas.length,
      valorTotal,
      valorAceito: aceitas.reduce((acc, d) => acc + d.valor, 0),
      taxaAceitacao: total > 0 ? Number(((aceitas.length / total) * 100).toFixed(1)) : 0,
    },
    linhas: dados,
  }
}

/** Relatório de visitas do CRM (presencial, vídeo e telefone). */
export async function consultarVisitas(filtros: FiltrosRelatorio) {
  const intervalo = resolverIntervalo(filtros.periodo, filtros.de, filtros.ate)

  const condicoes = [
    gte(crmVisitas.createdAt, intervalo.de),
    lte(crmVisitas.createdAt, intervalo.ate),
  ]
  if (filtros.status) condicoes.push(eq(crmVisitas.status, filtros.status))
  if (filtros.tipo) condicoes.push(eq(crmVisitas.tipo, filtros.tipo))
  if (filtros.usuario) condicoes.push(eq(crmVisitas.criadoPor, Number(filtros.usuario)))

  const linhas: any[] = await db
    .select({
      id: crmVisitas.id,
      dataVisita: crmVisitas.dataVisita,
      hora: crmVisitas.hora,
      tipo: crmVisitas.tipo,
      status: crmVisitas.status,
      createdAt: crmVisitas.createdAt,
      cidade: crmVisitas.cidade,
      uf: crmVisitas.uf,
      nomeAvulso: crmVisitas.nomeAvulso,
      relato: crmVisitas.relato,
      empresaId: crmVisitas.empresaId,
      clienteId: crmVisitas.clienteId,
      criadoPor: crmVisitas.criadoPor,
      responsavelNome: usuarios.name,
    })
    .from(crmVisitas)
    .leftJoin(usuarios, eq(crmVisitas.criadoPor, usuarios.id))
    .where(and(...condicoes))
    .orderBy(desc(crmVisitas.dataVisita))
    .limit(1000)

  const nomes = await nomesPessoasEClientes(
    linhas.map((l) => l.empresaId),
    linhas.map((l) => l.clienteId)
  )

  const dados = linhas.map((l: any) => ({
    id: l.id,
    dataHora: `${l.dataVisita}${l.hora ? ` ${l.hora}` : ""}`,
    dataHoraIso: new Date(l.createdAt).toISOString(),
    tipo: l.tipo,
    status: l.status,
    pessoa: nomes.pessoas.get(l.empresaId || 0) || l.nomeAvulso || null,
    cliente: nomes.clientes.get(l.clienteId || 0) || null,
    responsavel: l.responsavelNome || null,
    local: l.cidade ? `${l.cidade}${l.uf ? `/${l.uf}` : ""}` : null,
  }))

  const total = dados.length
  const porTipo = (tipo: string) => dados.filter((d) => d.tipo === tipo).length
  const concluidas = dados.filter(
    (d) => d.status === "CONCLUIDA" || d.status === "REALIZADA"
  ).length

  return {
    periodo: {
      de: intervalo.de.toISOString(),
      ate: intervalo.ate.toISOString(),
      rotulo: intervalo.rotulo,
    },
    cards: {
      total,
      presencial: porTipo("PRESENCIAL"),
      video: porTipo("VIDEO"),
      telefone: porTipo("TELEFONE"),
      concluidas,
      taxaComparecimento: total > 0 ? Number(((concluidas / total) * 100).toFixed(1)) : 0,
    },
    linhas: dados,
  }
}

/** Relatório de pessoas (cadastro do CRM). */
export async function consultarPessoas(filtros: FiltrosRelatorio) {
  const intervalo = resolverIntervalo(filtros.periodo, filtros.de, filtros.ate)

  const condicoes = [
    gte(crmPessoas.createdAt, intervalo.de),
    lte(crmPessoas.createdAt, intervalo.ate),
  ]
  if (filtros.segmento) condicoes.push(eq(crmPessoas.segmento, filtros.segmento))
  if (filtros.usuario) condicoes.push(eq(crmPessoas.responsavelId, Number(filtros.usuario)))
  if (filtros.tarja === "com") condicoes.push(eq(crmPessoas.promovidaCliente, true))
  if (filtros.tarja === "sem") condicoes.push(eq(crmPessoas.promovidaCliente, false))

  const linhas: any[] = await db
    .select({
      id: crmPessoas.id,
      tipoPessoa: crmPessoas.tipoPessoa,
      nome: crmPessoas.nome,
      razaoSocial: crmPessoas.razaoSocial,
      nomeFantasia: crmPessoas.nomeFantasia,
      cpf: crmPessoas.cpf,
      cnpj: crmPessoas.cnpj,
      segmento: crmPessoas.segmento,
      cidade: crmPessoas.cidade,
      uf: crmPessoas.uf,
      status: crmPessoas.status,
      createdAt: crmPessoas.createdAt,
      clienteId: crmPessoas.clienteId,
      responsavelId: crmPessoas.responsavelId,
      responsavelNome: usuarios.name,
      promovidaCliente: crmPessoas.promovidaCliente,
      promovidoEm: crmPessoas.promovidoEm,
      promovidoPorNome: crmPessoas.promovidoPorNome,
    })
    .from(crmPessoas)
    .leftJoin(usuarios, eq(crmPessoas.responsavelId, usuarios.id))
    .where(and(...condicoes))
    .orderBy(desc(crmPessoas.createdAt))
    .limit(1000)

  const dados = linhas.map((l: any) => ({
    id: l.id,
    dataHora: new Date(l.createdAt).toISOString(),
    nome: l.nome || l.nomeFantasia || l.razaoSocial || "Pessoa",
    tipoPessoa: l.tipoPessoa,
    documento: l.cnpj || l.cpf || null,
    segmento: l.segmento || null,
    cidade: l.cidade ? `${l.cidade}${l.uf ? `/${l.uf}` : ""}` : null,
    status: l.status,
    responsavel: l.responsavelNome || null,
    clienteVinculado: !!l.clienteId,
    promovidaCliente: !!l.promovidaCliente,
    promovidoEm: l.promovidoEm ? new Date(l.promovidoEm).toISOString() : null,
    promovidoPorNome: l.promovidoPorNome || null,
  }))

  const total = dados.length

  return {
    periodo: {
      de: intervalo.de.toISOString(),
      ate: intervalo.ate.toISOString(),
      rotulo: intervalo.rotulo,
    },
    cards: {
      total,
      pessoasFisicas: dados.filter((d) => d.tipoPessoa === "PF").length,
      pessoasJuridicas: dados.filter((d) => d.tipoPessoa === "PJ").length,
      convertidasEmCliente: dados.filter((d) => d.clienteVinculado).length,
      comTarja: dados.filter((d) => d.promovidaCliente).length,
      comSegmento: dados.filter((d) => !!d.segmento).length,
    },
    linhas: dados,
  }
}

/** Relatório de conversões: pessoas que viraram cliente (tarja) no período. */
export async function consultarConversoes(filtros: FiltrosRelatorio) {
  const intervalo = resolverIntervalo(filtros.periodo, filtros.de, filtros.ate)

  const conversoes = await listarConversoes({
    de: intervalo.de,
    ate: intervalo.ate,
    usuarioId: filtros.usuario ? Number(filtros.usuario) : null,
  })

  const linhas = conversoes.map((c) => ({
    ...c,
    dataHora: c.dataHora,
  }))

  const total = linhas.length
  const somaPropostas = linhas.reduce((acc, l) => acc + Number(l.valorPropostas || 0), 0)
  const somaOportunidades = linhas.reduce((acc, l) => acc + Number(l.valorOportunidades || 0), 0)

  return {
    periodo: {
      de: intervalo.de.toISOString(),
      ate: intervalo.ate.toISOString(),
      rotulo: intervalo.rotulo,
    },
    cards: {
      total,
      oportunidades: linhas.reduce((acc, l) => acc + (l.oportunidades || 0), 0),
      propostas: linhas.reduce((acc, l) => acc + (l.propostas || 0), 0),
      visitas: linhas.reduce((acc, l) => acc + (l.visitas || 0), 0),
      valorPropostas: somaPropostas,
      valorOportunidades: somaOportunidades,
      mediaValorPropostas: total > 0 ? Number((somaPropostas / total).toFixed(2)) : 0,
    },
    linhas,
  }
}

/** Lista de usuários ativos para os filtros dos relatórios. */
export async function listarUsuariosAtividade(): Promise<{ id: number; nome: string }[]> {
  const resultado: any[] = await db
    .select({ id: usuarios.id, nome: usuarios.name })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(asc(usuarios.name))

  return resultado.map((u: any) => ({ id: u.id, nome: u.nome }))
}
