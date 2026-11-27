import { NextResponse } from "next/server"
import { notificarErro } from "./notificar"

const FK_ERROR = "23503" // PostgreSQL foreign_key_violation

function detalhesCausa(error: unknown): string {
  const causa = (error as { cause?: unknown } | null)?.cause
  if (causa == null) return ""
  const texto = causa instanceof Error ? causa.message : String(causa)
  return texto && texto !== String(error) ? ` | causa: ${texto}` : ""
}

function pgErrorCode(error: unknown): string | undefined {
  const visitados = new Set<unknown>()
  let atual: unknown = error

  while (atual && typeof atual === "object" && !visitados.has(atual)) {
    visitados.add(atual)
    const codigo = (atual as { code?: unknown }).code
    if (typeof codigo === "string") return codigo
    atual = (atual as { cause?: unknown }).cause
  }

  return undefined
}

export async function handleApiError(error: unknown, context: string, usuarioNome?: string | null) {
  const isFK = pgErrorCode(error) === FK_ERROR

  const detalhes = detalhesCausa(error)
  if (detalhes) console.error(`[${context}]`, error, detalhes)
  else console.error(`[${context}]`, error)

  if (isFK) {
    return NextResponse.json(
      {
        error: "Este registro não pode ser excluído pois possui outros cadastros vinculados a ele.",
        fkError: true,
      },
      { status: 409 }
    )
  }

  await notificarErro(context, error, usuarioNome)

  return NextResponse.json(
    {
      error: "Ocorreu um erro inesperado. A equipe de suporte foi notificada.",
    },
    { status: 500 }
  )
}

export function getErrorMessage(error: unknown, fallback = "Erro ao processar requisição"): string {
  if (error instanceof Error) return error.message
  return String(error) || fallback
}
