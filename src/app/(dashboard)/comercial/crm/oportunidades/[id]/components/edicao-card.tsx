"use client"

import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import type { OportunidadeDetalhe, UsuarioResumo } from "../../types"

export type OportunidadeUpdate = {
  titulo: string
  descricao: string | null
  valorEstimado: string | null
  probabilidade: number | null
  dataFechamentoPrevista: string | null
  responsavelId: number | null
  motivoPerda: string | null
}

type Props = {
  oportunidade: OportunidadeDetalhe
  usuarios: UsuarioResumo[]
  saving: boolean
  onCancel: () => void
  onSave: (body: OportunidadeUpdate) => void
}

function dataIso(valor: string | null | undefined) {
  if (!valor) return ""
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ""
  return data.toISOString().slice(0, 10)
}

export default function EdicaoOportunidade({
  oportunidade,
  usuarios,
  saving,
  onCancel,
  onSave,
}: Props) {
  const [titulo, setTitulo] = useState(oportunidade.titulo || "")
  const [descricao, setDescricao] = useState(oportunidade.descricao || "")
  const [valorEstimado, setValorEstimado] = useState(
    oportunidade.valorEstimado != null ? String(oportunidade.valorEstimado) : ""
  )
  const [probabilidade, setProbabilidade] = useState(
    oportunidade.probabilidade != null ? String(oportunidade.probabilidade) : ""
  )
  const [dataFechamentoPrevista, setDataFechamentoPrevista] = useState(
    dataIso(oportunidade.dataFechamentoPrevista)
  )
  const [responsavelId, setResponsavelId] = useState(
    oportunidade.responsavelId != null ? String(oportunidade.responsavelId) : ""
  )
  const [motivoPerda, setMotivoPerda] = useState(oportunidade.motivoPerda || "")

  const perdido = oportunidade.status === "FECHADO_PERDIDO"

  function handleSave() {
    if (!titulo.trim()) {
      toast.error("O título é obrigatório")
      return
    }
    onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      valorEstimado: valorEstimado.trim() || null,
      probabilidade: probabilidade.trim() ? parseInt(probabilidade) : null,
      dataFechamentoPrevista: dataFechamentoPrevista || null,
      responsavelId: responsavelId ? parseInt(responsavelId) : null,
      motivoPerda: perdido ? motivoPerda.trim() || null : undefined,
    } as OportunidadeUpdate)
  }

  const classeInput =
    "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Editar Oportunidade
      </h2>

      <div>
        <label
          htmlFor="editar-titulo"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Título *
        </label>
        <input
          id="editar-titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="editar-valor"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Valor Estimado (R$)
          </label>
          <input
            id="editar-valor"
            type="number"
            step="0.01"
            value={valorEstimado}
            onChange={(e) => setValorEstimado(e.target.value)}
            className={classeInput}
            placeholder="0,00"
          />
        </div>
        <div>
          <label
            htmlFor="editar-probabilidade"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Probabilidade (%)
          </label>
          <input
            id="editar-probabilidade"
            type="number"
            min="0"
            max="100"
            value={probabilidade}
            onChange={(e) => setProbabilidade(e.target.value)}
            className={classeInput}
            placeholder="0"
          />
        </div>
        <div>
          <label
            htmlFor="editar-previsao"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Previsão de Fechamento
          </label>
          <input
            id="editar-previsao"
            type="date"
            value={dataFechamentoPrevista}
            onChange={(e) => setDataFechamentoPrevista(e.target.value)}
            className={classeInput}
          />
        </div>
        <div>
          <label
            htmlFor="editar-responsavel"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Responsável
          </label>
          <select
            id="editar-responsavel"
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            className={classeInput}
          >
            <option value="">Sem responsável</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={String(usuario.id)}>
                {usuario.name || `Usuário ${usuario.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="editar-descricao"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Descrição
        </label>
        <textarea
          id="editar-descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          className={classeInput}
        />
      </div>

      {perdido && (
        <div>
          <label
            htmlFor="editar-motivo-perda"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Motivo da Perda
          </label>
          <textarea
            id="editar-motivo-perda"
            value={motivoPerda}
            onChange={(e) => setMotivoPerda(e.target.value)}
            rows={3}
            className={classeInput}
            placeholder="Por que a oportunidade foi perdida?"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={14} />
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salvar Alterações
        </button>
      </div>
    </div>
  )
}
