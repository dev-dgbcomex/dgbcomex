"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Tela } from "./types"

interface Props {
  telas: Tela[]
  valor: string
  onChange: (valor: string) => void
  /** O select da página inicial guarda o href; o de item de menu guarda o id da tela. */
  chave?: "id" | "href"
  placeholder?: string
  className?: string
}

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/**
 * Seleção de tela com busca: o sistema tem mais de 150 telas e, sem filtro,
 * a que a pessoa procura some no meio da lista.
 */
export function SeletorTela({
  telas,
  valor,
  onChange,
  chave = "id",
  placeholder = "Selecionar tela...",
  className,
}: Props) {
  const [busca, setBusca] = useState("")

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim())
    if (!termo) return telas
    return telas.filter((t) =>
      semAcento(`${t.label} ${t.href} ${t.module || ""}`).includes(termo)
    )
  }, [telas, busca])

  const valorHj = useMemo(
    () => telas.find((t) => (chave === "href" ? t.href === valor : t.id === valor)),
    [telas, valor, chave]
  )

  return (
    <div className={`flex w-full items-center gap-2 ${className || ""}`}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tela..."
          aria-label="Buscar tela"
          className="h-8 pl-8 text-sm"
        />
      </div>
      <Select
        value={valor ? (valorHj?.id ?? valor) : ""}
        onValueChange={(v: string | null) => {
          if (!v) return
          const tela = telas.find((t) => t.id === v)
          onChange(chave === "href" ? tela?.href ?? v : v)
        }}
      >
        <SelectTrigger className="h-8 min-w-40 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {filtradas.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-slate-500">Nenhuma tela encontrada</div>
          )}
          {filtradas.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
