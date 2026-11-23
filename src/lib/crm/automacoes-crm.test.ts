// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/lib/db"
import { inserirTimelineEvento } from "@/lib/crm-timeline"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { executarGatilhos } from "@/lib/crm/status-gatilhos"
import { promoverLeadParaCliente } from "@/lib/crm/promover-cliente"
import { registrarLog, notificar } from "@/lib/notificar"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { processarAutomacaoCRM } from "./automacoes-crm"

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}))
vi.mock("@/lib/notificar", () => ({ registrarLog: vi.fn(), notificar: vi.fn() }))
vi.mock("@/lib/crm-timeline", () => ({ inserirTimelineEvento: vi.fn() }))
vi.mock("@/lib/crm/notificar-atividade", () => ({ notificarAtividadeComercial: vi.fn() }))
vi.mock("@/lib/crm/status-gatilhos", () => ({ executarGatilhos: vi.fn(() => ({
  executadas: [],
  puladas: [],
  erros: [],
})) }))
vi.mock("@/lib/crm/promover-cliente", () => ({ promoverLeadParaCliente: vi.fn() }))

const lead = {
  id: 4,
  nome: "Malhas Brasil",
  razaoSocial: null,
  cnpj: "11.222.333/0001-44",
  status: "NOVO",
  promovidaCliente: false,
  arquivado: false,
  clienteId: null,
}

const oportunidade = {
  id: 10,
  titulo: "Venda de malha",
  status: "NEGOCIACAO",
  empresaId: 4,
  leadId: null,
  clienteId: null,
  contatoId: null,
  responsavelId: 2,
}

describe("processarAutomacaoCRM", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(registrarLog).mockReset()
    vi.mocked(notificar).mockReset()
    vi.mocked(inserirTimelineEvento).mockReset()
    vi.mocked(notificarAtividadeComercial).mockReset()
    vi.mocked(executarGatilhos).mockClear()
    vi.mocked(promoverLeadParaCliente).mockReset()
  })

  it("bloqueia a qualificação sem oportunidade", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([lead]))
      .mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await processarAutomacaoCRM({
      entidade: "LEAD",
      entidadeId: 4,
      acao: "ALTERAR_STATUS",
      statusNovo: "QUALIFICADO",
    })

    expect(resultado.ok).toBe(false)
    expect(resultado.bloqueio).toMatch(/crie uma oportunidade/i)
  })

  it("só converte a lead quando o usuário confirma a decisão", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([lead]))
      .mockReturnValueOnce(createQueryBuilder([]))
    vi.mocked(promoverLeadParaCliente).mockResolvedValue({
      pessoa: { id: 4 },
      cliente: { id: 9 },
    } as never)

    const resultado = await processarAutomacaoCRM({
      entidade: "LEAD",
      entidadeId: 4,
      acao: "ALTERAR_STATUS",
      statusNovo: "CONVERTIDO_CLIENTE",
      decisao: "CONVERTER",
      autor: { id: 1, nome: "Tiago" },
    })

    expect(resultado.ok).toBe(true)
    expect(promoverLeadParaCliente).toHaveBeenCalledWith(
      expect.objectContaining({ pessoaId: 4, usuarioNome: "Tiago" })
    )
  })

  it("exige pedido do ERP para fechar como ganho", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([oportunidade]))
      .mockReturnValueOnce(createQueryBuilder([lead]))
      .mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await processarAutomacaoCRM({
      entidade: "OPORTUNIDADE",
      entidadeId: 10,
      acao: "ALTERAR_STATUS",
      statusNovo: "FECHADO_GANHO",
    })

    expect(resultado.ok).toBe(false)
    expect(resultado.bloqueio).toMatch(/pedido do ERP/i)
  })

  it("pede uma decisão ao perder a última oportunidade da lead", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(createQueryBuilder([oportunidade]))
      .mockReturnValueOnce(createQueryBuilder([lead]))
      .mockReturnValueOnce(createQueryBuilder([]))

    const resultado = await processarAutomacaoCRM({
      entidade: "OPORTUNIDADE",
      entidadeId: 10,
      acao: "ALTERAR_STATUS",
      statusNovo: "FECHADO_PERDIDO",
      motivoPerda: "Cliente optou por concorrente",
    })

    expect(resultado.ok).toBe(false)
    expect(resultado.decisaoPendente?.codigo).toBe("PERDA_ULTIMA_OPORTUNIDADE")
    expect(resultado.decisaoPendente?.opcoes.map((opcao) => opcao.valor)).toEqual([
      "PERDER_LEAD",
      "NOVA_OPORTUNIDADE",
    ])
  })
})
