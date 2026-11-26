"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { SelectComBusca, type OpcaoSelectBusca } from "@/components/ui/select-com-busca"

type Cliente = { id: number; nome: string; cnpj?: string; razaoSocial?: string }

type Props = {
  value: string
  onChange: (clienteId: string) => void
  className?: string
}

export function SelectCliente({ value, onChange, className }: Props) {
  const [busca, setBusca] = useState("")
  const termo = busca.trim()

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", termo.length >= 2 ? termo : ""],
    queryFn: async () => {
      const sufixo = termo.length >= 2 ? `?q=${encodeURIComponent(termo)}` : ""
      const res = await fetch(`/api/clientes${sufixo}`)
      if (!res.ok) return []
      return res.json()
    },
  })

  const opcoes: OpcaoSelectBusca[] = (clientes ?? []).map((cliente) => ({
    value: String(cliente.id),
    label: cliente.nome,
    descricao: cliente.cnpj || cliente.razaoSocial,
  }))

  return (
    <SelectComBusca
      valor={value}
      onChange={onChange}
      opcoes={opcoes}
      onBuscaChange={setBusca}
      placeholderBusca="Digite o nome ou CNPJ do cliente..."
      className={className}
    />
  )
}
