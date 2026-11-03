// @vitest-environment node
import { describe, it, expect, vi } from "vitest"

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }))

vi.mock("next/navigation", () => ({ redirect: redirectMock }))

import StatusPage from "./page"

describe("StatusPage", () => {
  it("redireciona para o cadastro de status em Perfil › Menu de Navegação", () => {
    StatusPage()

    expect(redirectMock).toHaveBeenCalledWith("/perfil/menus?statusTipo=OPORTUNIDADE")
  })
})
