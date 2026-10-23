import { NextResponse } from "next/server"
import { handleApiError } from "@/lib/api-error"
import { ErroWms } from "./cliente"

/**
 * Resposta de erro das rotas `/api/wms/*`: `ErroWms` mantém a mensagem/status da
 * api-microdata (400, 404, 409...); qualquer outra falha cai no tratamento padrão.
 */
export async function erroWms(error: unknown, contexto: string) {
  if (error instanceof ErroWms) {
    console.error(`[${contexto}]`, error.message)
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return handleApiError(error, contexto)
}
