import { google } from "googleapis"

function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.calendar({ version: "v3", auth })
}

export interface CalendarEventInput {
  summary: string
  description?: string
  startTime: string
  endTime?: string
  location?: string
}

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventInput
): Promise<string> {
  const calendar = getCalendarClient(accessToken)
  const startDateTime = new Date(event.startTime).toISOString()
  const endDateTime = event.endTime
    ? new Date(event.endTime).toISOString()
    : new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString()

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description || "",
      location: event.location || "",
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime },
    },
  })

  return res.data.id || ""
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEventInput
): Promise<void> {
  const calendar = getCalendarClient(accessToken)
  const startDateTime = new Date(event.startTime).toISOString()
  const endDateTime = event.endTime
    ? new Date(event.endTime).toISOString()
    : new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString()

  await calendar.events.update({
    calendarId: "primary",
    eventId,
    requestBody: {
      summary: event.summary,
      description: event.description || "",
      location: event.location || "",
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime },
    },
  })
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const calendar = getCalendarClient(accessToken)
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  })
}

export interface CalendarEventPayload {
  id: string
  [key: string]: unknown
}

function erroGoogle404(erro: unknown): boolean {
  const possivel = erro as { code?: number; status?: number; response?: { status?: number } }
  return possivel?.code === 404 || possivel?.status === 404 || possivel?.response?.status === 404
}

export async function getCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<CalendarEventPayload | null> {
  const calendar = getCalendarClient(accessToken)
  try {
    const resposta = await calendar.events.get({ calendarId: "primary", eventId })
    return (resposta.data as CalendarEventPayload) ?? null
  } catch (erro) {
    if (erroGoogle404(erro)) return null
    throw erro
  }
}

export async function restoreCalendarEvent(
  accessToken: string,
  evento: CalendarEventPayload
): Promise<void> {
  const calendar = getCalendarClient(accessToken)
  const existente = await getCalendarEvent(accessToken, evento.id)
  const corpo: Record<string, unknown> = { ...evento, id: evento.id }
  for (const chave of [
    "etag",
    "htmlLink",
    "created",
    "updated",
    "creator",
    "organizer",
    "iCalUID",
    "sequence",
    "kind",
  ]) {
    delete corpo[chave]
  }
  if (existente) {
    await calendar.events.update({ calendarId: "primary", eventId: evento.id, requestBody: corpo })
    return
  }
  await calendar.events.insert({ calendarId: "primary", requestBody: corpo })
}
