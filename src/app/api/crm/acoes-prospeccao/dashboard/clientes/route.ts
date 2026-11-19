import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmViagens } from "@/lib/db/schema/crm-viagens"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmFaturamentos } from "@/lib/db/schema/crm-faturamentos"
import { crmPedidoVendaItens } from "@/lib/db/schema/crm-pedido-venda-itens"
import { crmFaturamentoItens } from "@/lib/db/schema/crm-faturamento-itens"
import { clientes } from "@/lib/db/schema/clientes"
import { usuarios } from "@/lib/db/schema/usuarios"
import { and, desc, eq, gte, inArray, lt, or } from "drizzle-orm"
import {
  calcularDiferenca,
  calcularScores,
  isStatusNegociado,
  labelStatusOportunidade,
  type ClienteSaude,
  type AcaoProspeccaoSaudeDetalhe,
} from "@/lib/crm/acoes-prospeccao-saude"

export const dynamic = "force-dynamic"

type Dono = {
  key: string
  id: number
  tipo: "cliente" | "pessoa" | "avulso"
  nome: string
  documento: string | null
  segmento: string | null
  porte: string | null
}

type OportunidadeInfo = {
  titulo: string | null
  status: string | null
  valor: number
  probabilidade: number
}

type AcaoRaw = {
  id: number
  clienteId: number | null
  empresaId: number | null
  contatoId: number | null
  propostaId: number | null
  oportunidadeId: number | null
  viagemId: number | null
  dataAcao: string
  hora: string | null
  tipo: string | null
  status: string | null
  relato: string | null
  checkInTime: string | Date | null
  checkOutTime: string | Date | null
  nomeAvulso: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  clienteNome: string | null
  clienteCnpj: string | null
  clienteSegmento: string | null
  empresaNome: string | null
  empresaNomeFantasia: string | null
  empresaNomePessoa: string | null
  empresaCnpj: string | null
  empresaCpf: string | null
  empresaSegmento: string | null
  empresaPorte: string | null
  contatoNome: string | null
  propostaTitulo: string | null
  propostaStatus: string | null
  oportunidadeTitulo: string | null
  oportunidadeStatus: string | null
  oportunidadeValor: string | number | null
  oportunidadeProbabilidade: string | number | null
  responsavelNome: string | null
  viagemTitulo: string | null
}

type PessoaRelacionada = {
  id: number
  clienteId: number | null
  segmento: string | null
  porte: string | null
  razaoSocial: string | null
  nome: string | null
  cnpj: string | null
  cpf: string | null
}

type ClienteRow = {
  id: number
  nome: string | null
  cnpj: string | null
  segmento: string | null
}

type PropostaRow = {
  id: number
  oportunidadeId: number | null
  titulo: string | null
  status: string | null
}

type PedidoRow = { id: number; oportunidadeId: number | null }
type FaturamentoRow = { id: number; oportunidadeId: number | null }

function adicionarUnico<T>(lista: T[], valor: T | null | undefined) {
  if (valor == null || valor === "") return
  if (!lista.includes(valor)) lista.push(valor)
}

function primeiroValido(...valores: (string | null | undefined)[]): string | null {
  for (const valor of valores) {
    if (valor && valor.trim().length > 0) return valor
  }
  return null
}

