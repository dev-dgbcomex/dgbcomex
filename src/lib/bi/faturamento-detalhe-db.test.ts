import "fake-indexeddb/auto"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { ItemFaturamento } from "./faturamento-detalhe-db"
import {
  chaveDe,
  consultar,
  estadoSalvo,
  limpar,
  mergeDelta,
  opcoes,
  salvarEstado,
  substituirBase,
} from "./faturamento-detalhe-db"

function item(parcial: Partial<Omit<ItemFaturamento, "chave">> & { chave?: string } = {}) {
  return {
    empresa: "01",
    pedido: "1000",
    item: 1,
    nr_nota: "5000",
    data_nota: "2026-10-01",
    cliente: "C001",
    nome_cliente: "Cliente Alfa",
    cod_produto: "P001",
    metros: 100,
    vr_unitario: 10,
    vr_total: 1000,
    acres_desc: -50,
    peso: 20,
    vr_nota: 950,
    romaneio: "017414",
    representante_codigo: "R1",
    representante: "Representante Norte",
    ...parcial,
  }
}

describe("faturamento-detalhe-db (IndexedDB)", () => {
  beforeAll(async () => {
    await limpar()
  })

  beforeEach(async () => {
    await limpar()
  })

  afterAll(async () => {
    await limpar()
  })

  it("substituirBase grava os itens e a chave composta", async () => {
    const quantidade = await substituirBase([item({ pedido: "2000", nr_nota: "6000" })])
    expect(quantidade).toBe(1)
    const { paginacao, itens } = await consultar({})
    expect(paginacao.total).toBe(1)
    expect(itens[0].nr_nota).toBe("6000")
    expect(chaveDe(itens[0])).toBe("01|2000|1|6000")
  })

  it("recalcula o resumo como a API: faturamento = Σ vr_total + acres_desc", async () => {
    await substituirBase([
      item({ nr_nota: "1", vr_total: 100, acres_desc: -10, metros: 10, peso: 5 }),
      item({ nr_nota: "1", item: 2, vr_total: 50, acres_desc: 0, metros: 7, peso: 3, cod_produto: "P002" }),
      item({ nr_nota: "2", pedido: "2000", vr_total: 30, acres_desc: 5, metros: 2, peso: 1 }),
    ])
    const consulta = await consultar({})
    expect(consulta.resumo).toEqual({
      itens: 3,
      notas: 2,
      pedidos: 2,
      metros: 19,
      peso: 9,
      faturamento: 175,
    })
  })

  it("filtra por período, representante, cliente e produto (sem diferenciar maiúsculas)", async () => {
    await substituirBase([
      item({ nr_nota: "1001", data_nota: "2026-10-01", representante: "Representante Norte", nome_cliente: "Cliente Alfa", cod_produto: "P001" }),
      item({ nr_nota: "1002", data_nota: "2026-09-15", representante: "Representante Sul", nome_cliente: "Cliente Beta", cod_produto: "P002" }),
      item({ nr_nota: "1003", data_nota: "2026-08-02", representante: "Representante Norte", nome_cliente: "Cliente Beta", cod_produto: "P003" }),
    ])
    expect((await consultar({ data_inicio: "2026-09-01" })).paginacao.total).toBe(2)
    expect((await consultar({ data_inicio: "2026-09-01", data_fim: "2026-09-30" })).paginacao.total).toBe(1)
    expect((await consultar({ representante: "norte" })).paginacao.total).toBe(2)
    expect((await consultar({ cliente: "BETA" })).paginacao.total).toBe(2)
    expect((await consultar({ produto: "p00" })).paginacao.total).toBe(3)
    expect((await consultar({ produto: "p002" })).paginacao.total).toBe(1)
  })

  it("ordena por data/nr_nota decrescentes e pagina", async () => {
    await substituirBase([
      item({ data_nota: "2026-10-01", nr_nota: "100", item: 1 }),
      item({ data_nota: "2026-10-02", nr_nota: "90", item: 1 }),
      item({ data_nota: "2026-10-02", nr_nota: "90", item: 2 }),
    ])
    const consulta = await consultar({}, 1, 2)
    expect(consulta.paginacao.total).toBe(3)
    expect(consulta.paginacao.total_paginas).toBe(2)
    expect(consulta.itens.map((linha) => linha.data_nota)).toEqual([
      "2026-10-02",
      "2026-10-02",
    ])
    const segunda = await consultar({}, 2, 2)
    expect(segunda.itens[0].data_nota).toBe("2026-10-01")
  })

  it("mergeDelta faz upsert por chave e poda a janela de 12 meses", async () => {
    await substituirBase([
      item({ nr_nota: "A", data_nota: "2025-09-01", vr_total: 10 }),
      item({ nr_nota: "B", data_nota: "2026-10-01", vr_total: 20 }),
    ])
    const processados = await mergeDelta(
      [
        item({ nr_nota: "A", data_nota: "2025-12-01", vr_total: 99 }),
        item({ nr_nota: "C", data_nota: "2026-10-05", vr_total: 30 }),
      ],
      "2025-12-01",
      "2026-12-31"
    )
    expect(processados).toBe(2)
    const consulta = await consultar({})
    expect(consulta.paginacao.total).toBe(3)
    const linhaA = consulta.itens.find((linha) => linha.nr_nota === "A")
    expect(linhaA?.vr_total).toBe(99)
    expect(linhaA?.data_nota).toBe("2025-12-01")
  })

  it("guardar e ler o estado (watermark do sync)", async () => {
    await salvarEstado({
      carga_completa: true,
      contagem: 5419,
      ultima_data: "2026-10-08",
      janela_inicio: "2025-10-01",
      janela_fim: "2026-10-08",
    })
    expect(await estadoSalvo()).toEqual({
      carga_completa: true,
      contagem: 5419,
      ultima_data: "2026-10-08",
      janela_inicio: "2025-10-01",
      janela_fim: "2026-10-08",
    })
  })

  it("opcoes lista representantes e produtos distintos ordenados", async () => {
    await substituirBase([
      item({ nr_nota: "2001", representante: "Beta", cod_produto: "P002" }),
      item({ nr_nota: "2002", representante: "Alfa", cod_produto: "P001" }),
      item({ nr_nota: "2003", representante: "Alfa", cod_produto: "P001" }),
    ])
    expect(await opcoes()).toEqual({
      representantes: ["Alfa", "Beta"],
      produtos: ["P001", "P002"],
    })
  })

  it("limpar esvazia itens e meta", async () => {
    await substituirBase([item()])
    await salvarEstado({
      carga_completa: true,
      contagem: 1,
      ultima_data: "2026-10-08",
      janela_inicio: "2025-10-01",
      janela_fim: "2026-10-08",
    })
    await limpar()
    expect((await consultar({})).paginacao.total).toBe(0)
    expect(await estadoSalvo()).toBeNull()
  })
})