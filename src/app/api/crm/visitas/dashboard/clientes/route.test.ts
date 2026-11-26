// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notificarErro } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/notificar", () => ({
  notificarErro: vi.fn(),
  notificar: vi.fn(),
  registrarLog: vi.fn(),
}))

const sessao = { userId: 7, session: { user: { id: "7", role: "ADMIN" } } }

function dataLocal(deltaDias: number): string {
  const data = new Date()
  data.setDate(data.getDate() + deltaDias)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(
    data.getDate()
  ).padStart(2, "0")}`
}

const dataUltima = dataLocal(-7)
const dataProxima = dataLocal(30)

const visita = {
  id: 1,
  clienteId: 10,
  empresaId: 20,
  contatoId: 30,
  propostaId: 40,
  oportunidadeId: 50,
  viagemId: 99,
  dataVisita: dataUltima,
  hora: "10:00",
  tipo: "PRESENCIAL",
  status: "REALIZADA",
  relato: "Ata da visita",
  checkInTime: `${dataUltima}T10:00:00.000Z`,
  checkOutTime: `${dataUltima}T11:00:00.000Z`,
  nomeAvulso: null,
  endereco: "Rua A",
  numero: "100",
  complemento: "Sala 1",
  bairro: "Centro",
  cidade: "São Paulo",
  uf: "SP",
  clienteNome: "Cliente SA",
  clienteCnpj: "12345678000190",
  clienteSegmento: null,
  empresaNome: "Pessoa Alpha",
  empresaNomeFantasia: "Alpha",
  empresaNomePessoa: "Alpha Pessoa",
  empresaCnpj: null,
  empresaCpf: null,
  empresaSegmento: "Têxtil",
  empresaPorte: "Médio",
  contatoNome: "João",
  propostaTitulo: "Proposta 40",
  propostaStatus: "NEGOCIADA",
  oportunidadeTitulo: "Oportunidade 50",
  oportunidadeStatus: "NEGOCIADA",
  oportunidadeValor: "1000.00",
  oportunidadeProbabilidade: "50",
  responsavelNome: "Maria",
  viagemTitulo: "Viagem SP",
}

const visitaAgendada = {
  ...visita,
  id: 2,
  dataVisita: dataProxima,
  hora: "14:00",
  status: "AGENDADA",
  relato: null,
  checkInTime: null,
  checkOutTime: null,
  contatoId: null,
  propostaId: null,
  oportunidadeId: null,
  contatoNome: null,
  propostaTitulo: null,
  propostaStatus: null,
  oportunidadeTitulo: null,
  oportunidadeStatus: null,
  oportunidadeValor: null,
  oportunidadeProbabilidade: null,
}

function mockarConsultaSucesso() {
  vi.mocked(db.select)
    .mockReturnValueOnce(createQueryBuilder([visita, visitaAgendada]))
    .mockReturnValueOnce(
      createQueryBuilder([
        {
          id: 20,
          clienteId: 10,
          segmento: "Têxtil",
          porte: "Médio",
          razaoSocial: "Pessoa Alpha",
          nome: "Alpha Pessoa",
          cnpj: null,
          cpf: null,
        },
      ])
    )
    .mockReturnValueOnce(
      createQueryBuilder([{ id: 10, nome: "Cliente SA", cnpj: "12345678000190", segmento: null }])
    )
    .mockReturnValueOnce(
      createQueryBuilder([
        { id: 40, oportunidadeId: 50, titulo: "Proposta 40", status: "NEGOCIADA" },
      ])
    )
    .mockReturnValueOnce(createQueryBuilder([{ id: 60, oportunidadeId: 50 }]))
    .mockReturnValueOnce(createQueryBuilder([{ id: 70, oportunidadeId: 50 }]))
    .mockReturnValueOnce(
      createQueryBuilder([{ donoId: 60, valorTotal: "300.00" }])
    )
    .mockReturnValueOnce(
      createQueryBuilder([{ donoId: 70, valorTotal: "200.00" }])
    )
}

beforeEach(() => {
  resetDb(db)
  vi.mocked(requireAuth).mockReset()
  vi.mocked(notificarErro).mockReset()
  vi.mocked(requireAuth).mockResolvedValue(sessao as Awaited<ReturnType<typeof requireAuth>>)
})

describe("GET /api/crm/visitas/dashboard/clientes", () => {
  it("devolve 401 quando não há sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    )

    const resposta = await GET(new NextRequest("http://localhost/api/crm/visitas/dashboard/clientes"))

    expect(resposta.status).toBe(401)
    expect(db.select).not.toHaveBeenCalled()
  })

  it("agrupa por cliente promovido e calcula scores com pedidos e faturamentos via oportunidade", async () => {
    mockarConsultaSucesso()

    const resposta = await GET(
      new NextRequest("http://localhost/api/crm/visitas/dashboard/clientes?mine=true")
    )
    const dados = await resposta.json()

    expect(resposta.status).toBe(200)
    expect(dados).toHaveLength(1)
    expect(dados[0]).toMatchObject({
      id: 10,
      tipo: "cliente",
      nome: "Cliente SA",
      documento: "12345678000190",
      segmento: "Têxtil",
      porte: "Médio",
      responsaveis: ["Maria"],
      totalVisitas: 2,
      visitasRealizadas: 1,
      visitasAgendadas: 1,
      ultimaVisita: dataUltima,
      proximaVisita: dataProxima,
      visitasComRelato: 1,
      visitasComCheckIn: 1,
      temContato: true,
      temProposta: true,
      temOportunidade: true,
      propostasNegociadas: 1,
      oportunidadesNegociadas: 1,
      valorEstimadoTotal: 1000,
      totalOportunidades: 1,
      probabilidadeMedia: 50,
      statusOportunidadeDominante: "Negociada",
      pedidosVenda: 1,
      valorPedidosVenda: 300,
      faturamentos: 1,
      valorFaturamento: 200,
      scoreEsforco: 100,
      scoreEngajamento: 100,
    })
    expect(dados[0].visitas.find((visita: { id: number }) => visita.id === 1)).toMatchObject({
      id: 1,
      dataVisita: dataUltima,
      relato: "Ata da visita",
      oportunidadeId: 50,
      propostaId: 40,
      contatoNome: "João",
      enderecoTexto: "Rua A, 100, Sala 1, Centro, São Paulo, SP",
    })
  })

  it("devolve lista vazia quando não há visitas no período", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))

    const resposta = await GET(
      new NextRequest("http://localhost/api/crm/visitas/dashboard/clientes")
    )

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual([])
  })

  it("trata erro de consulta com 500 e notificação", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error("falha no banco")
    })

    const resposta = await GET(
      new NextRequest("http://localhost/api/crm/visitas/dashboard/clientes")
    )

    expect(resposta.status).toBe(500)
    expect(notificarErro).toHaveBeenCalled()
    spy.mockRestore()
  })
})
