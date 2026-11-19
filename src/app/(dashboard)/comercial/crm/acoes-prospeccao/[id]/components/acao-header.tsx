import { ArrowLeft, Calendar, Check, Link as LinkIcon, Pencil, Trash2, X } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import AcaoProspeccaoReportButton from "@/components/crm/acao-prospeccao-report-button"
import SendAcaoProspeccaoSurveyButton from "@/components/crm/send-acao-prospeccao-survey-button"
import type { InfoContent } from "@/lib/info-content/types"
import type { AcaoProspeccaoDetalhe } from "../../types"
import { TIPO_LABELS } from "./constants"

interface AcaoProspeccaoHeaderProps {
  acao: AcaoProspeccaoDetalhe
  infoContent: InfoContent | null
  statusLabel: string
  statusColor: string
  onBack: () => void
  editing: boolean
  canEdit: boolean
  isGoogleUser: boolean
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onDelete: () => void
  onSync: () => void
  onUnsync: () => void
  onVincular: () => void
}

export function AcaoProspeccaoHeader({
  acao,
  infoContent,
  statusLabel,
  statusColor,
  onBack,
  editing,
  canEdit,
  isGoogleUser,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onSync,
  onUnsync,
  onVincular,
}: AcaoProspeccaoHeaderProps) {
  const titulo = acao.nomeAvulso || acao.empresaNome || acao.clienteNome || `#${acao.id}`

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 truncate">
              Ação de Prospecção — {titulo}
              {infoContent && <InfoButton content={infoContent} />}
            </h1>
            <span
              className="inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ backgroundColor: statusColor + "20", color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 truncate">
            {TIPO_LABELS[acao.tipo] || acao.tipo} —{" "}
            {acao.dataAcao
              ? new Date(acao.dataAcao + "T12:00:00").toLocaleDateString("pt-BR")
              : "—"}
            {acao.hora ? ` às ${acao.hora}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {editing ? (
          <>
            <button
              onClick={onSave}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline px-2 py-1.5 rounded-lg min-h-[36px]"
            >
              <Check size={14} /> Salvar
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:underline px-2 py-1.5 rounded-lg min-h-[36px]"
            >
              <X size={14} /> Cancelar
            </button>
          </>
        ) : (
          <>
            <AcaoProspeccaoReportButton acao={acao} />
            <SendAcaoProspeccaoSurveyButton
              acaoId={acao.id}
              empresaNome={acao.empresaNome || acao.clienteNome || undefined}
              contatoEmail={acao.contatoEmail || undefined}
              contatoNome={acao.contatoNome || undefined}
            />
            {isGoogleUser &&
              (acao.googleEventId ? (
                <button
                  onClick={onUnsync}
                  className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline px-2 py-1.5 rounded-lg min-h-[36px]"
                >
                  <Calendar size={14} /> Dessincronizar
                </button>
              ) : (
                <button
                  onClick={onSync}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline px-2 py-1.5 rounded-lg min-h-[36px]"
                >
                  <Calendar size={14} /> Sincronizar
                </button>
              ))}
            {canEdit && (
              <>
                {!acao.empresaId && !acao.clienteId && (
                  <button
                    onClick={onVincular}
                    className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline px-2 py-1.5 rounded-lg min-h-[36px]"
                  >
                    <LinkIcon size={14} /> Vincular
                  </button>
                )}
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline px-2 py-1.5 rounded-lg min-h-[36px]"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline px-2 py-1.5 rounded-lg min-h-[36px]"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
