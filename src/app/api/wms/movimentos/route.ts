import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { listarMovimentos, registrarMovimento } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"
import { WMS_MOVIMENTO_TIPO, type NovaPeca, type WmsMovimentoTipo } from "@/lib/wms/tipos"

export const dynamic = "force-dynamic"

const TIPOS = new Set<string>(WMS_MOVIMENTO_TIPO)

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null
}

function pecaDoCorpo(peca: Record<string, unknown> | undefined): NovaPeca | null {
  const nroRolo = texto(peca?.nroRolo)
  const nroPeca = texto(peca?.nroPeca)
  if (!nroRolo || !nroPeca) return null

  return {
    empresa: texto(peca?.empresa),
    nroRolo,
    nroPeca,
    produto: texto(peca?.produto),
    categoria: texto(peca?.categoria),
    cor: texto(peca?.cor),
    desenho: texto(peca?.desenho),
    variante: texto(peca?.variante),
    largura: texto(peca?.largura),
    metros: numero(peca?.metros),
    peso: numero(peca?.peso),
    situacao: texto(peca?.situacao),
    loteInterno: texto(peca?.loteInterno),
    dataEntrada: texto(peca?.dataEntrada),
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const limite = Number(req.nextUrl.searchParams.get("limite") ?? 50)
    return NextResponse.json(await listarMovimentos(Number.isFinite(limite) ? limite : 50))
  } catch (error) {
    return erroWms(error, "GET /api/wms/movimentos")
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = (await req.json()) as Record<string, unknown>
    const tipo = typeof body.tipo === "string" ? body.tipo : ""
    if (!TIPOS.has(tipo)) {
      return NextResponse.json({ error: "Tipo de movimento inválido" }, { status: 400 })
    }

    const usuarioId = auth.userId
    const observacao = texto(body.observacao)
    const enderecoDestinoId = numero(body.enderecoDestinoId)

    if (tipo === "ENTRADA") {
      if (!enderecoDestinoId) {
        return NextResponse.json({ error: "Endereço de destino inválido" }, { status: 400 })
      }
      const peca = pecaDoCorpo(body.peca as Record<string, unknown> | undefined)
      if (!peca) {
        return NextResponse.json(
          { error: "Nro. Rolo e Nro. Peça são obrigatórios" },
          { status: 400 }
        )
      }
      const { movimento, peca: alocada } = await registrarMovimento({
        tipo: tipo as WmsMovimentoTipo,
        enderecoDestinoId,
        usuarioId,
        observacao,
        peca,
      })
      return NextResponse.json({ movimento, peca: alocada }, { status: 201 })
    }

    const estoqueId = numero(body.estoqueId)
    if (!estoqueId) {
      return NextResponse.json({ error: "Peça alocada é obrigatória" }, { status: 400 })
    }

    const { movimento } = await registrarMovimento({
      tipo: tipo as WmsMovimentoTipo,
      estoqueId,
      enderecoDestinoId: tipo === "TRANSFERENCIA" ? enderecoDestinoId : null,
      usuarioId,
      observacao,
    })
    return NextResponse.json({ movimento }, { status: 201 })
  } catch (error) {
    return erroWms(error, "POST /api/wms/movimentos")
  }
}
