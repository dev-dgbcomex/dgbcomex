import { describe, it, expect } from "vitest"
import {
  validarRequisitosOportunidade,
  validarRequisitosLead,
  contarOportunidadesAceitaPossivelCliente,
  statusOportunidadeExigeRequisitos,
} from "./requisitos-status"

describe("validarRequisitosOportunidade", () => {
  it("isenta NOVO e QUALIFICACAO", () => {
    expect(validarRequisitosOportunidade({ status: "NOVO" }).ok).toBe(true)
    expect(validarRequisitosOportunidade({ status: "QUALIFICACAO" }).ok).toBe(true)
  })

  it("exige campos para PROPOSTA e NEGOCIACAO", () => {
    const r = validarRequisitosOportunidade({
      status: "PROPOSTA",
      valorEstimado: null,
      probabilidade: null,
    })
    expect(r.ok).toBe(false)
    expect(r.campos).toEqual(["valorEstimado", "probabilidade"])
  })

  it("aceita campos maiores que 1", () => {
    expect(
      validarRequisitosOportunidade({
        status: "NEGOCIACAO",
        valorEstimado: 10.01,
        probabilidade: 2,
      }).ok
    ).toBe(true)
  })

  it("bloqueia FECHADO_GANHO sem pedido ERP", () => {
    const r = validarRequisitosOportunidade({
      status: "FECHADO_GANHO",
      valorEstimado: 100,
      probabilidade: 50,
      totalPedidosErp: 0,
    })
    expect(r.ok).toBe(false)
    expect(r.bloqueio).toContain("pedido do ERP")
  })

  it("libera FECHADO_GANHO com pedido ERP", () => {
    expect(
      validarRequisitosOportunidade({
        status: "FECHADO_GANHO",
        valorEstimado: 100,
        probabilidade: 50,
        totalPedidosErp: 1,
      }).ok
    ).toBe(true)
  })

  it("bloqueia FECHADO_PERDIDO sem motivo", () => {
    const r = validarRequisitosOportunidade({
      status: "FECHADO_PERDIDO",
      valorEstimado: 100,
      probabilidade: 50,
      motivoPerda: null,
    })
    expect(r.ok).toBe(false)
    expect(r.campos).toContain("motivoPerda")
  })
})

describe("validarRequisitosLead", () => {
  it("bloqueia QUALIFICADO sem oportunidade", () => {
    expect(validarRequisitosLead({ statusNovo: "QUALIFICADO", totalOportunidades: 0 }).ok).toBe(
      false
    )
  })

  it("libera QUALIFICADO com oportunidade", () => {
    expect(
      validarRequisitosLead({ statusNovo: "QUALIFICADO", totalOportunidades: 1 }).ok
    ).toBe(true)
  })

  it("bloqueia POSSIVEL_CLIENTE sem oportunidade aceita", () => {
    expect(
      validarRequisitosLead({ statusNovo: "POSSIVEL_CLIENTE", totalOportunidadesAceitaPossivelCliente: 0 }).ok
    ).toBe(false)
  })

  it("libera POSSIVEL_CLIENTE com negociacao ou ganho", () => {
    expect(
      validarRequisitosLead({
        statusNovo: "POSSIVEL_CLIENTE",
        totalOportunidadesAceitaPossivelCliente: 1,
      }).ok
    ).toBe(true)
  })

  it("bloqueia CONVERTIDO_CLIENTE sem decisao", () => {
    expect(validarRequisitosLead({ statusNovo: "CONVERTIDO_CLIENTE" }).ok).toBe(false)
  })

  it("bloqueia CONVERTIDO_CLIENTE sem CNPJ", () => {
    expect(
      validarRequisitosLead({
        statusNovo: "CONVERTIDO_CLIENTE",
        decisao: "CONVERTER",
        temCnpj: false,
      }).ok
    ).toBe(false)
  })

  it("libera CONVERTIDO_CLIENTE com decisao e CNPJ", () => {
    expect(
      validarRequisitosLead({
        statusNovo: "CONVERTIDO_CLIENTE",
        decisao: "CONVERTER",
        temCnpj: true,
      }).ok
    ).toBe(true)
  })
})

describe("contarOportunidadesAceitaPossivelCliente", () => {
  it("conta negociacao e ganho", () => {
    expect(
      contarOportunidadesAceitaPossivelCliente([
        { status: "NOVO" },
        { status: "NEGOCIACAO" },
        { status: "FECHADO_GANHO" },
        { status: "FECHADO_PERDIDO" },
      ])
    ).toBe(2)
  })
})

describe("statusOportunidadeExigeRequisitos", () => {
  it("retorna false para NOVO/QUALIFICACAO", () => {
    expect(statusOportunidadeExigeRequisitos("NOVO")).toBe(false)
    expect(statusOportunidadeExigeRequisitos("QUALIFICACAO")).toBe(false)
  })

  it("retorna true para demais", () => {
    expect(statusOportunidadeExigeRequisitos("PROPOSTA")).toBe(true)
    expect(statusOportunidadeExigeRequisitos("PERSONALIZADO")).toBe(true)
  })
})
