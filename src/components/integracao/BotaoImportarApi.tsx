"use client"

import { useState } from "react"
import { Database, Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import ImportarApiModal, { type ContextoImportarApi } from "./ImportarApiModal"

export interface IntegracaoEmUso {
  id: number
  nome: string
  baseUrl?: string
}

interface BotaoImportarApiProps {
  /** Nome da tela: é o filtro das integrações disponíveis (ex.: "bi", "wms"). */
  tela: string
  /** Integração que a tela está usando — aparece no rótulo e vem pré-selecionada. */
  integracao?: IntegracaoEmUso | null
  existingRecords?: Record<string, any>[]
  existingKey?: string
  /** Importação feita pela própria tela (BI e WMS não têm tabela local). */
  aoImportar?: (contexto: ContextoImportarApi) => Promise<void> | void
  rotulo?: string
  className?: string
}

/**
 * Botão "Importar via API" com a integração em uso à vista.
 *
 * A tela mostra qual endpoint está atendendo ela e o modal lista todas as APIs
 * cadastradas para o nome da tela — a que está em uso já vem selecionada.
 */
export default function BotaoImportarApi({
  tela,
  integracao,
  existingRecords = [],
  existingKey,
  aoImportar,
  rotulo,
  className,
}: BotaoImportarApiProps) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          <Plug size={13} className="text-slate-400" />
          Integração:{" "}
          <strong className="font-medium text-slate-800 dark:text-slate-100">
            {integracao?.nome ?? "não encontrada"}
          </strong>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAberto(true)}
          className="gap-2"
        >
          <Database size={14} />
          {rotulo ?? "Importar via API"}
        </Button>
      </div>

      {aberto && (
        <ImportarApiModal
          tela={tela}
          existingRecords={existingRecords}
          existingKey={existingKey}
          integracaoInicial={integracao?.id ?? null}
          aoImportar={aoImportar}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  )
}
