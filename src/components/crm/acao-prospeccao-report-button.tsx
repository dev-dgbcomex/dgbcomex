"use client"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { AcaoProspeccaoDetalhe } from "@/app/(dashboard)/comercial/crm/acoes-prospeccao/types"
import {
  normalizeAcaoProspeccaoFotos,
  type AcaoProspeccaoFoto,
} from "@/lib/crm/acao-prospeccao-fotos"

interface Location {
  id: number
  latitude: number
  longitude: number
  endereco: string | null
  observacao: string | null
  tipo: string
  createdAt: string | null
}

interface EmpresaConfig {
  nome?: string
  documento?: string
  endereco?: string
  cidade?: string | null
  uf?: string | null
  isDefault?: boolean
}

const TIPO_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  VIDEO: "Video",
  TELEFONE: "Telefone",
}

export default function AcaoProspeccaoReportButton({
  acao,
}: {
  acao: AcaoProspeccaoDetalhe
}) {
  const [generating, setGenerating] = useState(false)

  async function generateReport() {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      let empresa: EmpresaConfig | null = null
      try {
        const res = await fetch("/api/admin/config/empresa")
        const list = (await res.json()) as EmpresaConfig[]
        empresa = list.find((item) => item.isDefault) || list[0] || null
      } catch {}

      let locations: Location[] = []
      try {
        const res = await fetch(`/api/crm/acoes-prospeccao/${acao.id}/localizacoes`)
        if (res.ok) locations = (await res.json()) as Location[]
      } catch {}

      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const marginX = 14
      const contentW = pageW - marginX * 2

      doc.setFillColor(7, 63, 184)
      doc.rect(0, 0, pageW, 28, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13).setFont("helvetica", "bold")
      doc.text(empresa?.nome || "DGBCOMEX", marginX, 11)
      doc.setFontSize(7).setFont("helvetica", "normal")
      const headerParts: string[] = []
      if (empresa?.documento) headerParts.push(`CNPJ: ${empresa.documento}`)
      if (empresa?.endereco) headerParts.push(empresa.endereco)
      if (empresa?.cidade || empresa?.uf)
        headerParts.push([empresa.cidade, empresa.uf].filter(Boolean).join("/"))
      if (headerParts.length > 0) doc.text(headerParts.join(" — "), marginX, 17)

      let y = 40
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(16).setFont("helvetica", "bold")
      doc.text(`Relatorio de Acao de Prospeccao #${acao.id}`, marginX, y)
      y += 8
      doc.setFontSize(9).setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, y)
      y += 12

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(200, 200, 200)

      let ly = y + 8
      const col1X = marginX + 6
      const col2X = marginX + contentW / 2 + 6

      const entidadeNome =
        acao.nomeAvulso || acao.empresaNome || acao.clienteNome || "Ação de Prospecção"
      const entidadeLines = doc.splitTextToSize(entidadeNome, contentW / 2 - 24)

      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)

      let boxLines = 1 + entidadeLines.length
      if (acao.oportunidadeTitulo) boxLines++
      if (acao.contatoNome) boxLines++
      if (acao.representanteNome) boxLines++
      if (acao.propostaTitulo) boxLines++
      if (acao.criadoPorNome) boxLines++
      const boxH = boxLines * 7 + 12
      doc.roundedRect(marginX, y, contentW, boxH, 2, 2, "FD")

      doc.setFont("helvetica", "bold")
      doc.text("Acao:", col1X, ly)
      doc.setFont("helvetica", "normal")
      doc.text(entidadeLines[0], col1X + 14, ly)
      ly += 5

      if (entidadeLines.length > 1) {
        for (let i = 1; i < entidadeLines.length; i++) {
          doc.text(entidadeLines[i], col1X + 14, ly)
          ly += 4
        }
      }
      ly += 2

      doc.setFont("helvetica", "bold")
      doc.text("Status:", col1X, ly)
      doc.setFont("helvetica", "normal")
      doc.text(acao.status, col1X + 16, ly)
      doc.setFont("helvetica", "bold")
      doc.text("Tipo:", col2X, ly)
      doc.setFont("helvetica", "normal")
      doc.text(TIPO_LABELS[acao.tipo] || acao.tipo, col2X + 12, ly)
      ly += 7

      doc.setFont("helvetica", "bold")
      doc.text("Data:", col1X, ly)
      doc.setFont("helvetica", "normal")
      doc.text(
        acao.dataAcao
          ? `${new Date(acao.dataAcao + "T12:00:00").toLocaleDateString("pt-BR")}${acao.hora ? ` as ${acao.hora}` : ""}`
          : "—",
        col1X + 12,
        ly
      )
      ly += 7

      if (acao.oportunidadeTitulo) {
        doc.setFont("helvetica", "bold")
        doc.text("Oportunidade:", col1X, ly)
        doc.setFont("helvetica", "normal")
        doc.text(acao.oportunidadeTitulo, col1X + 30, ly)
        ly += 7
      }
      if (acao.contatoNome) {
        doc.setFont("helvetica", "bold")
        doc.text("Contato:", col1X, ly)
        doc.setFont("helvetica", "normal")
        doc.text(acao.contatoNome, col1X + 20, ly)
        ly += 7
      }
      if (acao.representanteNome) {
        doc.setFont("helvetica", "bold")
        doc.text("Representante:", col1X, ly)
        doc.setFont("helvetica", "normal")
        doc.text(acao.representanteNome, col1X + 30, ly)
        ly += 7
      }
      if (acao.propostaTitulo) {
        doc.setFont("helvetica", "bold")
        doc.text("Proposta:", col1X, ly)
        doc.setFont("helvetica", "normal")
        doc.text(acao.propostaTitulo, col1X + 22, ly)
        ly += 7
      }
      if (acao.criadoPorNome) {
        doc.setFont("helvetica", "bold")
        doc.text("Gerente Comercial:", col1X, ly)
        doc.setFont("helvetica", "normal")
        doc.text(acao.criadoPorNome, col1X + 40, ly)
        ly += 7
      }

      y = ly + 6

      if (acao.endereco || acao.cidade) {
        doc.setFontSize(10).setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("Endereco", marginX, y)
        y += 6
        doc.setFontSize(8).setFont("helvetica", "normal")
        const enderecoParts = [
          acao.endereco,
          acao.numero,
          acao.complemento,
          acao.bairro,
          [acao.cidade, acao.uf].filter(Boolean).join("/"),
        ].filter(Boolean)
        if (enderecoParts.length > 0) {
          doc.text(enderecoParts.join(", "), marginX, y)
          y += 7
        }

        const enderecoCompleto = enderecoParts.join(", ")
        const mapsUrl =
          acao.checkInLat && acao.checkInLng
            ? `https://www.google.com/maps?q=${acao.checkInLat},${acao.checkInLng}`
            : `https://www.google.com/maps/search/${encodeURIComponent(enderecoCompleto)}`
        doc.setFontSize(7).setFont("helvetica", "normal")
        doc.setTextColor(59, 130, 246)
        const mapsText = "Abrir no Google Maps"
        doc.text(mapsText, marginX, y)
        const textW = doc.getTextWidth(mapsText)
        doc.link(marginX, y - 3, textW, 4, { url: mapsUrl })
        doc.setTextColor(0, 0, 0)
        y += 11
      }

      if (acao.checkInTime || acao.checkOutTime) {
        doc.setFontSize(10).setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("Check-in / Check-out", marginX, y)
        y += 6
        doc.setFontSize(8).setFont("helvetica", "normal")

        if (acao.checkInTime) {
          doc.setFont("helvetica", "bold")
          doc.text("Check-in:", marginX, y)
          doc.setFont("helvetica", "normal")
          doc.text(new Date(acao.checkInTime).toLocaleString("pt-BR"), marginX + 20, y)
          if (acao.checkInLat && acao.checkInLng) {
            doc.text(
              `(${acao.checkInLat.toFixed(6)}, ${acao.checkInLng.toFixed(6)})`,
              marginX + 80,
              y
            )
          }
          y += 6
        }
        if (acao.checkOutTime) {
          doc.setFont("helvetica", "bold")
          doc.text("Check-out:", marginX, y)
          doc.setFont("helvetica", "normal")
          doc.text(new Date(acao.checkOutTime).toLocaleString("pt-BR"), marginX + 22, y)
          if (acao.checkOutLat && acao.checkOutLng) {
            doc.text(
              `(${acao.checkOutLat.toFixed(6)}, ${acao.checkOutLng.toFixed(6)})`,
              marginX + 80,
              y
            )
          }
          y += 6
        }
        y += 4
      }

      if (locations.length > 0) {
        doc.setFontSize(10).setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text(`Localizacoes (${locations.length})`, marginX, y)
        y += 6

        const locRows = locations.map((loc) => [
          loc.createdAt ? new Date(loc.createdAt).toLocaleString("pt-BR") : "—",
          `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`,
          loc.observacao || "—",
          `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`,
        ])

        autoTable(doc, {
          head: [["Data/Hora", "Coordenadas", "Observacao", "Link Maps"]],
          body: locRows,
          startY: y,
          margin: { left: marginX, right: marginX },
          tableWidth: contentW,
          styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0] },
          headStyles: { fillColor: [7, 63, 184], textColor: 255, fontStyle: "bold", fontSize: 6 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 3: { textColor: [59, 130, 246], fontStyle: "normal" } },
        })

        y = ((autoTable as any).previous?.finalY ?? y + 40) + 8
      }

      if (acao.relato) {
        if (y > pageH - 60) {
          doc.addPage()
          y = 20
        }
        doc.setFontSize(10).setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("Relato / Ata", marginX, y)
        y += 6

        const cleanRelato = acao.relato
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim()
        doc.setFontSize(8).setFont("helvetica", "normal")
        const splitRelato = doc.splitTextToSize(cleanRelato, contentW)
        doc.text(splitRelato, marginX, y)
        y += splitRelato.length * 4 + 8
      }

      const fotosList: AcaoProspeccaoFoto[] = normalizeAcaoProspeccaoFotos(acao.fotos)
      if (fotosList.length > 0) {
        if (y > pageH - 60) {
          doc.addPage()
          y = 20
        }
        doc.setFontSize(10).setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text(`Fotos (${fotosList.length})`, marginX, y)
        y += 6

        doc.setFontSize(7).setFont("helvetica", "normal")
        doc.setTextColor(59, 130, 246)
        for (const foto of fotosList) {
          if (y > pageH - 20) {
            doc.addPage()
            y = 20
          }
          doc.text(foto.url, marginX, y)
          y += 4
          if (foto.descricao) {
            doc.setTextColor(80, 80, 80)
            doc.text(`  ${foto.descricao}`, marginX, y)
            doc.setTextColor(59, 130, 246)
            y += 4
          }
        }
        doc.setTextColor(0, 0, 0)
        y += 4
      }

      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(6).setFont("helvetica", "normal")
        doc.setTextColor(80, 80, 80)
        doc.text(
          `${empresa?.nome || "DGBCOMEX"} — Relatorio gerado automaticamente`,
          marginX,
          pageH - 6
        )
        doc.text(`Pagina ${i}/${pageCount}`, pageW - marginX, pageH - 6, { align: "right" })
      }

      doc.save(`relatorio-acao-prospeccao-${acao.id}.pdf`)
      toast.success("Relatório gerado com sucesso")
    } catch (error) {
      console.error("[AcaoProspeccaoReport]", error)
      toast.error("Erro ao gerar relatório")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={generateReport}
      disabled={generating}
      className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1.5 rounded-lg min-h-[36px]"
    >
      {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
      {generating ? "Gerando..." : "Gerar Relatório"}
    </button>
  )
}
