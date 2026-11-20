import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  get: vi.fn((..._args: unknown[]): unknown => undefined),
  insert: vi.fn((..._args: unknown[]): unknown => undefined),
  update: vi.fn((..._args: unknown[]): unknown => undefined),
  del: vi.fn((..._args: unknown[]): unknown => undefined),
  setCredentials: vi.fn((..._args: unknown[]): unknown => undefined),
}))

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn(function () {
        return { setCredentials: mocks.setCredentials }
      }),
    },
    calendar: vi.fn(() => ({
      events: {
        get: mocks.get,
        insert: mocks.insert,
        update: mocks.update,
        delete: mocks.del,
      },
    })),
  },
}))

import { getCalendarEvent, restoreCalendarEvent } from "./google-calendar"

describe("google calendar restore", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna null quando o evento não existe", async () => {
    mocks.get.mockRejectedValueOnce({ code: 404 })
    expect(await getCalendarEvent("token", "evento")).toBeNull()
  })

  it("cria evento com o mesmo id quando não existe", async () => {
    mocks.get.mockRejectedValueOnce({ code: 404 })
    await restoreCalendarEvent("token", {
      id: "evento-1",
      summary: "Visita",
      start: { dateTime: "2026-01-02T10:00:00Z" },
      etag: "tag",
      htmlLink: "link",
    })
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    const corpo = (mocks.insert.mock.calls[0]?.[0] as { requestBody: Record<string, unknown> })
      .requestBody
    expect(corpo.id).toBe("evento-1")
    expect(corpo.summary).toBe("Visita")
    expect(corpo.etag).toBeUndefined()
    expect(corpo.htmlLink).toBeUndefined()
  })

  it("atualiza evento existente preservando payload completo", async () => {
    mocks.get.mockResolvedValueOnce({ data: { id: "evento-2" } })
    await restoreCalendarEvent("token", {
      id: "evento-2",
      summary: "Visita",
      description: "detalhe",
    })
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.insert).not.toHaveBeenCalled()
    expect((mocks.update.mock.calls[0]?.[0] as { eventId: string }).eventId).toBe("evento-2")
  })
})
