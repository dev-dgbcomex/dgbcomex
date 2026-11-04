"use client"

import { Button } from "@/components/ui/button"
import { FileDown, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { exportCSV, exportMarkdown, exportPDFRelatorio } from "@/lib/export-utils"

export type DadosExportacao = {
  filename: string
  title: string
  headers: string[]
  rows: (string | number | null | undefined)[][]
  stats?: Record<string, string | number>
  period?: string
}

interface ExportarRelatorioProps {
  dados: DadosExportacao
  disabled?: boolean
}

export function ExportarRelatorio({ dados, disabled }: ExportarRelatorioProps) {
  const [exportando, setExportando] = useState<"pdf" | null>(null)

  function exportarCsv() {
    exportCSV(dados.filename, dados.headers, dados.rows)
    toast.success("CSV exportado")
  }

  function exportarMd() {
    exportMarkdown({
      filename: dados.filename,
      title: dados.title,
      headers: dados.headers,
      rows: dados.rows,
      stats: dados.stats,
      period: dados.period,
    })
    toast.success("Markdown exportado")
  }

  async function exportarPdf() {
    setExportando("pdf")
    try {
      await exportPDFRelatorio({
        title: dados.title,
        period: dados.period,
        filename: dados.filename,
        stats: dados.stats,
        tables: [{ headers: dados.headers, rows: dados.rows }],
      })
      toast.success("PDF exportado")
    } catch {
      toast.error("Erro ao gerar PDF")
    } finally {
      setExportando(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        onClick={exportarPdf}
        disabled={disabled || exportando === "pdf"}
        className="gap-1.5 text-xs h-8"
      >
        {exportando === "pdf" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileText size={14} />
        )}
        PDF
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={exportarCsv}
        disabled={disabled}
        className="gap-1.5 text-xs h-8"
      >
        <FileDown size={14} />
        CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={exportarMd}
        disabled={disabled}
        className="gap-1.5 text-xs h-8"
      >
        <FileDown size={14} />
        MD
      </Button>
    </div>
  )
}
