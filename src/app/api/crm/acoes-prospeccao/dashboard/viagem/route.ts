import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmViagens } from "@/lib/db/schema/crm-viagens"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { eq, asc } from "drizzle-orm"
import { calcularTrajeto, type PontoRota } from "@/lib/crm/roteiro-geo"
import { montarEnderecoTexto, temEndereco, type EnderecoCampos } from "@/lib/crm/endereco"
import { geocodificarCamposEndereco } from "@/lib/crm/geocode"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const viagemId = Number(searchParams.get("viagemId"))
    if (!viagemId) {
      return NextResponse.json({ error: "viagemId é obrigatório" }, { status: 400 })
    }

    const [viagemResult, acoes] = await Promise.all([
      db.select().from(crmViagens).where(eq(crmViagens.id, viagemId)),
      db
        .select({
          id: crmAcoesProspeccao.id,
          empresaId: crmAcoesProspeccao.empresaId,
          empresaNome: crmPessoas.razaoSocial,
          clienteId: crmAcoesProspeccao.clienteId,
          clienteNome: clientes.nome,
          clienteEndereco: clientes.endereco,
          clienteCidade: clientes.cidade,
          clienteUf: clientes.uf,
          nomeAvulso: crmAcoesProspeccao.nomeAvulso,
          dataAcao: crmAcoesProspeccao.dataAcao,
          hora: crmAcoesProspeccao.hora,
          tipo: crmAcoesProspeccao.tipo,
          status: crmAcoesProspeccao.status,
          endereco: crmAcoesProspeccao.endereco,
          numero: crmAcoesProspeccao.numero,
          complemento: crmAcoesProspeccao.complemento,
          bairro: crmAcoesProspeccao.bairro,
          cidade: crmAcoesProspeccao.cidade,
          uf: crmAcoesProspeccao.uf,
          cep: crmAcoesProspeccao.cep,
          enderecoLat: crmAcoesProspeccao.enderecoLat,
          enderecoLng: crmAcoesProspeccao.enderecoLng,
          empresaEndereco: crmPessoas.endereco,
          empresaNumero: crmPessoas.numero,
          empresaComplemento: crmPessoas.complemento,
          empresaBairro: crmPessoas.bairro,
          empresaCidade: crmPessoas.cidade,
          empresaUf: crmPessoas.uf,
          empresaCep: crmPessoas.cep,
          checkInTime: crmAcoesProspeccao.checkInTime,
          checkOutTime: crmAcoesProspeccao.checkOutTime,
          checkInLat: crmAcoesProspeccao.checkInLat,
          checkInLng: crmAcoesProspeccao.checkInLng,
          checkOutLat: crmAcoesProspeccao.checkOutLat,
          checkOutLng: crmAcoesProspeccao.checkOutLng,
        })
        .from(crmAcoesProspeccao)
        .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
        .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
        .where(eq(crmAcoesProspeccao.viagemId, viagemId))
        .orderBy(asc(crmAcoesProspeccao.dataAcao), asc(crmAcoesProspeccao.hora), asc(crmAcoesProspeccao.id)),
    ])

    if (!viagemResult[0]) {
      return NextResponse.json({ error: "Viagem não encontrada" }, { status: 404 })
    }

    const viagem = viagemResult[0]

    const acoesOrdenadas = acoes.map((r: any) => {
      const camposAcao: EnderecoCampos = {
        endereco: r.endereco,
        numero: r.numero,
        complemento: r.complemento,
        bairro: r.bairro,
        cidade: r.cidade,
        uf: r.uf,
      }
      const camposEmpresa: EnderecoCampos = {
        endereco: r.empresaEndereco,
        numero: r.empresaNumero,
        complemento: r.empresaComplemento,
        bairro: r.empresaBairro,
        cidade: r.empresaCidade,
        uf: r.empresaUf,
      }
      const camposCliente: EnderecoCampos = {
        endereco: r.clienteEndereco,
        cidade: r.clienteCidade,
        uf: r.clienteUf,
      }
      const enderecoCampos: EnderecoCampos | null = temEndereco(camposAcao)
        ? camposAcao
        : temEndereco(camposEmpresa)
          ? camposEmpresa
          : temEndereco(camposCliente)
            ? camposCliente
            : null
      const enderecoTexto = enderecoCampos ? montarEnderecoTexto(enderecoCampos) : ""
      const nome = r.empresaNome || r.clienteNome || r.nomeAvulso || `Ação de prospecção #${r.id}`
      return { ...r, nome, enderecoTexto, enderecoCampos }
    })

    const geocodificadas = new Map<number, { latitude: number; longitude: number }>()
    for (const v of acoesOrdenadas) {
      const temCheckIn = v.checkInLat != null || v.checkInLng != null
      const temCheckOut = v.checkOutLat != null || v.checkOutLng != null
      const temEnderecoCoords = v.enderecoLat != null || v.enderecoLng != null
      if (temCheckIn || temCheckOut || temEnderecoCoords) continue
      if (!v.enderecoCampos) continue
      const coords = await geocodificarCamposEndereco(v.enderecoCampos)
      if (coords) geocodificadas.set(v.id, coords)
    }

    const pontos: PontoRota[] = []
    for (const v of acoesOrdenadas) {
      const latitude =
        v.checkInLat ?? v.checkOutLat ?? v.enderecoLat ?? geocodificadas.get(v.id)?.latitude
      const longitude =
        v.checkInLng ?? v.checkOutLng ?? v.enderecoLng ?? geocodificadas.get(v.id)?.longitude
      if (latitude != null && longitude != null) {
        pontos.push({ id: v.id, latitude: Number(latitude), longitude: Number(longitude) })
      }
    }

    const { kmEntrePontos, totalKm } = calcularTrajeto(pontos)
    let pontoIndex = 0

    const acoesComKm = acoesOrdenadas.map((v: any) => {
      const geocoded = geocodificadas.get(v.id)
      const latitude = v.checkInLat ?? v.checkOutLat ?? v.enderecoLat ?? geocoded?.latitude ?? null
      const longitude =
        v.checkInLng ?? v.checkOutLng ?? v.enderecoLng ?? geocoded?.longitude ?? null
      const temPonto = latitude != null && longitude != null
      let localizacaoFonte: "checkin" | "endereco" | "geocodificada" | null = null
      if (
        v.checkInLat != null ||
        v.checkInLng != null ||
        v.checkOutLat != null ||
        v.checkOutLng != null
      ) {
        localizacaoFonte = "checkin"
      } else if (v.enderecoLat != null || v.enderecoLng != null) {
        localizacaoFonte = "endereco"
      } else if (geocoded) {
        localizacaoFonte = "geocodificada"
      }
      let km: number | null = null
      if (temPonto) {
        km = pontoIndex === 0 ? 0 : (kmEntrePontos[pontoIndex - 1] ?? 0)
        pontoIndex++
      }
      return {
        id: v.id,
        nome: v.nome,
        empresaId: v.empresaId,
        clienteId: v.clienteId,
        dataAcao: v.dataAcao,
        hora: v.hora,
        tipo: v.tipo,
        status: v.status,
        enderecoTexto: v.enderecoTexto,
        checkInTime: v.checkInTime,
        checkOutTime: v.checkOutTime,
        latitude: temPonto ? Number(latitude) : null,
        longitude: temPonto ? Number(longitude) : null,
        localizacaoFonte,
        km: km == null ? null : Number(km.toFixed(1)),
      }
    })

    const comEndereco = acoesComKm.filter((v: any) => v.localizacaoFonte === "endereco").length

    return NextResponse.json({
      viagem: {
        id: viagem.id,
        titulo: viagem.titulo,
        descricao: viagem.descricao,
        destinoCidade: viagem.destinoCidade,
        destinoUf: viagem.destinoUf,
        dataInicio: viagem.dataInicio,
        dataFim: viagem.dataFim,
        status: viagem.status,
      },
      acoes: acoesComKm,
      resumo: {
        total: acoesComKm.length,
        realizadas: acoesComKm.filter((v: any) => v.status === "REALIZADA").length,
        canceladas: acoesComKm.filter((v: any) => v.status === "CANCELADA").length,
        agendadas: acoesComKm.filter((v: any) => v.status === "AGENDADA").length,
        comLocalizacao: pontos.length,
        comEndereco,
        geocodificadas: geocodificadas.size,
        kmTotal: Number(totalKm.toFixed(1)),
        kmSemLocalizacao: acoesComKm.length - pontos.length,
      },
    })
  } catch (error) {
    console.error("[GET /api/crm/acoes-prospeccao/dashboard/viagem]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
