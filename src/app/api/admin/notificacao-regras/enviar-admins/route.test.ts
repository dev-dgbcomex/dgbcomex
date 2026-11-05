import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { notificarAdmins } from "@/lib/notificar"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/notificar", () => ({
  notificarAdmins: vi.fn(),
}))

import { POST } from "./route"

const sessionAdmin = { user: { id: "1", role: "ADMIN", name: "Administrador" } } as any
const sessionComercial = { user: { id: "2", role: "COMERCIAL", name: "Vendedor" } } as any

function post(body: any = {}) {
  return POST(
    new NextRequest("http://localhost/api/admin/notificacao-regras/enviar-admins", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  )
}

describe("POST /api/admin/notificacao-regras/enviar-admins", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(notificarAdmins).mockReset()
    vi.mocked(notificarAdmins).mockResolvedValue({
      usuariosNotificados: 2,
      emailsEnviados: 2,
      erroEmail: null,
    })
  })

  it("retorna 401 para usuário sem perfil administrativo", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionComercial)
    const res = await post()
    expect(res.status).toBe(401)
    expect(notificarAdmins).not.toHaveBeenCalled()
  })

  it("envia a notificação padrão para os administradores", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)

    const res = await post()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.usuariosNotificados).toBe(2)
    expect(data.emailsEnviados).toBe(2)

    expect(notificarAdmins).toHaveBeenCalledWith(
      "TESTE_NOTIFICACAO",
      expect.stringContaining("administradores"),
      "/admin/notificacoes",
      "Administrador"
    )
  })

  it("aceita mensagem e link customizados", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)

    const res = await post({ mensagem: "Alerta do painel", link: "/comercial/crm" })
    expect(res.status).toBe(200)

    expect(notificarAdmins).toHaveBeenCalledWith(
      "TESTE_NOTIFICACAO",
      "Alerta do painel",
      "/comercial/crm",
      "Administrador"
    )
  })

  it("reporta falha de e-mail sem quebrar a resposta", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin)
    vi.mocked(notificarAdmins).mockResolvedValue({
      usuariosNotificados: 1,
      emailsEnviados: 0,
      erroEmail: "SMTP indisponível",
    })

    const res = await post()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.erroEmail).toBe("SMTP indisponível")
  })
})
