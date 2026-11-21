"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Mail, Plus, Unlink, UserPlus, Users } from "lucide-react"

type ContatoItem = {
  id: number
  nome: string
  cargo?: string | null
  email?: string | null
  telefone?: string | null
  celular?: string | null
  principal?: boolean | null
}

interface ContatosVinculadosCardProps {
  contatos: ContatoItem[]
  orfaos: ContatoItem[]
  carregando?: boolean
  onAdd: () => void
  onVincular: (contatoId: number) => void
  onRemover: (contatoId: number) => void
}

export function ContatosVinculadosCard({
  contatos,
  orfaos,
  carregando,
  onAdd,
  onVincular,
  onRemover,
}: ContatosVinculadosCardProps) {
  const [selecionado, setSelecionado] = useState("")

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-50">
          <Users size={16} className="text-blue-500" />
          Contatos
          {contatos.length > 0 && <span className="text-xs text-slate-400">({contatos.length})</span>}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
        >
          <Plus size={14} /> Adicionar contato
        </button>
      </div>

      <div className="mb-4 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
        <p className="text-xs font-medium text-slate-500">Vincular contato órfão</p>
        <div className="flex gap-2">
          <select
            aria-label="Contatos sem vínculo"
            value={selecionado}
            onChange={(event) => setSelecionado(event.target.value)}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
          >
            <option value="">Vincular contato existente...</option>
            {orfaos.map((contato) => (
              <option key={contato.id} value={String(contato.id)}>
                {contato.nome}
                {contato.email ? ` — ${contato.email}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (selecionado) {
                onVincular(Number(selecionado))
                setSelecionado("")
              }
            }}
            disabled={!selecionado}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <UserPlus size={12} /> Vincular
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : contatos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nenhum contato vinculado</p>
      ) : (
        <div className="space-y-2">
          {contatos.map((contato) => (
            <div
              key={contato.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/comercial/crm/contatos/${contato.id}`}
                    className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
                  >
                    {contato.nome}
                  </Link>
                  {contato.principal && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      Principal
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  {contato.cargo && <span>{contato.cargo}</span>}
                  {contato.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={10} />
                      {contato.email}
                    </span>
                  )}
                  {contato.telefone && <span>{contato.telefone}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemover(contato.id)}
                title="Desvincular contato"
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <Unlink size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
