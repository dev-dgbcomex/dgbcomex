// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import VincularDocumentoErpModal from "./vincular-documento-erp-modal"
import { createFetchMock, findCall, renderPage } from "@/test/harness"

const pedido = {
  empresa: "13",
  pedido: "00007075",
  cliente_cnpj: "03.387.691/0001-16",
  cliente_nome: "U G INDUSTRIA DE COLCHOES DA AMAZONIA LTDA",
  data_pedido: "2026-11-16",
  total_itens: 4,
  quantidade: 7400,
  valor_total: 58782,
}

function setup(open: boolean) {
  const fetchMock = createFetchMock(({ method, url }) => {
    if (method === "POST" && url === "/api/crm/erp/pedidos/sincronizar") {
      return { status: 200, json: { desde: null, documentos: 1, itens: 4 } }
    }
    if (method === "GET" && url.startsWith("/api/crm/erp/pedidos?")) {
      return {
        status: 200,
        json: {
          paginacao: { total: 1, pagina: 1, por_pagina: 30, total_paginas: 1 },
          itens: [pedido],
        },
      }
    }
    return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
  })
  vi.stubGlobal("fetch", fetchMock.fn)

  const onClose = vi.fn()
  const onVinculado = vi.fn()
  const utils = renderPage(
    <VincularDocumentoErpModal
      open={open}
      tipo="PEDIDO"
      oportunidadeId={9}
      cnpjPessoa="03.387.691/0001-16"
      onClose={onClose}
      onVinculado={onVinculado}
    />
  )
  return { fetchMock, onClose, onVinculado, ...utils }
}

describe("VincularDocumentoErpModal", () => {
  it("sincroniza o diferencial ao abrir e mostra o pedido", async () => {
    const { fetchMock } = setup(true)

    await screen.findByText(/Pedido 00007075/)
    expect(findCall(fetchMock.calls, "/api/crm/erp/pedidos/sincronizar", "POST")).toBeTruthy()
  })

  it("não repete a sincronização a cada letra digitada", async () => {
    const { fetchMock } = setup(true)
    await screen.findByText(/Pedido 00007075/)

    fireEvent.change(screen.getByLabelText("Buscar no ERP"), { target: { value: "7075" } })
    await waitFor(() => {
      const gets = fetchMock.calls.filter(
        (chamada) => chamada.method === "GET" && chamada.url.includes("busca=7075")
      )
      expect(gets.length).toBeGreaterThan(0)
    })

    const sincronizacoes = fetchMock.calls.filter(
      (chamada) =>
        chamada.method === "POST" && chamada.url === "/api/crm/erp/pedidos/sincronizar"
    )
    expect(sincronizacoes).toHaveLength(1)
  })

  it("sincroniza de novo quando o modal é reaberto", async () => {
    const { fetchMock, rerender } = setup(false)

    rerender(
      <VincularDocumentoErpModal
        open
        tipo="PEDIDO"
        oportunidadeId={9}
        cnpjPessoa="03.387.691/0001-16"
        onClose={vi.fn()}
        onVinculado={vi.fn()}
      />
    )
    await screen.findByText(/Pedido 00007075/)

    rerender(
      <VincularDocumentoErpModal
        open={false}
        tipo="PEDIDO"
        oportunidadeId={9}
        cnpjPessoa="03.387.691/0001-16"
        onClose={vi.fn()}
        onVinculado={vi.fn()}
      />
    )
    rerender(
      <VincularDocumentoErpModal
        open
        tipo="PEDIDO"
        oportunidadeId={9}
        cnpjPessoa="03.387.691/0001-16"
        onClose={vi.fn()}
        onVinculado={vi.fn()}
      />
    )

    await waitFor(() => {
      const sincronizacoes = fetchMock.calls.filter(
        (chamada) =>
          chamada.method === "POST" && chamada.url === "/api/crm/erp/pedidos/sincronizar"
      )
      expect(sincronizacoes).toHaveLength(2)
    })
  })
})
