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
vi.mock("@/lib/notificar", () => ({ notificarErro: vi.fn(), notificar: vi.fn(), registrarLog: vi.fn() }))

const sessao = { userId: 7, session: { user: { id: "7", role: "ADMIN" } } }
function dataLocal(deltaDias: number): string {
  const data = new Date(); data.setDate(data.getDate() + deltaDias)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`
}
const dataUltima = dataLocal(-7)
const dataProxima = dataLocal(30)

const acao = {
  id: 1, clienteId: 10, empresaId: 20, contatoId: 30, propostaId: 40, oportunidadeId: 50, viagemId: 99,
  dataAcao: dataUltima, hora: "10:00", tipo: "PRESENCIAL", status: "REALIZADA", relato: "Ata da a��o",
  checkInTime: `${dataUltima}T10:00:00.000Z`, checkOutTime: `${dataUltima}T11:00:00.000Z`, nomeAvulso: null,
  endereco: "Rua A", numero: "100", complemento: "Sala 1", bairro: "Centro", cidade: "S�o Paulo", uf: "SP",
  clienteNome: "Cliente SA", clienteCnpj: "12345678000190", clienteSegmento: null,
  empresaNome: "Pessoa Alpha", empresaNomeFantasia: "Alpha", empresaNomePessoa: "Alpha Pessoa", empresaCnpj: null, empresaCpf: null, empresaSegmento: "T�xtil", empresaPorte: "M�dio",
  contatoNome: "Jo�o", propostaTitulo: "Proposta 40", propostaStatus: "NEGOCIADA",
  oportunidadeTitulo: "Oportunidade 50", oportunidadeStatus: "NEGOCIADA", oportunidadeValor: "1000.00", oportunidadeProbabilidade: "50",
  responsavelNome: "Maria", viagemTitulo: "Viagem SP",
}
const acaoAgendada = { ...acao, id: 2, dataAcao: dataProxima, hora: "14:00", status: "AGENDADA", relato: null, checkInTime: null, checkOutTime: null, contatoId: null, propostaId: null, oportunidadeId: null, contatoNome: null, propostaTitulo: null, propostaStatus: null, oportunidadeTitulo: null, oportunidadeStatus: null, oportunidadeValor: null, oportunidadeProbabilidade: null }

function mockarConsultaSucesso() {
  vi.mocked(db.select)
    .mockReturnValueOnce(createQueryBuilder([acao, acaoAgendada]))
    .mockReturnValueOnce(createQueryBuilder([{ id: 20, clienteId: 10, segmento: "T�xtil", porte: "M�dio", razaoSocial: "Pessoa Alpha", nome: "Alpha Pessoa", cnpj: null, cpf: null }]))
    .mockReturnValueOnce(createQueryBuilder([{ id: 10, nome: "Cliente SA", cnpj: "12345678000190", segmento: null }]))
    .mockReturnValueOnce(createQueryBuilder([{ id: 40, oportunidadeId: 50, titulo: "Proposta 40", status: "NEGOCIADA" }]))
    .mockReturnValueOnce(createQueryBuilder([{ id: 60, oportunidadeId: 50 }]))
    .mockReturnValueOnce(createQueryBuilder([{ id: 70, oportunidadeId: 50 }]))
    .mockReturnValueOnce(createQueryBuilder([{ donoId: 60, valorTotal: "300.00" }]))
    .mockReturnValueOnce(createQueryBuilder([{ donoId: 70, valorTotal: "200.00" }]))
}

beforeEach(() => {
  resetDb(db)
  vi.mocked(requireAuth).mockReset()
  vi.mocked(notificarErro).mockReset()
  vi.mocked(requireAuth).mockResolvedValue(sessao as Awaited<ReturnType<typeof requireAuth>>)
})

describe("GET /api/crm/acoes-prospeccao/dashboard/clientes", () => {
  it("devolve 401 quando n�o h� sess�o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(NextResponse.json({ error: "N�o autorizado" }, { status: 401 }))
    const resposta = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard/clientes"))
    expect(resposta.status).toBe(401)
    expect(db.select).not.toHaveBeenCalled()
  })

  it("agrupa por cliente promovido e calcula scores", async () => {
    mockarConsultaSucesso()
    const resposta = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard/clientes?mine=true"))
    const dados = await resposta.json()
    expect(resposta.status).toBe(200)
    expect(dados).toHaveLength(1)
    expect(dados[0]).toMatchObject({ id: 10, tipo: "cliente", nome: "Cliente SA", totalAcoes: 2, acoesRealizadas: 1, acoesAgendadas: 1, temContato: true, temProposta: true, temOportunidade: true })
    expect(dados[0].acoes.find((v: { id: number }) => v.id === 1)).toMatchObject({ id: 1, dataAcao: dataUltima, relato: "Ata da a��o", oportunidadeId: 50 })
  })

  it("devolve lista vazia quando n�o h� a��es no per�odo", async () => {
    vi.mocked(db.select).mockReturnValueOnce(createQueryBuilder([]))
    const resposta = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard/clientes"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual([])
  })
})
