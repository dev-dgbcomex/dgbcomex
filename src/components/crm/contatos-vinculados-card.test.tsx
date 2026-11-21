// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import { ContatosVinculadosCard } from "./contatos-vinculados-card"

describe("ContatosVinculadosCard", () => {
  it("exibe o contato como link e preserva vincular, adicionar e remover", () => {
    const onAdd = vi.fn()
    const onVincular = vi.fn()
    const onRemover = vi.fn()

    renderPage(
      <ContatosVinculadosCard
        contatos={[{ id: 8, nome: "Ana Souza", email: "ana@x.com" }]}
        orfaos={[{ id: 9, nome: "Carlos Lima" }]}
        onAdd={onAdd}
        onVincular={onVincular}
        onRemover={onRemover}
      />
    )

    expect(screen.getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      "/comercial/crm/contatos/8"
    )
    fireEvent.change(screen.getByLabelText("Contatos sem vínculo"), { target: { value: "9" } })
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }))
    expect(onVincular).toHaveBeenCalledWith(9)

    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }))
    expect(onAdd).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle("Desvincular contato"))
    expect(onRemover).toHaveBeenCalledWith(8)
  })
})
