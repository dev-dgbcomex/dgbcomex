import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import {
  buscarPeca,
  criarPeca,
  enderecoExiste,
  listarMovimentos,
  moverPeca,
  registrarMovimento,
  removerPeca,
} from "@/lib/wms/repo"
import { WMS_MOVIMENTO_TIPO } from "@/lib/db/schema/wms"

const TIPOS = new Set<string>(WMS_MOVIMENTO_TIPO)

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const limite = Number(req.nextUrl.searchParams.get("limite") ?? 50)
    return NextResponse.json(await listarMovimentos(Number.isFinite(limite) ? limite : 50))
  } catch (error) {
    return handleApiError(error, "GET /api/wms/movimentos")
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

    if (tipo === "ENTRADA") {
      const enderecoId = numero(body.enderecoDestinoId)
      const peca = body.peca as Record<string, unknown> | undefined
      if (!enderecoId || !(await enderecoExiste(enderecoId))) {
        return NextResponse.json({ error: "Endereço de destino inválido" }, { status: 400 })
      }
      const nroRolo = texto(peca?.nroRolo)
      const nroPeca = texto(peca?.nroPeca)
      if (!nroRolo || !nroPeca) {
        return NextResponse.json({ error: "Nro. Rolo e Nro. Peça são obrigatórios" }, { status: 400 })
      }
      const nova = await criarPeca(enderecoId, {
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
      })
      if (!nova) {
        return NextResponse.json({ error: "Esta peça já está alocada" }, { status: 409 })
      }
      const movimento = await registrarMovimento({
        tipo,
        estoqueId: nova.id,
        enderecoDestinoId: enderecoId,
        usuarioId,
        metros: numero(peca?.metros),
        peso: numero(peca?.peso),
        observacao,
      })
      return NextResponse.json({ movimento, peca: nova }, { status: 201 })
    }

    const estoqueId = numero(body.estoqueId)
    if (!estoqueId) {
      return NextResponse.json({ error: "Peça alocada é obrigatória" }, { status: 400 })
    }
    const peca = await buscarPeca(estoqueId)
    if (!peca) {
      return NextResponse.json({ error: "Peça alocada não encontrada" }, { status: 404 })
    }

    if (tipo === "TRANSFERENCIA") {
      const enderecoDestinoId = numero(body.enderecoDestinoId)
      if (!enderecoDestinoId || !(await enderecoExiste(enderecoDestinoId))) {
        return NextResponse.json({ error: "Endereço de destino inválido" }, { status: 400 })
      }
      await moverPeca(estoqueId, enderecoDestinoId)
      const movimento = await registrarMovimento({
        tipo,
        estoqueId,
        enderecoOrigemId: peca.enderecoId,
        enderecoDestinoId,
        usuarioId,
        observacao,
      })
      return NextResponse.json({ movimento }, { status: 201 })
    }

    if (tipo === "SAIDA") {
      await removerPeca(estoqueId)
      const movimento = await registrarMovimento({
        tipo,
        estoqueId,
        enderecoOrigemId: peca.enderecoId,
        usuarioId,
        observacao,
      })
      return NextResponse.json({ movimento }, { status: 201 })
    }

    const movimento = await registrarMovimento({
      tipo,
      estoqueId,
      usuarioId,
      observacao,
    })
    return NextResponse.json({ movimento }, { status: 201 })
  } catch (error) {
    return handleApiError(error, "POST /api/wms/movimentos")
  }
}
