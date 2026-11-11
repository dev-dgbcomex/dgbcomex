// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createQueryBuilder } from "@/test/route-db-mock"

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}))

import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import {
  notificar,
  notificarAdmins,
  notificarUsuario,
  rolesNotificacaoGlobal,
  ROLES_GLOBAIS_PADRAO,
  TIPO_REGRA_GLOBAL,
} from "@/lib/notificar"

const admin = { id: 1, name: "Administrador", email: "admin@dgbcomex.com" }
const comercial = { id: 2, name: "Comercial", email: "comercial@dgbcomex.com" }

function prepararSelects(resultados: any[]) {
  const fila = [...resultados]
  vi.mocked(db.select).mockImplementation(() => createQueryBuilder(fila.shift() ?? []))
}

function prepararInsert() {
  vi.mocked(db.insert).mockImplementation(() => createQueryBuilder(undefined))
}

describe("notificar", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(db.insert).mockReset()
    vi.mocked(sendEmail).mockReset()
    vi.mocked(sendEmail).mockResolvedValue({ sent: 1, error: null })
    prepararInsert()
  })

  it("usa os perfis globais quando o tipo nao tem regra", async () => {
    // 1a select: regra do tipo (inexistente) | 2a: regra global | 3a: usuarios
    prepararSelects([[], [{ roles: ["ADMIN"] }], [admin]])

    const resultado = await notificar("OPORTUNIDADE_CRIADA", "Nova oportunidade")

    expect(resultado.usuariosNotificados).toBe(1)
    expect(resultado.emailsEnviados).toBe(1)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ["admin@dgbcomex.com"] }))
  })

  it("soma a regra do tipo com os perfis globais", async () => {
    prepararSelects([[{ roles: ["COMERCIAL"] }], [{ roles: ["ADMIN"] }], [admin, comercial]])

    const resultado = await notificar("OPORTUNIDADE_CRIADA", "Nova oportunidade")

    expect(resultado.usuariosNotificados).toBe(2)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["admin@dgbcomex.com", "comercial@dgbcomex.com"] })
    )
  })

  it("nao notifica ninguem quando nao ha perfis configurados", async () => {
    prepararSelects([[{ roles: [] }], [{ roles: [] }]])

    const resultado = await notificar("OPORTUNIDADE_CRIADA", "Nova oportunidade")

    expect(resultado.usuariosNotificados).toBe(0)
    expect(db.insert).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("exclui o autor da propria notificacao", async () => {
    prepararSelects([[], [{ roles: ["ADMIN"] }], [admin]])

    const resultado = await notificar(
      "ATIVIDADE_COMERCIAL",
      "Atividade",
      undefined,
      "Tiago",
      undefined,
      { excluirUsuarioId: admin.id }
    )

    expect(resultado.usuariosNotificados).toBe(0)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it("exclui varios usuarios da notificacao", async () => {
    prepararSelects([[], [{ roles: ["ADMIN"] }], [admin, comercial]])

    const resultado = await notificar(
      "ATIVIDADE_COMERCIAL",
      "Atividade",
      undefined,
      "Tiago",
      undefined,
      { excluirUsuarioIds: [admin.id, comercial.id] }
    )

    expect(resultado.usuariosNotificados).toBe(0)
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe("notificarUsuario", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(db.insert).mockReset()
    vi.mocked(sendEmail).mockReset()
    vi.mocked(sendEmail).mockResolvedValue({ sent: 1, error: null })
    prepararInsert()
  })

  it("cria a notificacao in-app e envia o e-mail para o usuario", async () => {
    prepararSelects([[admin]])

    const resultado = await notificarUsuario({
      usuarioId: admin.id,
      tipo: "CHAMADO",
      mensagem: "Chamado #1 cadastrado",
      link: "/chamados/1",
      usuarioNome: "Tiago",
    })

    expect(resultado.notificado).toBe(true)
    expect(resultado.emailEnviado).toBe(true)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["admin@dgbcomex.com"] })
    )
  })

  it("nao notifica quando o usuario nao existe", async () => {
    prepararSelects([[]])

    const resultado = await notificarUsuario({
      usuarioId: 99,
      tipo: "CHAMADO",
      mensagem: "Chamado #1 cadastrado",
    })

    expect(resultado.notificado).toBe(false)
    expect(db.insert).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("avisa quando o usuario nao tem e-mail valido", async () => {
    prepararSelects([[{ id: 7, name: "Sem Email", email: "" }]])

    const resultado = await notificarUsuario({
      usuarioId: 7,
      tipo: "CHAMADO",
      mensagem: "Chamado #1 cadastrado",
    })

    expect(resultado.notificado).toBe(true)
    expect(resultado.emailEnviado).toBe(false)
    expect(resultado.erroEmail).toMatch(/e-mail/i)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe("rolesNotificacaoGlobal", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
  })

  it("usa a regra global configurada", async () => {
    prepararSelects([[{ roles: ["ADMIN", "SUDO"] }]])
    expect(await rolesNotificacaoGlobal()).toEqual(["ADMIN", "SUDO"])
  })

  it("usa ADMIN e SUDO quando a regra global ainda nao existe", async () => {
    prepararSelects([[]])
    expect(await rolesNotificacaoGlobal()).toEqual(ROLES_GLOBAIS_PADRAO)
  })
})

describe("notificarAdmins", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(db.insert).mockReset()
    vi.mocked(sendEmail).mockReset()
    vi.mocked(sendEmail).mockResolvedValue({ sent: 1, error: null })
    prepararInsert()
  })

  it("envia apenas para os perfis globais", async () => {
    prepararSelects([[{ roles: ["ADMIN"] }], [{ roles: ["ADMIN"] }], [admin]])

    const resultado = await notificarAdmins("TESTE_NOTIFICACAO", "Teste", "/admin/notificacoes")

    expect(resultado.usuariosNotificados).toBe(1)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it("avisa quando nenhum perfil global esta configurado", async () => {
    prepararSelects([[{ roles: [] }]])

    const resultado = await notificarAdmins("TESTE_NOTIFICACAO", "Teste")

    expect(resultado.usuariosNotificados).toBe(0)
    expect(resultado.erroEmail).toMatch(/Admin > Notifica/)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it("usa o tipo reservado TODOS na regra global", () => {
    expect(TIPO_REGRA_GLOBAL).toBe("TODOS")
  })
})
