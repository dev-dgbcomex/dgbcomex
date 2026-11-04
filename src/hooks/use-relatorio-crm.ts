"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

export type FiltrosRelatorioCrm = {
  periodo: string
  de: string
  ate: string
  usuario: string
  status: string
  tipo: string
  segmento: string
  /** "com" = somente com tarja de cliente · "sem" = somente sem tarja. */
  tarja: string
}

const FILTROS_INICIAIS: FiltrosRelatorioCrm = {
  periodo: "semana",
  de: "",
  ate: "",
  usuario: "",
  status: "",
  tipo: "",
  segmento: "",
  tarja: "",
}

/**
 * Estado dos filtros + consulta dos relatórios do CRM.
 * Todos os relatórios compartilham período, usuário, status, tipo e segmento.
 */
export function useRelatorioCrm(endpoint: string) {
  const [filtros, setFiltros] = useState<FiltrosRelatorioCrm>(FILTROS_INICIAIS)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("periodo", filtros.periodo)
    if (filtros.de) params.set("de", filtros.de)
    if (filtros.ate) params.set("ate", filtros.ate)
    if (filtros.usuario) params.set("usuario", filtros.usuario)
    if (filtros.status) params.set("status", filtros.status)
    if (filtros.tipo) params.set("tipo", filtros.tipo)
    if (filtros.segmento) params.set("segmento", filtros.segmento)
    if (filtros.tarja) params.set("tarja", filtros.tarja)
    return params.toString()
  }, [filtros])

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ["crm-relatorio", endpoint, queryString],
    queryFn: async () => {
      const res = await fetch(`${endpoint}?${queryString}`)
      if (!res.ok) throw new Error("Falha ao carregar relatório")
      return res.json()
    },
  })

  function atualizar(mudancas: Partial<FiltrosRelatorioCrm>) {
    setFiltros((prev) => ({ ...prev, ...mudancas }))
  }

  function limpar() {
    setFiltros(FILTROS_INICIAIS)
  }

  return {
    data,
    isLoading,
    isError,
    filtros,
    atualizar,
    limpar,
    queryString,
  }
}
