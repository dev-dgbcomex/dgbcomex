"use client"

import { useQuery } from "@tanstack/react-query"

export interface RespostaCamposVisiveis {
  cadastro: string
  campos: Record<string, boolean>
  falhou: boolean
}

export function useCamposVisiveis(cadastro: string) {
  const consulta = useQuery<RespostaCamposVisiveis>({
    queryKey: ["campos-visiveis", cadastro],
    queryFn: async () => {
      const res = await fetch(
        `/api/campos-visiveis?cadastro=${encodeURIComponent(cadastro)}`
      )
      if (!res.ok) throw new Error("Erro ao carregar visibilidade dos campos")
      return res.json()
    },
  })

  return {
    campos: consulta.data?.campos ?? {},
    isLoading: consulta.isLoading,
    isError: consulta.isError,
  }
}
