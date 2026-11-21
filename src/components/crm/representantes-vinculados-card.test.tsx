// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import { RepresentantesVinculadosCard } from "./representantes-vinculados-card"

describe("RepresentantesVinculadosCard", () => {
  it("exibe o representante como link e preserva buscar, vincular e remover", () => {
    const onBuscar = vi.fn()
    const onVincular = vi.fn()
    const onRemover = vi.fn()

    renderPage(
      <RepresentantesVinculadosCard
        vinculos={[
          {
            id: 1,
            representanteId: 22,
            nome: "Representante Beta",
            cnpj: "22.333.444/0001-55",
          },
        ]}
        resultados={[{ id: 30, nome: "Representante Gamma" }]}
        busca=""
        onBuscar={onBuscar}
        onVincular={onVincular}
        onRemover={onRemover}
      />
    )

    expect(screen.getByRole("link", { name: "Representante Beta" })).toHaveAttribute(
      "href",
      "/comercial/representantes/22"
    )
    fireEvent.change(screen.getByLabelText("Buscar representante"), {
      target: { value: "Gamma" },
    })
    expect(onBuscar).toHaveBeenCalledWith("Gamma")

    fireEvent.click(screen.getByRole("button", { name: /Representante Gamma/ }))
    expect(onVincular).toHaveBeenCalledWith(30)

    fireEvent.click(screen.getByTitle("Remover representante"))
    expect(onRemover).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, representanteId: 22 })
    )
  })
})
