"use client"

import Link from "next/link"
import { Loader2, Mail, MapPin, Phone, Search, UserPlus, Users, X } from "lucide-react"

type RepresentanteVinculoItem = {
  id: number
  representanteId: number
  nome: string
  cnpj?: string | null
  email?: string | null
  telefone?: string | null
  cidade?: string | null
  uf?: string | null
}

type ResultadoRepresentante = {
  id: number
  nome: string
  cnpj?: string | null
  cidade?: string | null
  uf?: string | null
}

interface RepresentantesVinculadosCardProps {
  vinculos: RepresentanteVinculoItem[]
  resultados: ResultadoRepresentante[]
  carregando?: boolean
  buscando?: boolean
  busca: string
  onBuscar: (consulta: string) => void
  onVincular: (representanteId: number) => void
  onRemover: (vinculo: RepresentanteVinculoItem) => void
}

export function RepresentantesVinculadosCard({
  vinculos,
  resultados,
  carregando,
  buscando,
  busca,
  onBuscar,
  onVincular,
  onRemover,
}: RepresentantesVinculadosCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-blue-500" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Representantes Vinculados
        </h2>
        {vinculos.length > 0 && <span className="text-xs text-slate-400">({vinculos.length})</span>}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            aria-label="Buscar representante"
            placeholder="Buscar representante por nome ou CNPJ..."
            value={busca}
            onChange={(event) => onBuscar(event.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {buscando && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando...
        </div>
      )}

      {resultados.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto mb-4">
          {resultados.map((representante) => (
            <button
              key={representante.id}
              type="button"
              onClick={() => onVincular(representante.id)}
              className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left"
            >
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {representante.nome}
                </span>
                <span className="text-slate-400 ml-2">{representante.cnpj}</span>
                {representante.cidade && (
                  <span className="text-slate-400 ml-2">
                    {representante.cidade}/{representante.uf}
                  </span>
                )}
              </div>
              <UserPlus size={14} className="text-blue-500 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {carregando ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : vinculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">Nenhum representante vinculado</p>
          <p className="text-xs text-slate-400 mt-1">Busque acima para vincular representantes</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 p-3">
                  Nome
                </th>
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 p-3">
                  CNPJ
                </th>
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 p-3">
                  Contato
                </th>
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 p-3">
                  Cidade/UF
                </th>
                <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 p-3">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {vinculos.map((vinculo) => (
                <tr key={vinculo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 text-sm font-medium text-slate-900 dark:text-slate-200">
                    <Link
                      href={`/comercial/representantes/${vinculo.representanteId ?? vinculo.id}`}
                      className="hover:underline"
                    >
                      {vinculo.nome}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-slate-500 font-mono">{vinculo.cnpj || "—"}</td>
                  <td className="p-3 text-sm text-slate-500">
                    <div className="flex flex-col gap-0.5">
                      {vinculo.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {vinculo.email}
                        </span>
                      )}
                      {vinculo.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {vinculo.telefone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-slate-500">
                    {vinculo.cidade ? (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {vinculo.cidade}/{vinculo.uf}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemover(vinculo)}
                      title="Remover representante"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
