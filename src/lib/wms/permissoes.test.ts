import { describe, expect, it } from "vitest"
import { podeMoverParaSituacao, podeReordenarKanban } from "./permissoes"

describe("permissões do WMS", () => {
  it("libera mover quando o perfil da situação inclui o usuário", () => {
    expect(podeMoverParaSituacao("COMERCIAL", { perfis: ["COMERCIAL"] })).toBe(true)
    expect(podeMoverParaSituacao("EXPEDICAO", { perfis: ["COMERCIAL"] })).toBe(false)
  })

  it("ADMIN e SUDO podem mover para qualquer situação", () => {
    expect(podeMoverParaSituacao("ADMIN", { perfis: [] })).toBe(true)
    expect(podeMoverParaSituacao("SUDO", { perfis: [] })).toBe(true)
  })

  it("comercial, expedição, admin e sudo podem reordenar o kanban", () => {
    expect(podeReordenarKanban("COMERCIAL")).toBe(true)
    expect(podeReordenarKanban("EXPEDICAO")).toBe(true)
    expect(podeReordenarKanban("ADMIN")).toBe(true)
    expect(podeReordenarKanban("SUDO")).toBe(true)
  })

  it("demais perfis e usuários sem sessão não podem reordenar", () => {
    expect(podeReordenarKanban("TECELAGEM")).toBe(false)
    expect(podeReordenarKanban(null)).toBe(false)
    expect(podeReordenarKanban(undefined)).toBe(false)
  })
})
