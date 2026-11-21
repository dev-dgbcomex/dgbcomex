// @vitest-environment jsdom
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, toastMock } from "@/test/harness"
import { exportarResumosIA } from "@/lib/crm/resumo-ia-export"
import ResumoIACard from "./resumo-ia-card"

vi.mock("@/lib/crm/resumo-ia-export", () => ({ exportarResumosIA: vi.fn(() => Promise.resolve()) }))

const resumo = {
  id: 55,
  classificacao: "QUENTE",
  resumo: "Primeiro resumo com contato recente.",
  insights: "Insight exclusivo do modal.",
  sugestoes: "Agendar visita.",
  motivoClassificacao: "Contato nos últimos 7 dias.",
  criadoPorNome: "Tiago",
  createdAt: "2026-11-20T10:00:00Z",
}

function Harness() {
  const [abertoId, setAbertoId] = useState<number | null>(null)
  return (
    <ResumoIACard
      tipo="lead"
      id={9}
      nomeEntidade="Empresa Exemplo"
      abertoId={abertoId}
      onAbertoIdChange={setAbertoId}
    />
  )
}

describe("ResumoIACard", () => {
  beforeEach(() => {
    vi.mocked(exportarResumosIA).mockClear()
  })

  it("lista resumos e abre o modal com o texto completo", async () => {
    const fetchMock = createFetchMock(() => ({ json: { resumos: [resumo] } }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<Harness />)

    expect(await screen.findByRole("button", { name: /QUENTE/ })).toBeInTheDocument()
    expect(findCall(fetchMock.calls, "/api/crm/ia/resumos?tipo=lead&id=9", "GET")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /QUENTE/ }))

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Insight exclusivo do modal.")).toBeInTheDocument()
    expect(screen.getByText("Agendar visita.")).toBeInTheDocument()
  })

  it("gera um resumo pelo botão e abre o resultado", async () => {
    const fetchMock = createFetchMock(({ method }) =>
      method === "POST" ? { json: { resumo } } : { json: { resumos: [resumo] } }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<Harness />)

    fireEvent.click(screen.getByRole("button", { name: /Gerar resumo/ }))

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Resumo IA gerado"))
    const chamada = findCall(fetchMock.calls, "/api/crm/ia/resumos", "POST")
    expect(chamada?.body).toEqual({ tipo: "lead", id: 9 })
    expect(await screen.findByText("Insight exclusivo do modal.")).toBeInTheDocument()
  })

  it("mostra erro da API ao gerar", async () => {
    const fetchMock = createFetchMock(({ method }) =>
      method === "POST" ? { status: 503, json: { error: "Sem provedor" } } : { json: { resumos: [] } }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: /Gerar resumo/ }))

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Sem provedor"))
  })

  it("exporta os resumos selecionados no formato padrão", async () => {
    const fetchMock = createFetchMock(() => ({ json: { resumos: [resumo] } }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<Harness />)
    fireEvent.click(await screen.findByRole("button", { name: /QUENTE/ }))
    fireEvent.click(await screen.findByRole("button", { name: /Exportar 1 resumo/ }))

    await waitFor(() =>
      expect(exportarResumosIA).toHaveBeenCalledWith(
        expect.objectContaining({
          nomeEntidade: "Empresa Exemplo",
          formato: "md",
          modo: "unico",
          resumos: [expect.objectContaining({ id: 55 })],
        })
      )
    )
    expect(toastMock.success).toHaveBeenCalledWith("Exportação concluída")
  })
})
