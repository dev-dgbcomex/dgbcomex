import { NextResponse } from "next/server"
import { handleApiError } from "@/lib/api-error"
import { requireAuth } from "@/lib/auth"
import { carregarItensTemperatura } from "@/lib/crm/temperatura-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    return NextResponse.json(await carregarItensTemperatura())
  } catch (error) {
    return handleApiError(error, "carregar temperatura do CRM")
  }
}
