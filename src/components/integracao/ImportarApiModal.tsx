"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Globe, Download, X, Check, Database, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

interface MappingConfig {
  fields?: Record<string, string>
  uniqueKey?: string
}

export interface Integracao {
  id: number
  nome: string
  baseUrl: string
  mapping?: MappingConfig
  telas?: string[]
  ativo?: boolean
}

/** O que a tela recebe quando a importação é feita por ela (e não por uma tabela local). */
export interface ContextoImportarApi {
  integracao: Integracao
  itens: Record<string, any>[]
  corpo: unknown
}

interface ImportarApiModalProps {
  tela: string
  existingRecords: Record<string, any>[]
  existingKey?: string
  onImportado?: () => void
  onClose: () => void
  extraImportParams?: Record<string, any>
  buscarExistentes?: () => Promise<Record<string, any>[]>
  /** Integração que a tela está usando: vem pré-selecionada na lista. */
  integracaoInicial?: number | null
  /**
   * Quando informado, o modal não importa numa tabela: ele entrega a integração
   * escolhida e a resposta para a tela tratar (é o caso do BI e do WMS, que não
   * têm tabela própria — a "importação" delas é a carga do ERP).
   */
  aoImportar?: (contexto: ContextoImportarApi) => Promise<void> | void
  rotuloImportar?: string
}

/** A API pode devolver a lista em `items`, `itens` ou `data` — ou ser a própria lista. */
function extrairItens(corpo: unknown): Record<string, any>[] {
  if (Array.isArray(corpo)) return corpo as Record<string, any>[]
  if (!corpo || typeof corpo !== "object") return []
  const registro = corpo as Record<string, any>
  const candidatos = [registro.items, registro.itens, registro.data]
  for (const candidato of candidatos) {
    if (Array.isArray(candidato)) return candidato as Record<string, any>[]
  }
  return []
}

