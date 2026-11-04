// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/notificar", () => ({ notificar: vi.fn() }))

import { notificar } from "@/lib/notificar"
import { TIPO_ATIVIDADE_COMERCIAL, notificarAtividadeComercial } from "./notificar-atividade"

describe("notificarAtividadeComercial", () => {
  beforeEach(() => {
    vi.mocked(notificar).mockReset()
  })

  it("notifica as demais contas comerciais sem o autor da ação", async () => {
    vi.mocked(notificar).mockResolvedValue({ usuariosNotificados: 3 } as any)

    const resultado = await notificarAtividadeComercial({
      acao: "cadastrou a pessoa",
      entidade: "Pessoa",
      registro: "Maria Souza",
      link: "/comercial/crm/pessoas/10",
      usuarioNome: "Tiago",
      usuarioId: 5,
    })

    expect(notificar).toHaveBeenCalledWith(
      TIPO_ATIVIDADE_COMERCIAL,
      expect.stringContaining("Tiago cadastrou a pessoa"),
      "/comercial/crm/pessoas/10",
      "Tiago",
      undefined,
      { excluirUsuarioId: 5 }
    )
    expect(vi.mocked(notificar).mock.calls[0][1]).toContain("Maria Souza")
    expect(resultado).toEqual({ usuariosNotificados: 3 })
  })

  it("usa um nome genérico quando o autor é desconhecido", async () => {
    vi.mocked(notificar).mockResolvedValue({ usuariosNotificados: 1 } as any)

    await notificarAtividadeComercial({
      acao: "agendou uma visita",
      entidade: "Visita",
      link: "/comercial/crm/visitas/7",
    })

    expect(vi.mocked(notificar).mock.calls[0][1]).toContain("Uma conta comercial")
    expect(vi.mocked(notificar).mock.calls[0][5]).toEqual({ excluirUsuarioId: null })
  })

  it("não interrompe a operação quando a notificação falha", async () => {
    vi.mocked(notificar).mockRejectedValue(new Error("SMTP indisponível"))
    const erro = vi.spyOn(console, "error").mockImplementation(() => {})

    const resultado = await notificarAtividadeComercial({
      acao: "criou a proposta",
      entidade: "Proposta",
      link: "/comercial/crm/propostas/3",
      usuarioNome: "Ana",
      usuarioId: 9,
    })

    expect(resultado).toEqual({ usuariosNotificados: 0 })
    erro.mockRestore()
  })
})
