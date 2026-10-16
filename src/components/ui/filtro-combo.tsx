"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Remove acento e caixa, para "importacao" achar "IMPORTAÇÃO". */
function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export interface OpcaoFiltro {
  /** Texto mostrado e usado no filtro. */
  rotulo: string
  /** Opcional: código (banco 033, empresa 13) mostrado ao lado. */
  codigo?: string
  /** Quantas linhas do relatório aquele valor representa. */
  ocorrencias: number
  valor: number
}

interface Props {
  id: string
  rotulo: string
  /** Todos os valores do recorte, já com contagem — a lista vem do próprio relatório. */
  opcoes: OpcaoFiltro[]
  valor: string
  onChange: (valor: string) => void
  /** Texto do botão quando não há seleção ("todos"). */
  vazio?: string
  formatarValor?: (valor: number) => string
  className?: string
}

/**
 * Filtro em dropdown que também aceita digitação (combobox).
 *
 * As opções vêm dos dados que a tela já carregou, não de uma tabela nova: quem filtra
 * por fornecedor só pode escolher fornecedor que existe naquele recorte, e o valor
 * digitado continua valendo — digitar "santo" marca o grupo inteiro, como num `<select>`
 * de verdade, e não vira uma busca que some com o resto.
 */
export function FiltroCombo({
  id,
  rotulo,
  opcoes,
  valor,
  onChange,
  vazio = "Todos",
  formatarValor,
  className,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const [digitado, setDigitado] = useState("")
  const [foco, setFoco] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listaId = useId()

  const selecionadas = useMemo(
    () => opcoes.filter((opcao) => opcao.rotulo === valor),
    [opcoes, valor]
  )

  const filtradas = useMemo(() => {
    const termo = semAcento(digitado.trim())
    if (!termo) return opcoes
    return opcoes.filter(
      (opcao) =>
        semAcento(opcao.rotulo).includes(termo) ||
        (opcao.codigo ? semAcento(opcao.codigo).includes(termo) : false)
    )
  }, [opcoes, digitado])

  // A lista de opções muda quando o recorte muda (outro mês, outro filtro): a
  // seleção que não existe mais não pode continuar marcada.
  useEffect(() => {
    if (valor && !opcoes.some((opcao) => opcao.rotulo === valor)) onChange("")
  }, [opcoes, valor, onChange])

  useEffect(() => {
    if (!aberto) return
    function fora(evento: MouseEvent) {
      if (!containerRef.current?.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", fora)
    return () => document.removeEventListener("mousedown", fora)
  }, [aberto])

  function escolher(rotulo: string) {
    onChange(rotulo === valor ? "" : rotulo)
    setAberto(false)
    setDigitado("")
    setFoco(-1)
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault()
      if (!aberto) {
        setAberto(true)
        return
      }
      const passo = evento.key === "ArrowDown" ? 1 : -1
      setFoco((atual) => {
        const proximo = atual + passo
        return Math.max(0, Math.min(filtradas.length - 1, proximo))
      })
    }
    if (evento.key === "Enter" && aberto && foco >= 0 && filtradas[foco]) {
      evento.preventDefault()
      escolher(filtradas[foco].rotulo)
    }
    if (evento.key === "Escape" && aberto) {
      setAberto(false)
      setDigitado("")
    }
  }

  const resumo = valor || vazio

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={containerRef}>
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 pr-16 text-sm"
          placeholder={vazio}
          value={aberto ? digitado : resumo}
          onChange={(e) => {
            setDigitado(e.target.value)
            setAberto(true)
            setFoco(-1)
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
        />
        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5">
          {valor && (
            <button
              type="button"
              aria-label={`Limpar filtro ${rotulo}`}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              onClick={() => {
                onChange("")
                setDigitado("")
              }}
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label={`Abrir opções de ${rotulo}`}
            aria-expanded={aberto}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={() => {
              setAberto((atual) => !atual)
              setDigitado("")
            }}
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        {aberto && (
          <ul
            id={listaId}
            role="listbox"
            aria-label={rotulo}
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {filtradas.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-500">Nenhuma opção no recorte</li>
            )}
            {filtradas.map((opcao, indice) => {
              const marcada = selecionadas.some((s) => s.rotulo === opcao.rotulo)
              return (
                <li key={opcao.rotulo}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={marcada}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                      indice === foco && "bg-slate-100 dark:bg-slate-800"
                    )}
                    onClick={() => escolher(opcao.rotulo)}
                  >
                    {marcada && <Check className="size-3.5 shrink-0 text-teal-600" />}
                    <span className="min-w-0 flex-1 truncate">
                      {opcao.rotulo}
                      {opcao.codigo && (
                        <span className="ml-1 text-[10px] text-slate-400">{opcao.codigo}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatarValor ? formatarValor(opcao.valor) : opcao.ocorrencias}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
