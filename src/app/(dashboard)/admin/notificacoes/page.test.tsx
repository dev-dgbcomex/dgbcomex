// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import NotificacoesAdminPage from "./page"
import { createFetchMock, findCall, renderPage, toastMock } from "@/test/harness"

const regras = [{ tipo: "SOLICITACAO_CRIADA", roles: ["ADMIN"] }]
const regrasGlobais = { tipo: "TODOS", roles: ["ADMIN", "SUDO"] }

function setup() {
  const fetchMock = createFetchMock(({ method, url }) => {
    if (method === "GET" && url === "/api/admin/notificacao-regras")
      return { json: { regras, regrasGlobais } }
    if (method === "PUT" && url === "/api/admin/notificacao-regras") return { json: { ok: true } }
    if (method === "POST" && url === "/api/admin/notificacao-regras/enviar-admins")
      return { json: { success: true, usuariosNotificados: 2, emailsEnviados: 2 } }
    return { status: 404, json: { error: "Rota não mockada" } }
  })
  vi.stubGlobal("fetch", fetchMock.fn)
  return fetchMock
}

function putCalls(fetchMock: ReturnType<typeof setup>) {
  return fetchMock.calls.filter(
    (c) => c.url === "/api/admin/notificacao-regras" && c.method === "PUT"
  )
}

describe("NotificacoesAdminPage", () => {
  it("renderiza o heading e as regras", async () => {
    setup()
    renderPage(<NotificacoesAdminPage />)

    expect(
      await screen.findByRole("heading", { name: "Notificações por Tipo" }, { timeout: 5000 })
    ).toBeInTheDocument()
    expect(screen.getByText("Solicitação Criada")).toBeInTheDocument()
  })

  it("salva as regras via PUT após alternar um checkbox", async () => {
    const fetchMock = setup()
    renderPage(<NotificacoesAdminPage />)
    await screen.findByText("Solicitação Criada", {}, { timeout: 5000 })

    const linha = screen.getByText("Solicitação Criada").closest("tr") as HTMLElement
    const checkboxes = within(linha).getAllByRole("checkbox")
    fireEvent.click(checkboxes[1])
    fireEvent.click(screen.getByRole("button", { name: "Salvar Regras" }))

    await waitFor(() => {
      const call = putCalls(fetchMock).find((c) => c.body?.tipo === "SOLICITACAO_CRIADA")
      expect(call).toBeDefined()
      expect(Array.isArray(call?.body?.roles)).toBe(true)
      expect(call?.body?.roles).toEqual(expect.arrayContaining(["ADMIN", "COMERCIAL"]))
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Regras de notificação salvas!")
    )
  })

  it("mostra a seção de perfis que recebem todas as notificações", async () => {
    setup()
    renderPage(<NotificacoesAdminPage />)

    expect(
      await screen.findByText("Perfis que recebem todas as notificações", {}, { timeout: 5000 })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Enviar teste para os administradores" })
    ).toBeInTheDocument()
  })

  it("salva a regra global com os perfis marcados", async () => {
    const fetchMock = setup()
    renderPage(<NotificacoesAdminPage />)
    await screen.findByText("Perfis que recebem todas as notificações", {}, { timeout: 5000 })

    fireEvent.click(screen.getByLabelText("CRM"))
    fireEvent.click(screen.getByRole("button", { name: "Salvar Regras" }))

    await waitFor(() => {
      const call = putCalls(fetchMock).find((c) => c.body?.tipo === "TODOS")
      expect(call).toBeDefined()
      expect(call?.body?.roles).toEqual(expect.arrayContaining(["ADMIN", "SUDO", "CRM"]))
    })
  })

  it("envia notificação para os administradores", async () => {
    const fetchMock = setup()
    renderPage(<NotificacoesAdminPage />)
    await screen.findByText("Perfis que recebem todas as notificações", {}, { timeout: 5000 })

    fireEvent.click(screen.getByRole("button", { name: "Enviar teste para os administradores" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/admin/notificacao-regras/enviar-admins", "POST")
      expect(call).toBeDefined()
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        "Notificação enviada para 2 administrador(es) — 2 e-mail(s)"
      )
    )
  })
})
