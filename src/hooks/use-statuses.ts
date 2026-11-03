"use client"

import { useCallback, useEffect, useState } from "react"

export type StatusConfig = {
  id: number
  nome: string
  rotulo: string | null
  tipo: string
  cor: string | null
  ordem: number | null
  ativo: boolean | null
  exibirKanban: boolean | null
}

const cache = new Map<string, StatusConfig[]>()

export function useStatuses(tipo: string) {
  const [statuses, setStatuses] = useState<StatusConfig[]>(cache.get(tipo) || [])
  const [loading, setLoading] = useState(!cache.has(tipo))

  const aplicar = (data: unknown) => {
    if (Array.isArray(data)) {
      cache.set(tipo, data)
      setStatuses(data)
    }
  }

  const revalidar = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/status?tipo=${encodeURIComponent(tipo)}`)
      aplicar(await res.json())
    } catch (erro) {
      console.error(erro)
    }
  }, [tipo])

  useEffect(() => {
    let cancelado = false

    fetch(`/api/admin/status?tipo=${encodeURIComponent(tipo)}`)
      .then((r: any) => r.json())
      .then((data: any) => {
        if (!cancelado) aplicar(data)
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [tipo])

  const getStatus = (nome: string): StatusConfig | undefined =>
    statuses.find((s: any) => s.nome === nome)

  const getLabel = (nome: string): string => getStatus(nome)?.rotulo || nome

  const getColor = (nome: string): string => getStatus(nome)?.cor || "#94a3b8"

  return { statuses, loading, getStatus, getLabel, getColor, revalidar }
}

/** Status utilizáveis nas listas de seleção (desativados ficam ocultos). */
export function statusAtivos(statuses: StatusConfig[]): StatusConfig[] {
  return statuses.filter((s) => s.ativo !== false)
}

/** Colunas do kanban: status ativo e com exibicao habilitada. */
export function statusExibidosNoKanban(statuses: StatusConfig[]): StatusConfig[] {
  return statuses.filter((s) => s.ativo !== false && s.exibirKanban !== false)
}

/** Limpa o cache de status (usar apos criar/editar/excluir no cadastro). */
export function invalidarCacheStatuses(tipo?: string) {
  if (tipo) {
    cache.delete(tipo)
    return
  }
  cache.clear()
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
