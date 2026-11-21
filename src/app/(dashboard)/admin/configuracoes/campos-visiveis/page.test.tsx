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
            regras: { "CRM_VISITA_DETALHE:proposta_vinculada": ["TECELAGEM"] },
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

  it("carrega o catálogo, marca o perfil oculto e desabilita os perfis com acesso total", async () => {
    renderPage(<CamposVisiveisAdminPage />)

    expect(
      await screen.findByRole("heading", { name: /Campos Visíveis/ })
    ).toBeInTheDocument()
    expect(screen.getByText("Proposta Vinculada")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Ocultar Proposta Vinculada para TECELAGEM" })
    ).toBeChecked()
    for (const role of ["COMERCIAL", "CRM", "ADMIN", "SUDO"]) {
      expect(
        screen.getByRole("checkbox", { name: `Ocultar Proposta Vinculada para ${role}` })
      ).toBeDisabled()
    }
    expect(screen.getByRole("button", { name: "Salvar Regras" })).toBeDisabled()
  })

  it("salva a regra atualizada ao marcar outro perfil", async () => {
    renderPage(<CamposVisiveisAdminPage />)
    await screen.findByRole("heading", { name: /Campos Visíveis/ })

    const pcp = screen.getByRole("checkbox", { name: "Ocultar Proposta Vinculada para PCP" })
    pcp.click()

    const salvar = screen.getByRole("button", { name: "Salvar Regras" })
    expect(salvar).toBeEnabled()
    salvar.click()

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/admin/campos-visiveis", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({
        cadastro: "CRM_VISITA_DETALHE",
        campo: "proposta_vinculada",
        rolesOcultos: ["TECELAGEM", "PCP"],
      })
    })
    expect(toastMock.success).toHaveBeenCalledWith("Regras de visibilidade salvas!")
  })
})
