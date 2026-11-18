// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import CamposVisiveisAdminPage from "./page"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"

const catalogo = [
  {
    cadastro: "CRM_VISITA_DETALHE",
    rotulo: "Detalhe da Visita",
    descricao: "Tela de detalhe de uma visita do CRM",
    campos: [
      {
        campo: "proposta_vinculada",
        rotulo: "Proposta Vinculada",
        descricao: "Link para a proposta associada",
      },
    ],
  },
]

describe("CamposVisiveisAdminPage", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    navMock.setPathname("/admin/configuracoes/campos-visiveis")
    fetchMock = createFetchMock(({ method, url, body }) => {
      if (method === "GET" && url === "/api/admin/campos-visiveis") {
        return {
          json: {
            catalogo,
            regras: { "CRM_VISITA_DETALHE:proposta_vinculada": ["COMERCIAL"] },
          },
        }
      }
      if (method === "PUT" && url === "/api/admin/campos-visiveis") {
        return { json: { success: true, ...body } }
      }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("carrega o catálogo e marca o perfil oculto", async () => {
    renderPage(<CamposVisiveisAdminPage />)

    expect(
      await screen.findByRole("heading", { name: /Campos Visíveis/ })
    ).toBeInTheDocument()
    expect(screen.getByText("Proposta Vinculada")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Ocultar Proposta Vinculada para COMERCIAL" })
    ).toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: "Ocultar Proposta Vinculada para ADMIN" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Salvar Regras" })).toBeDisabled()
  })

  it("salva a regra atualizada ao marcar outro perfil", async () => {
    renderPage(<CamposVisiveisAdminPage />)
    await screen.findByRole("heading", { name: /Campos Visíveis/ })

    const crm = screen.getByRole("checkbox", { name: "Ocultar Proposta Vinculada para CRM" })
    crm.click()

    const salvar = screen.getByRole("button", { name: "Salvar Regras" })
    expect(salvar).toBeEnabled()
    salvar.click()

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/admin/campos-visiveis", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({
        cadastro: "CRM_VISITA_DETALHE",
        campo: "proposta_vinculada",
        rolesOcultos: ["COMERCIAL", "CRM"],
      })
    })
    expect(toastMock.success).toHaveBeenCalledWith("Regras de visibilidade salvas!")
  })
})
