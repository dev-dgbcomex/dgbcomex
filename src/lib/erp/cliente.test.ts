// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ErroWms, requisitarWms } from "@/lib/wms/cliente"
import { buscarFaturamentosPorPedido } from "./cliente"

vi.mock("@/lib/wms/cliente", () => ({
  ErroWms: class ErroWms extends Error {
    readonly status: number

    constructor(mensagem: string, status: number) {
      super(mensagem)
      this.name = "ErroWms"
      this.status = status
    }
  },
  requisitarWms: vi.fn(),
}))

const nota = {
  empresa: "13",
  pedido: "013618",
  nr_nota: "012830",
  serie: "1",
  cliente_cnpj: "69.243.648/0001-95",
  cliente_nome: null,
  data_nota: "2026-11-24",
  data_emissao: "2026-11-24",
  pedido_origem: "00007094",
  status: "S",
  condicao_pagamento: null,
  valor_nota: 4020.58,
  total_itens: 18,
  quantidade: 13,
  valor_total: 4020.58,
}

const lista = (itens: typeof nota[]) => ({
  paginacao: { total: itens.length, pagina: 1, por_pagina: 50, total_paginas: 1 },
  itens,
})

describe("buscarFaturamentosPorPedido", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("busca a nota direto no ERP antes de usar o warehouse", async () => {
    vi.mocked(requisitarWms).mockResolvedValueOnce(lista([nota]))

    const resultado = await buscarFaturamentosPorPedido("00007094")

    expect(vi.mocked(requisitarWms)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(requisitarWms)).toHaveBeenCalledWith(
      "/crm/faturamentos-por-pedido/00007094",
      {}
    )
    expect(resultado.itens[0].nr_nota).toBe("012830")
  })

  it("usa o warehouse como fallback se a api-microdata antiga não tem a rota", async () => {
    vi.mocked(requisitarWms)
      .mockRejectedValueOnce(new ErroWms("Not Found", 404))
      .mockResolvedValueOnce(
        lista([nota, { ...nota, nr_nota: "999999", pedido_origem: "00000001" }])
      )

    const resultado = await buscarFaturamentosPorPedido("00007094")

    expect(vi.mocked(requisitarWms)).toHaveBeenNthCalledWith(
      2,
      "/crm/faturamentos?pedido_origem=00007094&por_pagina=500",
      {}
    )
    expect(resultado.itens.map((item) => item.nr_nota)).toEqual(["012830"])
  })

  it("não usa o warehouse quando o ERP responde sem nota", async () => {
    vi.mocked(requisitarWms).mockResolvedValueOnce(lista([]))

    const resultado = await buscarFaturamentosPorPedido("00007094")

    expect(vi.mocked(requisitarWms)).toHaveBeenCalledTimes(1)
    expect(resultado.itens).toEqual([])
  })

  it("devolve lista vazia se a api-microdata falhar com erro diferente de 404", async () => {
    vi.mocked(requisitarWms).mockRejectedValueOnce(new ErroWms("indisponível", 503))

    const resultado = await buscarFaturamentosPorPedido("00007094")

    expect(vi.mocked(requisitarWms)).toHaveBeenCalledTimes(1)
    expect(resultado.itens).toEqual([])
  })
})