export default function ImportarApiModal({
  tela,
  existingRecords,
  existingKey = "idIntegracao",
  onImportado,
  onClose,
  extraImportParams,
  buscarExistentes,
  integracaoInicial = null,
  aoImportar,
  rotuloImportar,
}: ImportarApiModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [items, setItems] = useState<Record<string, any>[]>([])
  const [corpo, setCorpo] = useState<unknown>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [existingSet, setExistingSet] = useState<Set<string>>(new Set())
  const [existingRecordsCarregados, setExistingRecordsCarregados] = useState<Record<string, any>[]>(
    []
  )
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!buscarExistentes) return
    let ativo = true
    buscarExistentes()
      .then((recs) => {
        if (ativo) setExistingRecordsCarregados(recs || [])
      })
      .catch(() => {
        if (ativo) setExistingRecordsCarregados([])
      })
    return () => {
      ativo = false
    } // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  const {
    data: integracoes,
    isLoading: loadingInt,
    isError: integracoesError,
  } = useQuery<Integracao[]>({
    queryKey: ["integracoes-tela", tela],
    queryFn: async () => {
      const res = await fetch(`/api/integracao/listar?tela=${encodeURIComponent(tela)}`)
      if (!res.ok) throw new Error("Erro ao carregar integrações")
      const corpo = await res.json()
      const todas = (Array.isArray(corpo) ? corpo : (corpo?.integracoes ?? [])) as Integracao[]
      // A rota já filtra pela tela; o filtro aqui só protege quando a integração
      // traz as telas dela (sem o campo, é a lista que a rota devolveu).
      return todas.filter((i) => i.ativo !== false && (!i.telas || i.telas.includes(tela)))
    },
    enabled: true,
  })

  // A integração em uso pela tela vem pronta: é a que o card do BI e o proxy do WMS
  // usam. Sem ela, cai na primeira da lista.
  useEffect(() => {
    if (!integracoes || integracoes.length === 0) return
    if (selectedId !== null && integracoes.some((i) => i.id === selectedId)) return
    if (integracaoInicial && integracoes.some((i) => i.id === integracaoInicial)) {
      setSelectedId(integracaoInicial)
      return
    }
    setSelectedId(integracoes[0].id)
  }, [integracoes, selectedId, integracaoInicial])

  useEffect(() => {
    if (integracoesError) toast.error("Erro ao carregar integrações")
  }, [integracoesError])

  const integracao = (integracoes ?? []).find((i) => i.id === selectedId) || null
  /**
   * Sem chave única configurada, nada é descartado por falta de campo. No modo
   * `aoImportar` isso é o esperado: quem importa decide o que fazer com a resposta.
   */
  const uniqueKey = (integracao?.mapping?.uniqueKey ||
    (aoImportar ? "" : existingKey)) as string
  const fieldMapping = (integracao?.mapping?.fields || {}) as Record<string, string>

  useEffect(() => {
    const existing = new Set<string>()
    for (const r of [...existingRecords, ...existingRecordsCarregados]) {
      const val = r[existingKey]
      if (val != null) existing.add(String(val).trim().toLowerCase())
    }
    setExistingSet(existing)
  }, [existingRecords, existingRecordsCarregados, existingKey])

  function getMappedValue(item: Record<string, any>, mappedField: string) {
    const apiField = Object.entries(fieldMapping).find(([, v]) => v === mappedField)?.[0]
    if (!apiField) return item[mappedField]
    return item[apiField]
  }

  async function handleFetch() {
    if (!selectedId) return
    setLoadingData(true)
    setItems([])
    setCorpo(null)
    setSelectedRows(new Set())
    setSearchQuery("")
    try {
      const res = await fetch(`/api/admin/integracoes/${selectedId}/testar`)
      const data = await res.json()
      if (!data.success) {
        toast.error(
          `API retornou erro: ${data.status}${data.statusText ? ` - ${data.statusText}` : ""}`
        )
        return
      }
      const body = data.responseBody
      const rawItems = extrairItens(body)
      if (rawItems.length === 0) {
        // Resposta sem lista (um consolidado, por exemplo): no modo da tela o corpo
        // inteiro é entregue para ela tratar.
        if (!aoImportar) {
          toast.error("Nenhum item encontrado na resposta")
          return
        }
        setCorpo(body)
        toast.success("Resposta recebida")
        return
      }
      setCorpo(body)
      setItems(rawItems)
      // Default: select all non-duplicate AND with required fields filled
      const autoSelect = new Set<number>()
      rawItems.forEach((_: any, idx: number) => {
        // Sem chave única (telas sem tabela local), tudo é selecionável.
        if (!uniqueKey) {
          autoSelect.add(idx)
          return
        }
        const keyVal = rawItems[idx][uniqueKey]
        const hasRequiredField =
          rawItems[idx][uniqueKey] != null && String(rawItems[idx][uniqueKey]).trim() !== ""
        if (hasRequiredField && !existingSet.has(String(keyVal).trim().toLowerCase())) {
          autoSelect.add(idx)
        }
      })
      setSelectedRows(autoSelect)
      toast.success(`${rawItems.length} itens carregados`)
    } catch {
      toast.error("Erro ao executar requisição")
    } finally {
      setLoadingData(false)
    }
  }

  function toggleRow(idx: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleAll() {
    const allFilteredSelected = filteredItems.every((item: any) =>
      selectedRows.has(items.indexOf(item))
    )
    if (allFilteredSelected) {
      const next = new Set(selectedRows)
      filteredItems.forEach((item: any) => next.delete(items.indexOf(item)))
      setSelectedRows(next)
    } else {
      const next = new Set(selectedRows)
      filteredItems.forEach((item: any) => next.add(items.indexOf(item)))
      setSelectedRows(next)
    }
  }

  function selecionarAleatorios(qtd: number) {
    const elegiveis: number[] = []
    items.forEach((item: any, idx: number) => {
      if (selectedRows.has(idx)) return
      if (isDuplicate(item)) return
      if (hasMissingRequiredField(item)) return
      elegiveis.push(idx)
    })
    for (let i = elegiveis.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = elegiveis[i]
      elegiveis[i] = elegiveis[j]
      elegiveis[j] = tmp
    }
    const escolhidos = elegiveis.slice(0, Math.min(qtd, elegiveis.length))
    if (escolhidos.length === 0) {
      toast.info("Nenhum contato novo disponível para seleção aleatória")
      return
    }
    setSelectedRows((prev) => new Set([...prev, ...escolhidos]))
    toast.success(`${escolhidos.length} contato(s) aleatório(s) selecionado(s)`)
  }

  function isDuplicate(item: Record<string, any>) {
    if (!uniqueKey) return false
    const apiKeyField = Object.entries(fieldMapping).find(([, v]) => v === existingKey)?.[0]
    const val = item[apiKeyField || uniqueKey]
    if (!val) return false
    return existingSet.has(String(val).trim().toLowerCase())
  }

  function hasMissingRequiredField(item: Record<string, any>) {
    if (!uniqueKey) return false
    const apiKeyField = Object.entries(fieldMapping).find(([, v]) => v === uniqueKey)?.[0]
    const val = item[apiKeyField || uniqueKey]
    return val == null || String(val).trim() === ""
  }

  const columns = items.length > 0 ? Object.keys(items[0]) : []
  const filteredItems = items.filter(
    (item: any) =>
      !searchQuery ||
      columns.some((col: any) =>
        String(item[col] ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
  )
  const filteredSelectedRows = new Set(
    [...selectedRows].filter((i: any) => filteredItems.includes(items[i]))
  )

  async function handleImport() {
    if (!selectedId) return
    setImporting(true)
    try {
      const selectedItems = items.filter(
        (_: any, i: any) => selectedRows.has(i) && !hasMissingRequiredField(items[i])
      )

      if (aoImportar) {
        if (!integracao) throw new Error("Integração não encontrada")
        await aoImportar({ integracao, itens: selectedItems, corpo })
        toast.success("Importação concluída")
        onImportado?.()
        onClose()
        return
      }

      if (selectedRows.size === 0) {
        toast.error("Selecione ao menos um item")
        return
      }

      const res = await fetch("/api/integracao/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entidade: tela,
          integracaoId: selectedId,
          fieldMapping,
          uniqueKey,
          items: selectedItems,
          ...extraImportParams,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro na importação")
      }
      const result = await res.json()
      toast.success(
        `${result.importados} importado(s)${result.duplicados ? `, ${result.duplicados} duplicado(s)` : ""}${result.vazios ? `, ${result.vazios} com campo vazio` : ""}`
      )
      onImportado?.()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar")
    } finally {
      setImporting(false)
    }
  }

  const podeImportar = aoImportar
    ? Boolean(integracao) && (items.length > 0 || corpo !== null)
    : selectedRows.size > 0

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-hidden flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl outline-none">
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
            <DialogPrimitive.Title className="text-lg font-semibold flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              Importar via API
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          <div className="p-5 space-y-4 flex-1 overflow-auto">
            {loadingInt ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : (integracoes ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhuma integração configurada para &quot;{tela}&quot;
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Integração:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {(integracoes ?? []).map((int: any) => (
                      <button
                        key={int.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(int.id)
                          setItems([])
                          setCorpo(null)
                          setSelectedRows(new Set())
                        }}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          selectedId === int.id
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        {int.nome}
                        {int.id === integracaoInicial && (
                          <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                            (em uso)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleFetch}
                    disabled={!selectedId || loadingData}
                    className="gap-1"
                  >
                    {loadingData ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Executar
                  </Button>
                </div>

                {integracao && (
                  <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Globe size={13} className="shrink-0" />
                    <span className="truncate">{integracao.baseUrl}</span>
                  </p>
                )}

                {items.length > 0 && (
                  <>
                    {items.filter((i: any) => hasMissingRequiredField(i)).length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg">
                        {items.filter((i: any) => hasMissingRequiredField(i)).length} item(s) com
                        &quot;{uniqueKey}&quot; vazio — não serão selecionados para importação.
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={16}
                        />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Pesquisar na lista..."
                          className="pl-9 max-w-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 mr-1">Selecionar aleatórios:</span>
                        {[50, 100, 500].map((n: number) => (
                          <Button
                            key={n}
                            variant="outline"
                            size="xs"
                            onClick={() => selecionarAleatorios(n)}
                            disabled={items.length === 0}
                          >
                            {n}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                          <tr>
                            <th className="p-2 w-10">
                              <input
                                type="checkbox"
                                checked={
                                  filteredSelectedRows.size === filteredItems.length &&
                                  filteredItems.length > 0
                                }
                                onChange={toggleAll}
                                className="rounded"
                              />
                            </th>
                            {columns.slice(0, 8).map((col: any) => (
                              <th
                                key={col}
                                className="p-2 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredItems.map((item: any) => {
                            const originalIdx = items.indexOf(item)
                            const dup = isDuplicate(item)
                            const missingField = hasMissingRequiredField(item)
                            const disabled = dup || missingField
                            return (
                              <tr
                                key={originalIdx}
                                className={`hover:bg-slate-50 dark:bg-slate-800/30 ${dup ? "opacity-50" : ""} ${missingField && !dup ? "opacity-40" : ""}`}
                              >
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.has(originalIdx)}
                                    onChange={() => toggleRow(originalIdx)}
                                    disabled={disabled}
                                    className="rounded"
                                    title={
                                      missingField
                                        ? `Campo obrigatório "${uniqueKey}" vazio`
                                        : dup
                                          ? "Duplicado"
                                          : ""
                                    }
                                  />
                                </td>
                                {columns.slice(0, 8).map((col: any) => (
                                  <td
                                    key={col}
                                    className="p-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                                  >
                                    {typeof item[col] === "object"
                                      ? JSON.stringify(item[col])
                                      : String(item[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {items.length === 0 && corpo !== null && (
                  <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
                    {JSON.stringify(corpo, null, 2)}
                  </pre>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {searchQuery ? `Exibindo ${filteredItems.length} de ` : ""}
                    {items.length} itens | {selectedRows.size} selecionados | {existingSet.size}{" "}
                    existentes
                    {uniqueKey
                      ? ` | ${items.filter((i: any) => hasMissingRequiredField(i)).length} sem ${uniqueKey}`
                      : ""}
                  </span>
                  {integracao?.mapping?.uniqueKey && (
                    <span className="flex items-center gap-1">
                      <Check size={12} className="text-green-500" />
                      Chave única: {integracao.mapping.uniqueKey}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {(items.length > 0 || (aoImportar && corpo !== null)) && (
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!podeImportar || importing}
                className="gap-2"
              >
                {importing && <Loader2 size={16} className="animate-spin" />}
                {rotuloImportar ?? "Importar"}
                {!aoImportar && selectedRows.size > 0 && ` (${selectedRows.size})`}
              </Button>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
