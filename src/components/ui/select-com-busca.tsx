"use client"

import { useId, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OpcaoSelectBusca {
  value: string
  label: string
  descricao?: string
}

interface SelectComBuscaProps {
  id?: string
  valor: string
  onChange: (valor: string) => void
  opcoes: OpcaoSelectBusca[]
  vazio?: string
  placeholderBusca?: string
  ariaLabel?: string
  className?: string
  required?: boolean
  onBuscaChange?: (termo: string) => void
}

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
}

export function SelectComBusca({
  id,
  valor,
  onChange,
  opcoes,
  vazio = "Selecione...",
  placeholderBusca = "Digite para buscar...",
  ariaLabel,
  className,
  required,
  onBuscaChange,
}: SelectComBuscaProps) {
  const gerado = useId()
  const selectId = id ?? gerado
  const [busca, setBusca] = useState("")

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim())
    if (!termo) return opcoes
    return opcoes.filter(
      (opcao) =>
        semAcento(opcao.label).includes(termo) ||
        (opcao.descricao ? semAcento(opcao.descricao).includes(termo) : false)
    )
  }, [opcoes, busca])

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
        <input
          id={`${selectId}-busca`}
          type="search"
          autoComplete="off"
          value={busca}
          onChange={(evento) => {
            setBusca(evento.target.value)
            onBuscaChange?.(evento.target.value)
          }}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.preventDefault()
          }}
          placeholder={placeholderBusca}
          aria-label={ariaLabel ? `Buscar ${ariaLabel}` : "Buscar opções"}
          className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <select
        id={selectId}
        aria-label={ariaLabel}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{vazio}</option>
        {filtradas.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.descricao ? `${opcao.label} — ${opcao.descricao}` : opcao.label}
          </option>
        ))}
      </select>
      {busca.trim() !== "" && filtradas.length === 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Nenhum resultado para “{busca}”.
        </p>
      )}
    </div>
  )
}
