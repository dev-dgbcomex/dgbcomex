"use server"

import { propostaVinculadaAcaoProspeccaoVisivelPara } from "@/lib/campos-visiveis"

export async function propostaVinculadaAcaoProspeccaoVisivel(role: string | null | undefined) {
  return propostaVinculadaAcaoProspeccaoVisivelPara(role)
}
