"use client"

import { useState } from "react"
import type { CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InfoButton } from "@/components/ui/info-button"
import { semaforoConversaoInfo } from "@/lib/info-content/crm"
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"
import {
  FAIXAS_CONVERSAO,
  itensDaFaixa,
  type FaixaConversao,
  type ItemComFaixa,
} from "@/lib/crm/faixa-conversao"

export type SemaforoConversaoItem = ItemComFaixa & {
  id: number | string
  nome: string
  subtitulo?: string | null
  documento?: string | null
  status?: string | null
  href: string
}

type SemaforoConversaoProps = {
  contagem: Record<FaixaConversao, number>
  entidade: "leads" | "clientes"
  itens: SemaforoConversaoItem[]
  listagem: string
}

export function SemaforoConversao({
  contagem,
  entidade,
  itens,
  listagem,
}: SemaforoConversaoProps) {
  const [faixaAberta, setFaixaAberta] = useState<FaixaConversao | null>(null)
  const rotuloEntidade = entidade === "leads" ? "Leads" : "Clientes"
  const entidadeNoSingular = entidade === "leads" ? "lead" : "cliente"
  const faixaSelecionada = FAIXAS_CONVERSAO.find(({ faixa }) => faixa === faixaAberta)
  const itensSelecionados = faixaAberta ? itensDaFaixa(itens, faixaAberta) : []

  function fechar() {
    setFaixaAberta(null)
  }

  return (
    <>
      <section aria-label="Semáforo de conversão" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FAIXAS_CONVERSAO.map(({ faixa, rotulo, descricao }) => {
          const estilo = corPorTitulo(rotulo)
          const Icone = iconePorTitulo(rotulo)
          const total = contagem[faixa]

          return (
            <div
              key={faixa}
              role="button"
              tabIndex={0}
              aria-label={`${rotulo}: ${total} ${entidade} — ${descricao}`}
              title={`Ver lista de ${entidade} ${rotulo.toLowerCase()}`}
              onClick={() => setFaixaAberta(faixa)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setFaixaAberta(faixa)
                }
              }}
              style={
                {
                  "--card-fundo": estilo.fundoClaro,
                  "--card-fundo-escuro": estilo.fundoEscuro,
                  "--card-borda": estilo.borda,
                  "--card-realce": estilo.cor,
                } as CSSProperties
              }
              className="flex h-full min-h-[9rem] cursor-pointer flex-col rounded-xl border border-[color:var(--card-borda)] bg-white p-4 outline-none transition-shadow dark:bg-slate-900 bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)] card-hover focus-visible:ring-2 focus-visible:ring-[color:var(--card-realce)]"
            >
              <div className="flex min-h-[4.75rem] items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3
                    className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                    title={rotulo}
                  >
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
                      aria-hidden="true"
                    >
                      <Icone size={13} />
                    </span>
                    <span className="truncate">{rotulo}</span>
                  </h3>
                  <p
                    className="mt-1 line-clamp-2 min-h-[2.25rem] text-[10px] leading-snug text-slate-400 dark:text-slate-500"
                    title={descricao}
                  >
                    {descricao}
                  </p>
                </div>
                <span
                  className="shrink-0"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <InfoButton
                    content={semaforoConversaoInfo[faixa]}
                    label={`Informações da faixa ${rotulo}`}
                  />
                </span>
              </div>

              <div className="mt-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-baseline justify-between gap-3 py-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {rotuloEntidade}
                  </span>
                  <span className="text-right text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {total}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <Dialog
        open={faixaAberta !== null}
        onOpenChange={(aberto) => {
          if (!aberto) fechar()
        }}
      >
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {faixaSelecionada ? `${faixaSelecionada.rotulo} — ${rotuloEntidade}` : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {faixaSelecionada?.descricao} · {itensSelecionados.length}{" "}
              {itensSelecionados.length === 1 ? entidadeNoSingular : entidade}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4">
            {itensSelecionados.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum {entidadeNoSingular} nesta faixa com os filtros atuais.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th scope="col" className="px-2 py-2 font-medium">
                      Nome
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Documento
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Status cadastral
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itensSelecionados.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-100">
                        <Link
                          href={item.href}
                          onClick={fechar}
                          className="inline-flex items-center gap-1.5 hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                        >
                          {item.nome}
                          <ExternalLink size={12} aria-hidden="true" />
                        </Link>
                        {item.subtitulo && (
                          <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                            {item.subtitulo}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 font-mono text-slate-500 dark:text-slate-400">
                        {item.documento || "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-500 dark:text-slate-400">
                        {item.status || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              A lista acompanha os filtros ativos da tela.
            </span>
            <Link
              href={listagem}
              onClick={fechar}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