function prioridadeStatus(status: string | null | undefined): number {
  if (!status) return -10
  const s = status.toUpperCase()
  if (s === "FECHADO_GANHO" || s === "GANHO" || s === "CONVERTIDO" || s === "ACEITO" || s === "ACEITA") return 5
  if (s === "NEGOCIADA" || s === "NEGOCIACAO" || s === "NEGOCIANDO") return 4
  if (s === "PROPOSTA") return 3
  if (s === "QUALIFICACAO" || s === "CONTATADO") return 2
  if (s === "NOVO") return 1
  return 0
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const isMine = searchParams.get("mine") === "true"

    const agora = new Date()
    const inicioAno = `${agora.getFullYear()}-01-01`
    const fimAno = `${agora.getFullYear() + 1}-01-01`
    const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(
      agora.getDate()
    ).padStart(2, "0")}`

    const condicaoBase = and(gte(crmAcoesProspeccao.dataAcao, inicioAno), lt(crmAcoesProspeccao.dataAcao, fimAno))
    const condicao = isMine
      ? and(condicaoBase, eq(crmAcoesProspeccao.criadoPor, auth.userId))
      : condicaoBase

    const acoesRaw = (await db
      .select({
        id: crmAcoesProspeccao.id,
        clienteId: crmAcoesProspeccao.clienteId,
        empresaId: crmAcoesProspeccao.empresaId,
        contatoId: crmAcoesProspeccao.contatoId,
        propostaId: crmAcoesProspeccao.propostaId,
        oportunidadeId: crmAcoesProspeccao.oportunidadeId,
        viagemId: crmAcoesProspeccao.viagemId,
        dataAcao: crmAcoesProspeccao.dataAcao,
        hora: crmAcoesProspeccao.hora,
        tipo: crmAcoesProspeccao.tipo,
        status: crmAcoesProspeccao.status,
        relato: crmAcoesProspeccao.relato,
        checkInTime: crmAcoesProspeccao.checkInTime,
        checkOutTime: crmAcoesProspeccao.checkOutTime,
        nomeAvulso: crmAcoesProspeccao.nomeAvulso,
        endereco: crmAcoesProspeccao.endereco,
        numero: crmAcoesProspeccao.numero,
        complemento: crmAcoesProspeccao.complemento,
        bairro: crmAcoesProspeccao.bairro,
        cidade: crmAcoesProspeccao.cidade,
        uf: crmAcoesProspeccao.uf,
        clienteNome: clientes.nome,
        clienteCnpj: clientes.cnpj,
        clienteSegmento: clientes.segmento,
        empresaNome: crmPessoas.razaoSocial,
        empresaNomeFantasia: crmPessoas.nomeFantasia,
        empresaNomePessoa: crmPessoas.nome,
        empresaCnpj: crmPessoas.cnpj,
        empresaCpf: crmPessoas.cpf,
        empresaSegmento: crmPessoas.segmento,
        empresaPorte: crmPessoas.porte,
        contatoNome: crmContatos.nome,
        propostaTitulo: crmPropostas.titulo,
        propostaStatus: crmPropostas.status,
        oportunidadeTitulo: crmOportunidades.titulo,
        oportunidadeStatus: crmOportunidades.status,
        oportunidadeValor: crmOportunidades.valorEstimado,
        oportunidadeProbabilidade: crmOportunidades.probabilidade,
        responsavelNome: usuarios.name,
        viagemTitulo: crmViagens.titulo,
      })
      .from(crmAcoesProspeccao)
      .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
      .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
      .leftJoin(crmContatos, eq(crmAcoesProspeccao.contatoId, crmContatos.id))
      .leftJoin(crmPropostas, eq(crmAcoesProspeccao.propostaId, crmPropostas.id))
      .leftJoin(crmOportunidades, eq(crmAcoesProspeccao.oportunidadeId, crmOportunidades.id))
      .leftJoin(usuarios, eq(crmAcoesProspeccao.criadoPor, usuarios.id))
      .leftJoin(crmViagens, eq(crmAcoesProspeccao.viagemId, crmViagens.id))
      .where(condicao)
      .orderBy(desc(crmAcoesProspeccao.dataAcao))) as AcaoRaw[]

    if (acoesRaw.length === 0) return NextResponse.json([])

    const empresaIds = Array.from(
      new Set(acoesRaw.map((v) => v.empresaId).filter((id): id is number => id != null))
    )
    const clienteIds = new Set(
      acoesRaw.map((v) => v.clienteId).filter((id): id is number => id != null)
    )
    const oportunidadeIds = new Set(
      acoesRaw.map((v) => v.oportunidadeId).filter((id): id is number => id != null)
    )

    const pessoasRelacionadas = (empresaIds.length
      ? await db
          .select({
            id: crmPessoas.id,
            clienteId: crmPessoas.clienteId,
            segmento: crmPessoas.segmento,
            porte: crmPessoas.porte,
            razaoSocial: crmPessoas.razaoSocial,
            nome: crmPessoas.nome,
            cnpj: crmPessoas.cnpj,
            cpf: crmPessoas.cpf,
          })
          .from(crmPessoas)
          .where(
            or(
              inArray(crmPessoas.id, empresaIds),
              clienteIds.size > 0 ? inArray(crmPessoas.clienteId, Array.from(clienteIds)) : undefined
            )
          )
      : []) as PessoaRelacionada[]

    const pessoaMap = new Map(pessoasRelacionadas.map((p) => [p.id, p]))
    for (const p of pessoasRelacionadas) {
      if (p.clienteId) clienteIds.add(p.clienteId)
    }

    const clientesMap = new Map<number, ClienteRow>()
    if (clienteIds.size > 0) {
      const clientesRows = (await db
        .select({
          id: clientes.id,
          nome: clientes.nome,
          cnpj: clientes.cnpj,
          segmento: clientes.segmento,
        })
        .from(clientes)
        .where(inArray(clientes.id, Array.from(clienteIds)))) as ClienteRow[]
      for (const c of clientesRows) clientesMap.set(c.id, c)
    }

    const donosPorAcao = new Map<number, Dono>()
    for (const v of acoesRaw) {
      if (v.clienteId && clientesMap.has(v.clienteId)) {
        const c = clientesMap.get(v.clienteId)!
        const pessoasDoCliente = pessoasRelacionadas.filter((p) => p.clienteId === c.id)
        donosPorAcao.set(v.id, {
          key: `cliente:${c.id}`,
          id: c.id,
          tipo: "cliente",
          nome: c.nome ?? "Sem nome",
          documento: c.cnpj,
          segmento: primeiroValido(c.segmento, ...pessoasDoCliente.map((p) => p.segmento)),
          porte: primeiroValido(...pessoasDoCliente.map((p) => p.porte)),
        })
        continue
      }

      const pessoa = v.empresaId ? pessoaMap.get(v.empresaId) : undefined
      if (pessoa?.clienteId && clientesMap.has(pessoa.clienteId)) {
        const c = clientesMap.get(pessoa.clienteId)!
        const pessoasDoCliente = pessoasRelacionadas.filter((p) => p.clienteId === c.id)
        donosPorAcao.set(v.id, {
          key: `cliente:${c.id}`,
          id: c.id,
          tipo: "cliente",
          nome: c.nome ?? "Sem nome",
          documento: c.cnpj,
          segmento: primeiroValido(c.segmento, ...pessoasDoCliente.map((p) => p.segmento)),
          porte: primeiroValido(...pessoasDoCliente.map((p) => p.porte)),
        })
        continue
      }

      if (pessoa) {
        donosPorAcao.set(v.id, {
          key: `pessoa:${pessoa.id}`,
          id: pessoa.id,
          tipo: "pessoa",
          nome: primeiroValido(pessoa.razaoSocial, pessoa.nome, v.empresaNomeFantasia) ?? "Sem nome",
          documento: primeiroValido(pessoa.cnpj, pessoa.cpf),
          segmento: pessoa.segmento,
          porte: pessoa.porte,
        })
        continue
      }

      donosPorAcao.set(v.id, {
        key: `avulso:${v.id}`,
        id: v.id,
        tipo: "avulso",
        nome: v.nomeAvulso || "A��o de prospec��o avulsa",
        documento: null,
        segmento: null,
        porte: null,
      })
    }

    const oportunidadesInfo = new Map<number, OportunidadeInfo>()
    const oportunidadeDono = new Map<number, string>()
    const propostasInfo = new Map<number, { titulo: string | null; status: string | null }>()

    for (const v of acoesRaw) {
      const dono = donosPorAcao.get(v.id)
      if (v.oportunidadeId) {
        if (!oportunidadesInfo.has(v.oportunidadeId)) {
          oportunidadesInfo.set(v.oportunidadeId, {
            titulo: v.oportunidadeTitulo,
            status: v.oportunidadeStatus,
            valor: Number(v.oportunidadeValor ?? 0),
            probabilidade: Number(v.oportunidadeProbabilidade ?? 0),
          })
        }
        if (dono && !oportunidadeDono.has(v.oportunidadeId)) {
          oportunidadeDono.set(v.oportunidadeId, dono.key)
        }
      }
      if (v.propostaId && !propostasInfo.has(v.propostaId)) {
        propostasInfo.set(v.propostaId, { titulo: v.propostaTitulo, status: v.propostaStatus })
      }
    }

    const idsOportunidades = Array.from(oportunidadeIds)
    const [propostasPorOportunidade, pedidosPorOportunidade, faturamentosPorOportunidade] =
      (await Promise.all([
        idsOportunidades.length
          ? db
              .select({ id: crmPropostas.id, oportunidadeId: crmPropostas.oportunidadeId, titulo: crmPropostas.titulo, status: crmPropostas.status })
              .from(crmPropostas)
              .where(inArray(crmPropostas.oportunidadeId, idsOportunidades))
          : Promise.resolve<PropostaRow[]>([]),
        idsOportunidades.length
          ? db
              .select({ id: crmPedidosVenda.id, oportunidadeId: crmPedidosVenda.oportunidadeId })
              .from(crmPedidosVenda)
              .where(inArray(crmPedidosVenda.oportunidadeId, idsOportunidades))
          : Promise.resolve<PedidoRow[]>([]),
        idsOportunidades.length
          ? db
              .select({ id: crmFaturamentos.id, oportunidadeId: crmFaturamentos.oportunidadeId })
              .from(crmFaturamentos)
              .where(inArray(crmFaturamentos.oportunidadeId, idsOportunidades))
          : Promise.resolve<FaturamentoRow[]>([]),
      ])) as [PropostaRow[], PedidoRow[], FaturamentoRow[]]

    for (const p of propostasPorOportunidade) {
      if (!propostasInfo.has(p.id)) {
        propostasInfo.set(p.id, { titulo: p.titulo, status: p.status })
      }
    }

    const somarItensPedido = async (ids: number[]) => {
      const mapa = new Map<number, number>()
      if (ids.length === 0) return mapa
      const itens = await db
        .select({
          donoId: crmPedidoVendaItens.pedidoVendaId,
          valorTotal: crmPedidoVendaItens.valorTotal,
        })
        .from(crmPedidoVendaItens)
        .where(inArray(crmPedidoVendaItens.pedidoVendaId, ids))
      for (const item of itens) {
        if (item.donoId == null) continue
        mapa.set(item.donoId, (mapa.get(item.donoId) ?? 0) + Number(item.valorTotal ?? 0))
      }
      return mapa
    }

    const somarItensFaturamento = async (ids: number[]) => {
      const mapa = new Map<number, number>()
      if (ids.length === 0) return mapa
      const itens = await db
        .select({
          donoId: crmFaturamentoItens.faturamentoId,
          valorTotal: crmFaturamentoItens.valorTotal,
        })
        .from(crmFaturamentoItens)
        .where(inArray(crmFaturamentoItens.faturamentoId, ids))
      for (const item of itens) {
        if (item.donoId == null) continue
        mapa.set(item.donoId, (mapa.get(item.donoId) ?? 0) + Number(item.valorTotal ?? 0))
      }
      return mapa
    }

    const [itensPedidos, itensFaturamentos] = await Promise.all([
      somarItensPedido(pedidosPorOportunidade.map((p) => p.id)),
      somarItensFaturamento(faturamentosPorOportunidade.map((f) => f.id)),
    ])

    const pedidosAgg = new Map<number, { count: number; total: number }>()
    for (const p of pedidosPorOportunidade) {
      if (p.oportunidadeId == null) continue
      const atual = pedidosAgg.get(p.oportunidadeId) ?? { count: 0, total: 0 }
      pedidosAgg.set(p.oportunidadeId, {
        count: atual.count + 1,
        total: atual.total + (itensPedidos.get(p.id) ?? 0),
      })
    }

    const faturamentosAgg = new Map<number, { count: number; total: number }>()
    for (const f of faturamentosPorOportunidade) {
      if (f.oportunidadeId == null) continue
      const atual = faturamentosAgg.get(f.oportunidadeId) ?? { count: 0, total: 0 }
      faturamentosAgg.set(f.oportunidadeId, {
        count: atual.count + 1,
        total: atual.total + (itensFaturamentos.get(f.id) ?? 0),
      })
    }

    const grupos = new Map<string, ClienteSaude>()
    const oportunidadesPorGrupo = new Map<string, Set<number>>()
    const propostasPorGrupo = new Map<string, Set<number>>()

    for (const v of acoesRaw) {
      const dono = donosPorAcao.get(v.id)
      if (!dono) continue

      let grupo = grupos.get(dono.key)
      if (!grupo) {
        grupo = {
          id: dono.id,
          tipo: dono.tipo === "avulso" ? "pessoa" : dono.tipo,
          nome: dono.nome,
          documento: dono.documento,
          segmento: dono.segmento,
          porte: dono.porte,
          responsaveis: [],
          statusAcoes: [],
          tiposAcao: [],
          statusOportunidades: [],
          totalAcoes: 0,
          acoesRealizadas: 0,
          acoesAgendadas: 0,
          acoesCanceladas: 0,
          ultimaAcao: null,
          proximaAcao: null,
          acoesComRelato: 0,
          acoesComCheckIn: 0,
          temContato: false,
          temProposta: false,
          temOportunidade: false,
          propostasNegociadas: 0,
          oportunidadesNegociadas: 0,
          valorEstimadoTotal: 0,
          probabilidadeMedia: 0,
          statusOportunidadeDominante: null,
          pedidosVenda: 0,
          valorPedidosVenda: 0,
          faturamentos: 0,
          valorFaturamento: 0,
          scoreEsforco: 0,
          scoreEngajamento: 0,
          acoes: [],
        }
        grupos.set(dono.key, grupo)
      }

      grupo.totalAcoes += 1
      if (v.status === "REALIZADA") grupo.acoesRealizadas += 1
      if (v.status === "AGENDADA") grupo.acoesAgendadas += 1
      if (v.status === "CANCELADA") grupo.acoesCanceladas += 1
      if (v.relato?.trim()) grupo.acoesComRelato += 1
      if (v.checkInTime) grupo.acoesComCheckIn += 1
      if (
        v.dataAcao &&
        v.dataAcao <= hoje &&
        (!grupo.ultimaAcao || v.dataAcao > grupo.ultimaAcao)
      ) {
        grupo.ultimaAcao = v.dataAcao
      }
      if (
        v.status === "AGENDADA" &&
        v.dataAcao &&
        v.dataAcao >= hoje &&
        (!grupo.proximaAcao || v.dataAcao < grupo.proximaAcao)
      ) {
        grupo.proximaAcao = v.dataAcao
      }

      adicionarUnico(grupo.statusAcoes, v.status)
      adicionarUnico(grupo.tiposAcao, v.tipo)
      adicionarUnico(grupo.responsaveis, v.responsavelNome)

      if (v.contatoId) grupo.temContato = true
      if (v.propostaId) {
        grupo.temProposta = true
        if (!propostasPorGrupo.has(dono.key)) propostasPorGrupo.set(dono.key, new Set())
        propostasPorGrupo.get(dono.key)!.add(v.propostaId)
      }
      if (v.oportunidadeId) {
        grupo.temOportunidade = true
        if (!oportunidadesPorGrupo.has(dono.key)) oportunidadesPorGrupo.set(dono.key, new Set())
        oportunidadesPorGrupo.get(dono.key)!.add(v.oportunidadeId)
        adicionarUnico(grupo.statusOportunidades, v.oportunidadeStatus)
      }

      const enderecoTexto = [
        v.endereco,
        v.numero,
        v.complemento,
        v.bairro,
        v.cidade,
        v.uf,
      ]
        .filter(Boolean)
        .join(", ")

      const detalhe: AcaoProspeccaoSaudeDetalhe = {
        id: v.id,
        dataAcao: v.dataAcao,
        hora: v.hora,
        tipo: v.tipo ?? "NÃO_INFORMADO",
        status: v.status ?? "NÃO_INFORMADO",
        relato: v.relato,
        checkInTime: v.checkInTime ? new Date(v.checkInTime).toISOString() : null,
        checkOutTime: v.checkOutTime ? new Date(v.checkOutTime).toISOString() : null,
        empresaNome: primeiroValido(v.empresaNome, v.empresaNomePessoa, v.empresaNomeFantasia),
        clienteNome: v.clienteNome,
        nomeAvulso: v.nomeAvulso,
        oportunidadeId: v.oportunidadeId,
        oportunidadeTitulo: v.oportunidadeTitulo,
        oportunidadeStatus: v.oportunidadeStatus,
        oportunidadeValor: Number(v.oportunidadeValor ?? 0),
        oportunidadeProbabilidade: Number(v.oportunidadeProbabilidade ?? 0),
        propostaId: v.propostaId,
        propostaTitulo: v.propostaTitulo,
        propostaStatus: v.propostaStatus,
        contatoId: v.contatoId,
        contatoNome: v.contatoNome,
        criadoPorNome: v.responsavelNome,
        enderecoTexto: enderecoTexto || null,
      }
      grupo.acoes.push(detalhe)
    }

    for (const p of propostasPorOportunidade) {
      const donoKey = p.oportunidadeId ? oportunidadeDono.get(p.oportunidadeId) : undefined
      if (!donoKey) continue
      const grupo = grupos.get(donoKey)
      if (!grupo) continue
      grupo.temProposta = true
      if (!propostasPorGrupo.has(donoKey)) propostasPorGrupo.set(donoKey, new Set())
      propostasPorGrupo.get(donoKey)!.add(p.id)
      adicionarUnico(grupo.statusOportunidades, p.status)
    }

    for (const [donoKey, oportunidades] of oportunidadesPorGrupo) {
      const grupo = grupos.get(donoKey)
      if (!grupo) continue

      let valorTotal = 0
      let somaProbabilidade = 0
      let qtdProbabilidade = 0
      let melhorStatus: string | null = null
      let melhorPrioridade = -999

      for (const id of oportunidades) {
        const info = oportunidadesInfo.get(id)
        if (!info) continue
        valorTotal += info.valor
        adicionarUnico(grupo.statusOportunidades, info.status)
        if (info.probabilidade != null) {
          somaProbabilidade += info.probabilidade
          qtdProbabilidade += 1
        }
        const prioridade = prioridadeStatus(info.status)
        if (prioridade > melhorPrioridade) {
          melhorPrioridade = prioridade
          melhorStatus = info.status
        }
      }

      grupo.valorEstimadoTotal = valorTotal
      grupo.probabilidadeMedia = qtdProbabilidade > 0 ? Math.round(somaProbabilidade / qtdProbabilidade) : 0
      grupo.statusOportunidadeDominante = melhorStatus ? labelStatusOportunidade(melhorStatus) : null

      let pedidosCount = 0
      let pedidosTotal = 0
      let faturamentosCount = 0
      let faturamentosTotal = 0

      for (const id of oportunidades) {
        const pedido = pedidosAgg.get(id)
        if (pedido) {
          pedidosCount += pedido.count
          pedidosTotal += pedido.total
        }
        const faturamento = faturamentosAgg.get(id)
        if (faturamento) {
          faturamentosCount += faturamento.count
          faturamentosTotal += faturamento.total
        }
      }

      grupo.pedidosVenda = pedidosCount
      grupo.valorPedidosVenda = pedidosTotal
      grupo.faturamentos = faturamentosCount
      grupo.valorFaturamento = faturamentosTotal
    }

    for (const [donoKey, grupo] of grupos) {
      const propostasNegociadas = Array.from(propostasPorGrupo.get(donoKey) ?? []).filter((id) =>
        isStatusNegociado(propostasInfo.get(id)?.status)
      ).length

      const oportunidadesNegociadas = Array.from(oportunidadesPorGrupo.get(donoKey) ?? []).filter(
        (id) => isStatusNegociado(oportunidadesInfo.get(id)?.status)
      ).length

      const scores = calcularScores({
        acoesRealizadas: grupo.acoesRealizadas,
        acoesAgendadas: grupo.acoesAgendadas,
        acoesComRelato: grupo.acoesComRelato,
        acoesComCheckIn: grupo.acoesComCheckIn,
        temContato: grupo.temContato,
        temProposta: grupo.temProposta,
        temOportunidade: grupo.temOportunidade,
        propostasNegociadas,
        oportunidadesNegociadas,
        pedidosVenda: grupo.pedidosVenda,
        faturamentos: grupo.faturamentos,
      })

      grupo.scoreEsforco = scores.scoreEsforco
      grupo.scoreEngajamento = scores.scoreEngajamento
      grupo.propostasNegociadas = propostasNegociadas
      grupo.oportunidadesNegociadas = oportunidadesNegociadas
      grupo.responsaveis = grupo.responsaveis.filter((r, i, arr) => arr.indexOf(r) === i && r.length > 0)
      grupo.statusAcoes = grupo.statusAcoes.filter((s, i, arr) => arr.indexOf(s) === i && s.length > 0)
      grupo.tiposAcao = grupo.tiposAcao.filter((t, i, arr) => arr.indexOf(t) === i && t.length > 0)
      grupo.statusOportunidades = grupo.statusOportunidades.filter((s, i, arr) => arr.indexOf(s) === i && s.length > 0)
      grupo.acoes.sort((a, b) => (b.dataAcao ?? "").localeCompare(a.dataAcao ?? ""))
    }

    const resultado = Array.from(grupos.values()).sort(
      (a, b) => calcularDiferenca(b) - calcularDiferenca(a) || b.totalAcoes - a.totalAcoes
    )

    return NextResponse.json(resultado)
  } catch (error) {
    return handleApiError(error, "GET /api/crm/acoes-prospeccao/dashboard/clientes")
  }
}
