import { ArrowLeft, Check, X, Pencil, Archive, Building2 } from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import type { InfoContent } from "@/lib/info-content"
import { STATUS_CORES } from "./constants"
import type { Lead } from "../../types"

interface LeadHeaderProps {
  lead: Lead
  info: InfoContent | null
  editing: boolean
  onBack: () => void
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onPromover?: () => void
}

export function LeadHeader({
  lead,
  info,
  editing,
  onBack,
  onSave,
  onCancel,
  onEdit,
  onPromover,
}: LeadHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={18} className="text-slate-500" />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {lead.tipoPessoa === "PF" ? lead.nome || lead.razaoSocial : lead.razaoSocial}
            {info && <InfoButton content={info} />}
          </h1>
          {lead.tipoPessoa && (
            <span
              className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                lead.tipoPessoa === "PF"
                  ? "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400"
                  : "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400"
              }`}
            >
              {lead.tipoPessoa === "PF" ? "PF" : "PJ"}
            </span>
          )}
          <span
            className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CORES[lead.status ?? ""] || ""}`}
          >
            {lead.status}
          </span>
          {lead.promovidaCliente && (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
              title={
                lead.promovidoEm
                  ? `Transformada em cliente em ${new Date(lead.promovidoEm).toLocaleString("pt-BR")}${
                      lead.promovidoPorNome ? ` por ${lead.promovidoPorNome}` : ""
                    }`
                  : "Transformada em cliente"
              }
            >
              <Archive size={11} /> Cliente
            </span>
          )}
        </div>
        {lead.tipoPessoa === "PJ" && lead.nomeFantasia && (
          <p className="text-sm text-slate-500">{lead.nomeFantasia}</p>
        )}
      </div>
      <div className="flex gap-2">
        {editing ? (
          <>
            <button
              onClick={onSave}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
            >
              <Check size={14} /> Salvar
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:underline"
            >
              <X size={14} /> Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Pencil size={14} /> Editar
            </button>
            {!lead.promovidaCliente && onPromover && (
              <button
                onClick={onPromover}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
              >
                <Building2 size={14} /> Tornar cliente
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
