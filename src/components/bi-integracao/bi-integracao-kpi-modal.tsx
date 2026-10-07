"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Info, X } from "lucide-react"
import { formatarKpi, IntegracaoKpiMeta } from "@/lib/bi-kpi-metadados"
import type { BiIntegracaoResumo } from "./bi-integracao-dashboard"

function LinhaValor({
  rotulo,
  descricao,
  valor,
  chave,
  formato,
}: {
  rotulo: string
  descricao?: string
  valor: unknown
  chave: string
  formato?: "brl" | "pct" | "qtde" | "texto"
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{rotulo}</p>
        <p className="text-xs leading-snug text-slate-400 dark:text-slate-500">{descricao}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {formatarKpi(chave, valor, formato)}
      </p>
    </div>
  )
}

export function BiIntegracaoKpiModal({
  integracao,
  meta,
  body,
  aberto,
  aoFechar,
}: {
  integracao: BiIntegracaoResumo
  meta?: IntegracaoKpiMeta
  body?: Record<string, unknown> | null
  aberto: boolean
  aoFechar: () => void
}) {
  const titulo = meta?.titulo ?? integracao.nome
  const caminho = integracao.baseUrl.replace(/^https?:\/\/[^/]+/, "")
  const campos = meta?.campos
  const subcampos = meta?.subcampos

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={(next) => (!next ? aoFechar() : undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={aoFechar}
        />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                <DialogPrimitive.Title className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {titulo}
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close
                aria-label="Fechar informações"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>

            <div className="p-5 space-y-5">
              <DialogPrimitive.Description className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {meta?.descricao ?? `Dados retornados pela rota ${caminho} da api-microdata.`}
              </DialogPrimitive.Description>

              {meta?.janelas && body && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Valores por período
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(meta.janelas).map(([nomeJanela, janela]) => {
                      if (!body[nomeJanela] || typeof body[nomeJanela] !== "object") return null
                      const valores = body[nomeJanela] as Record<string, unknown>
                      return (
                        <div key={nomeJanela} className="py-2">
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {janela.rotulo}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {janela.descricao}
                          </p>
                          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                            {Object.entries(janela.campos).map(([chave, campo]) => (
                              <LinhaValor
                                key={chave}
                                rotulo={campo.rotulo ?? chave}
                                descricao={campo.descricao}
                                valor={valores[chave]}
                                chave={chave}
                                formato={campo.formato}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {campos && body && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Valores
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(Object.keys(campos) as string[])
                      .concat(Object.keys(subcampos ?? {}))
                      .filter((chave, i, todas) => todas.indexOf(chave) === i)
                      .map((chave) => {
                        const campo = campos[chave]
                        if (subcampos?.[chave]) {
                          const subs = subcampos[chave]
                          const objeto =
                            body[chave] && typeof body[chave] === "object"
                              ? (body[chave] as Record<string, unknown>)
                              : null
                          if (!objeto) return null
                          return (
                            <div key={chave} className="py-2">
                              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {campo?.rotulo ?? chave}
                              </p>
                              {campo?.descricao && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                  {campo.descricao}
                                </p>
                              )}
                              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                {Object.entries(subs).map(([subChave, subCampo]) => (
                                  <LinhaValor
                                    key={subChave}
                                    rotulo={subCampo.rotulo ?? subChave}
                                    descricao={subCampo.descricao}
                                    valor={objeto[subChave]}
                                    chave={subChave}
                                    formato={subCampo.formato}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        }
                        if (!campo) return null
                        return (
                          <LinhaValor
                            key={chave}
                            rotulo={campo.rotulo ?? chave}
                            descricao={campo.descricao}
                            valor={body[chave]}
                            chave={chave}
                            formato={campo.formato}
                          />
                        )
                      })}
                  </div>
                </div>
              )}

              {!meta && body != null && (
                <pre className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(body, null, 2)}
                </pre>
              )}

              {meta?.regras && meta.regras.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Regras de Negócio
                  </h3>
                  <ul className="space-y-2">
                    {meta.regras.map((regra, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {regra}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meta?.exemplos && meta.exemplos.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Exemplos Práticos
                  </h3>
                  <div className="space-y-3">
                    {meta.exemplos.map((ex, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 p-3"
                      >
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
                          {ex.titulo}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                          {ex.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
