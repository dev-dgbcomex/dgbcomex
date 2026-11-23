// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import VincularFaturado from "./vincular-faturado"

const fetchMock = vi.fn()

beforeEach(() => {
  globalThis.fetch = fetchMock
  fetchMock.mockReset()
})

afterEach(() => {
  fetchMock.mockReset()
  delete (globalThis as any).fetch
})

describe("VincularFaturado", () => {
  it("renderiza botão e fecha o modal", async () => {
    const onOpenChange = vi.fn()
    const onClose = vi.fn()
    const onVinculado = vi.fn()
    const { container, getByRole } = renderPage(
      <VincularFaturado
        open={true}
        onOpenChange={onOpenChange}
        oportunidadeId={14}
        onClose={onClose}
        onVinculado={onVinculado}
      />
    )

    const botao = container.querySelector("button[aria-label='Vincular pedido já faturado no ERP']")
    expect(botao).toBeInTheDocument()

    fireEvent.click(botao!)
    expect(onOpenChange).toHaveBeenCalledWith(true)

    const fechar = getByRole("button", { name: /Fechar/ })
    expect(fechar).toBeInTheDocument()
    fireEvent.click(fechar)
    expect(onClose).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
